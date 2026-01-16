import { requireAuth, clerkClient } from "@clerk/express";
import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";

export const protectRoute = [
     requireAuth(),
     async (req, res, next) => {
          try {
               const clerkId = req.auth().userId;

               if (!clerkId) return res.status(401).json({ message: "Unauthorized - invalid token" });

               // find user in db by clerk ID
               let user = await User.findOne({ clerkId });

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
                         console.log("🛠️ Auto-healed user with real Clerk data:", user.name);
                    } catch (clerkError) {
                         console.error("Failed to fetch user from Clerk, using placeholder:", clerkError);
                         // Fallback placeholder
                         user = await User.create({
                              clerkId,
                              name: "New User",
                              email: `user_${clerkId}@temporary.com`,
                              profileImage: "",
                         });
                    }
               }

               // attach user to req
               req.user = user;

               // Ensure user exists in Stream (fallback if Inngest hasn't run yet)
               await upsertStreamUser({
                    id: user.clerkId,
                    name: user.name,
                    image: user.profileImage,
               });

               next();
          } catch (error) {
               console.error("Error in protectRoute middleware", error);
               res.status(500).json({ message: "Internal Server Error" });
          }
     },
];