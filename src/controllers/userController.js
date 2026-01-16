import User from "../models/User.js";

export const getLeaderboard = async (req, res) => {
    try {
        const users = await User.find({})
            .sort({ problemsSolved: -1 })
            .limit(20) // Top 20 users
            .select("name email profileImage problemsSolved");

        res.status(200).json({ users });
    } catch (error) {
        console.error("Error in getLeaderboard:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findOne({ clerkId: req.auth.userId });
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
