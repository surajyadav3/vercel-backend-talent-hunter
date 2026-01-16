import express from "express";
import { getCurrentUser, getLeaderboard, upgradeUser } from "../controllers/userController.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.get("/leaderboard", getLeaderboard);
router.get("/me", protectRoute, getCurrentUser);
router.post("/upgrade", protectRoute, upgradeUser);

export default router;
