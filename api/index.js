import { app } from '../src/app.js';
import { connectDB } from '../src/lib/db.js';

// Ensure DB is connected for serverless function execution
// Ensure DB is connected for serverless function execution
connectDB().catch(err => {
    console.error("❌ Failed to connect to DB during startup (Likely missing ENV vars or IP whitelist issue):", err);
});

export default app;
