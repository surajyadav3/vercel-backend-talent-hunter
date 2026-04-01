import express from "express";
import { runCode, submitCode } from "../controllers/submissionController.js";

const router = express.Router();

// Optionally add protectRoute middleware to ensure authenticated users
router.post("/run", runCode);
router.post("/submit", submitCode);

export default router;
