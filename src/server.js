import { app } from "./app.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";

process.on('uncaughtException', (err) => {
     console.error('❌ UNCAUGHT EXCEPTION! Shutting down...', err);
});

process.on('unhandledRejection', (err) => {
     console.error('❌ UNHANDLED REJECTION! Shutting down...', err);
});

const startServer = async () => {
     const port = parseInt(ENV.PORT || "5000", 10);

     console.log("🚀 Starting server startup sequence...");
     console.log("📝 Environment Keys:", Object.keys(process.env).filter(k => !k.includes("KEY") && !k.includes("SECRET")));

     console.log("🚀 Startup config:", {
          port,
          node_env: ENV.NODE_ENV,
          has_db_url: !!ENV.DB_URL,
          client_url: ENV.CLIENT_URL
     });

     try {
          const server = app.listen(port, () => {
               console.log(`✅ Server successfully started and listening on port ${port}`);

               // Connect to DB in background
               connectDB().catch(err => {
                    console.error("❌ Background DB connection failed:", err);
               });
          });

          server.on('error', (err) => {
               if (err.code === 'EADDRINUSE') {
                    console.error(`❌ Port ${port} is already in use.`);
               } else {
                    console.error("❌ Server secondary error:", err);
               }
          });

     } catch (error) {
          console.error("❌ Critical server startup error:", error);
     }
};

startServer();
