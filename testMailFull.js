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

console.log("Starting full email send test for:", process.env.GMAIL_USER);

const mailOptions = {
    from: `"Test Hunter" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: "Talent-Hunter: Email Test Sync",
    text: "This is a test to verify if the server can send emails with the provided App Password.",
};

transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
        console.log("❌ Sending failed!");
        console.error(error);
    } else {
        console.log("✅ Email sent successfully!");
        console.log("Message info:", info.response);
    }
    process.exit(0);
});
