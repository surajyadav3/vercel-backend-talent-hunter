import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

console.log("Verifying connection to Gmail for:", process.env.GMAIL_USER);

transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ Connection failed!");
    console.error(error);
  } else {
    console.log("✅ Server is ready to take our messages");
  }
  process.exit(0);
});
