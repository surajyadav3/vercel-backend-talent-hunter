import mongoose from "mongoose";
import dotenv from "dotenv";
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

console.log("URI resolving");

mongoose.connect(process.env.DB_URL).then(async () => {
    const db = mongoose.connection.db;
    const res = await db.collection("users").updateOne(
        { email: "soruyadav2004@gmail.com" },
        { $set: { role: "recruiter", roleSelected: true } }
    );
    console.log("Updated:", res);
    process.exit(0);
}).catch(console.error);
