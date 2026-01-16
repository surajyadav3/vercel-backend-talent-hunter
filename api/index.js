import { app } from '../src/app.js';
import { connectDB } from '../src/lib/db.js';

// Ensure DB is connected for serverless function execution
connectDB();

export default app;
