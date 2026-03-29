import mongoose from "mongoose";
import { ENV } from "./env.js";

let cached = global.mongoose;

if (!cached) {
     cached = global.mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
     if (cached.conn) {
          return cached.conn;
     }

     if (!cached.promise) {
          if (!ENV.DB_URL) {
               throw new Error("DB_URL is not defined in environment variables");
          }

          const opts = {
               bufferCommands: false,
               maxPoolSize: 10, // Increase connection pool for better concurrency
               minPoolSize: 2,  // Keep minimum connections ready
               socketTimeoutMS: 30000,
               serverSelectionTimeoutMS: 10000,
          };

          cached.promise = mongoose.connect(ENV.DB_URL, opts).then((mongoose) => {
               console.log("✅ Connected to MongoDB");
               return mongoose;
          });
     }

     try {
          cached.conn = await cached.promise;
     } catch (e) {
          cached.promise = null;
          throw e;
     }

     return cached.conn;
};