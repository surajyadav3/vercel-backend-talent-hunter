import express from "express";
import { getCurrentUser, getLeaderboard, upgradeUser, getAllStudents, setRole } from "../controllers/userController.js";
import { protectRoute } from "../middleware/protectRoute.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/leaderboard", getLeaderboard);
router.get("/me", protectRoute, getCurrentUser);
router.post("/upgrade", protectRoute, upgradeUser);
router.get("/make-recruiter/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOneAndUpdate({ email }, { role: "recruiter", roleSelected: true }, { new: true });
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get("/students", protectRoute, getAllStudents);
router.post("/set-role", protectRoute, setRole);

export default router;
