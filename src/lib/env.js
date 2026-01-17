import dotenv from "dotenv";

const result = dotenv.config();
if (result.error && process.env.NODE_ENV !== "production") {
     console.warn("⚠️ Could not load .env file, relying on system environment variables.");
}

const getEnv = (key, defaultValue = "") => {
     const value = process.env[key];
     return value ? value.trim() : defaultValue;
};

export const ENV = {
     PORT: getEnv("PORT"),
     DB_URL: getEnv("DB_URL"),
     NODE_ENV: getEnv("NODE_ENV", "development"),
     CLIENT_URL: getEnv("CLIENT_URL"),
     INNGEST_EVENT_KEY: getEnv("INNGEST_EVENT_KEY"),
     INNGEST_SIGNING_KEY: getEnv("INNGEST_SIGNING_KEY"),
     STREAM_API_KEY: getEnv("STREAM_API_KEY"),
     STREAM_API_SECRET: getEnv("STREAM_API_SECRET"),
     CLERK_PUBLISHABLE_KEY: getEnv("CLERK_PUBLISHABLE_KEY"),
     CLERK_SECRET_KEY: getEnv("CLERK_SECRET_KEY"),
};   