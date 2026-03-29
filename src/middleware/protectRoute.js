import { requireAuth, clerkClient } from "@clerk/express";
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

export const protectRoute = [
     requireAuth(),
     async (req, res, next) => {
          try {
               const clerkId = req.auth().userId;

               if (!clerkId) return res.status(401).json({ message: "Unauthorized - invalid token" });

               // Check in-memory cache first
               let user = getCachedUser(clerkId);

               if (!user) {
                    // find user in db by clerk ID (use lean() for read perf)
                    user = await User.findOne({ clerkId }).lean();

                    if (!user) {
                         // AUTO-HEAL: Fetch real user data from Clerk
                         try {
                              const clerkUser = await clerkClient.users.getUser(clerkId);
                              user = await User.create({
                                   clerkId,
                                   name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "New User",
                                   email: clerkUser.emailAddresses[0]?.emailAddress || `user_${clerkId}@temporary.com`,
                                   profileImage: clerkUser.imageUrl || "",
                              });
                              user = user.toObject(); // convert to plain object
                              console.log("🛠️ Auto-healed user with real Clerk data:", user.name);
                         } catch (clerkError) {
                              console.error("Failed to fetch user from Clerk, using placeholder:", clerkError);
                              user = await User.create({
                                   clerkId,
                                   name: "New User",
                                   email: `user_${clerkId}@temporary.com`,
                                   profileImage: "",
                              });
                              user = user.toObject();
                         }
                    }

                    // Cache the user for subsequent requests
                    setCachedUser(clerkId, user);
               }

               // attach user to req
               req.user = user;

               next();
          } catch (error) {
               console.error("Error in protectRoute middleware", error);
               res.status(500).json({ message: "Internal Server Error" });
          }
     },
];