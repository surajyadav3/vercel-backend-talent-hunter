import { clerkClient, getAuth } from "@clerk/express";
import User from "../models/User.js";

// Simple in-memory cache for user lookups to avoid hitting DB on every request
const userCache = new Map();
const CACHE_TTL = 60_000; // 1 minute

const getCachedUser = (clerkId) => {
     const cached = userCache.get(clerkId);
     if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          return cached.user;
     }
     userCache.delete(clerkId);
     return null;
};

const setCachedUser = (clerkId, user) => {
     // Keep cache bounded to prevent memory leaks
     if (userCache.size > 1000) {
          const firstKey = userCache.keys().next().value;
          userCache.delete(firstKey);
     }
     userCache.set(clerkId, { user, timestamp: Date.now() });
};

export const invalidateUserCache = (clerkId) => {
     userCache.delete(clerkId);
};

import jwt from "jsonwebtoken";
import { ENV } from "../lib/env.js";

export const protectRoute = async (req, res, next) => {
     try {
          // 1. Try Clerk Authentication first
          const auth = getAuth(req) || req.auth;
          const clerkId = auth?.userId;

          // 2. If no Clerk ID, try custom JWT (fallback for Universal Admin)
          if (!clerkId) {
               const authHeader = req.headers.authorization;
               if (authHeader && authHeader.startsWith("Bearer ")) {
                    const token = authHeader.split(" ")[1];
                    try {
                         const decoded = jwt.verify(token, ENV.JWT_SECRET || "very_secret_key_123");
                         const user = await User.findById(decoded.userId).lean();
                         if (user) {
                              req.user = user;
                              return next();
                         }
                    } catch (e) {
                         // invalid token, fall through to 401
                    }
               }
               return res.status(401).json({ message: "Unauthorized - missing or invalid token" });
          }

          // 3. Process Clerk User
          let user = getCachedUser(clerkId);

          if (!user) {
               user = await User.findOne({ clerkId }).lean();

               if (!user) {
                    // AUTO-HEAL: Fetch user data from Clerk and create in DB
                    try {
                         const clerkUser = await clerkClient.users.getUser(clerkId);
                         const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
                         const isAdminEmail = userEmail === (process.env.ADMIN_EMAIL || "admin@talenthunter.com");

                         user = await User.create({
                              clerkId,
                              name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || userEmail?.split("@")[0] || "New User",
                              email: userEmail || `user_${clerkId}@temporary.com`,
                              profileImage: clerkUser.imageUrl || "",
                              role: isAdminEmail ? "admin" : "user",
                         });
                         user = user.toObject();
                         console.log(`🛠️ User created via Clerk Sync:`, user.name);
                    } catch (clerkError) {
                         console.error("Clerk Sync Error:", clerkError);
                         user = await User.create({
                              clerkId,
                              name: "New User",
                              email: `user_${clerkId}@temporary.com`,
                              role: "user"
                         });
                         user = user.toObject();
                    }
               } else if (user.role !== "admin" && user.email === (process.env.ADMIN_EMAIL || "admin@talenthunter.com")) {
                    // Auto-promote to admin if email matches
                    const updated = await User.findByIdAndUpdate(user._id, { role: "admin" }, { new: true }).lean();
                    if (updated) user = updated;
               }

               setCachedUser(clerkId, user);
          }

          req.user = user;
          next();
     } catch (error) {
          console.error("ProtectRoute Error:", error);
          res.status(500).json({ message: "Internal Server Error" });
     }
};