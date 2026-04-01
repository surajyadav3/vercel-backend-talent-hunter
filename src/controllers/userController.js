import User from "../models/User.js";
import { invalidateUserCache } from "../middleware/protectRoute.js";

export const getLeaderboard = async (req, res) => {
    try {
        const users = await User.find({})
            .sort({ problemsSolved: -1 })
            .limit(20)
            .select("name email profileImage problemsSolved")
            .lean();

        res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
        res.status(200).json({ users });
    } catch (error) {
        console.error("Error in getLeaderboard:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).lean();
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        console.error("Error in getCurrentUser:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const upgradeUser = async (req, res) => {
    try {
        const { transactionId } = req.body;
        if (!transactionId || transactionId.length < 10) {
            return res.status(400).json({ message: "Invalid Transaction ID" });
        }
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { isPremium: true, subscriptionTier: "pro" },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ message: "Successfully upgraded to PRO!", user });
    } catch (error) {
        console.error("Error in upgradeUser:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getAllStudents = async (req, res) => {
    try {
        if (req.user.role !== "admin" && req.user.role !== "recruiter") {
            return res.status(403).json({ message: "Forbidden: Admins or Recruiters only" });
        }
        const students = await User.find({ role: "candidate" })
            .select("name email profileImage")
            .lean();
        res.status(200).json({ students });
    } catch (error) {
        console.error("Error in getAllStudents:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const setRole = async (req, res) => {
    try {
        const { role, name, mobileNo } = req.body;
        const validRoles = ["recruiter", "candidate"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role selection" });
        }
        
        const updateData = { role, roleSelected: true };
        if (name) updateData.name = name;
        if (mobileNo) updateData.mobileNo = mobileNo;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        ).lean();
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.clerkId) invalidateUserCache(user.clerkId);
        res.status(200).json({ message: `Role set to ${role} successfully`, user });
    } catch (error) {
        console.error("Error in setRole:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
