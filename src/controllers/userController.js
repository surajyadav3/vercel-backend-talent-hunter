import User from "../models/User.js";

export const getLeaderboard = async (req, res) => {
    try {
        const users = await User.find({})
            .sort({ problemsSolved: -1 })
            .limit(20) // Top 20 users
            .select("name email profileImage problemsSolved")
            .lean(); // lean() for read-only data — 5x faster

        // Leaderboard changes infrequently, cache for 30 seconds
        res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
        res.status(200).json({ users });
    } catch (error) {
        console.error("Error in getLeaderboard:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findOne({ clerkId: req.auth.userId }).lean();
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

        // In a real app, you would verify this transactionId with a payment gateway or UTR checker
        if (!transactionId || transactionId.length < 10) {
            return res.status(400).json({ message: "Invalid Transaction ID" });
        }

        const user = await User.findOneAndUpdate(
            { clerkId: req.auth.userId },
            {
                isPremium: true,
                subscriptionTier: "pro"
            },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({
            message: "Successfully upgraded to PRO!",
            user
        });
    } catch (error) {
        console.error("Error in upgradeUser:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

