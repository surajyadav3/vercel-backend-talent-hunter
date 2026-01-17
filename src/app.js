import express from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { ENV } from "./lib/env.js";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js";
import { clerkMiddleware } from '@clerk/express'
import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoute.js";
import userRoutes from "./routes/userRoutes.js"; // Moved import here

import { protectRoute } from "./middleware/protectRoute.js";

const app = express();

const rootDir = process.cwd();
const __dirname = path.resolve();

//middlewares
app.use(express.json());
if (ENV.NODE_ENV === "production") {
    app.use((req, res, next) => {
        console.log(`📡 [${req.method}] ${req.url}`);
        next();
    });
}

app.use(cors({
    origin: ENV.CLIENT_URL || true,
    credentials: true
}));
app.use(clerkMiddleware());//this adds auth field to request object;

// Health check
app.get("/health", (req, res) => {
    console.log("🔍 Health check requested");
    res.status(200).json({
        status: "UP",
        db: mongoose.connection.readyState,
        static_path: ENV.NODE_ENV === "production" ? path.resolve(process.cwd(), "frontend", "dist") : "N/A"
    });
});

// Protected test route
app.get("/video-calls", protectRoute, (req, res) => {
    res.status(200).json({ msg: "Authorized" });
});

// Debug Logging
app.use((req, res, next) => {
    console.log(`📡 Request: ${req.method} ${req.url}`);
    next();
});

// API Routes
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/users", userRoutes);

// Root Health Check
app.get("/", (req, res) => res.json({ status: "Backend is Running!", version: "1.0.0" }));
app.get("/api", (req, res) => res.json({ status: "API Root Reached" }));

// Catch-all for API 404s to verify backend connectivity
// In Express 5, use simple middleware at the end of API paths
app.use("/api", (req, res) => {
    console.log(`❌ 404 Not Found: ${req.originalUrl}`);
    res.status(404).json({ error: "Route Not Found", path: req.originalUrl, message: "Backend reached, but endpoint missing." });
});

// Production Static Serving
if (ENV.NODE_ENV === "production" || process.env.VERCEL) {
    // Try to find the production build folder in multiple locations
    const possiblePaths = [
        path.resolve(process.cwd(), "frontend", "dist"), // If started from root
        path.resolve(process.cwd(), "..", "frontend", "dist"), // If started from backend/
        path.resolve(__dirname, "..", "..", "frontend", "dist") // Relative to server.js
    ];

    let staticPath = possiblePaths[0];
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            staticPath = p;
            break;
        }
    }

    const indexPath = path.resolve(staticPath, "index.html");

    // Only serve static files if we found them (might not exist in serverless/vercel backend-only deploy)
    if (fs.existsSync(staticPath)) {
        console.log("📁 Production Mode: Serving static files from", staticPath);
        app.use(express.static(staticPath));
        // Catch-all route for SPA using Regex literal (required for Express 5)
        app.get(/.*/, (req, res) => {
            res.sendFile(indexPath);
        });
    } else {
        // If not found, we don't crash, just log. 
        // On Vercel, this block might run but find nothing, which is correct (Frontend is separate).
    }
}

export { app };
