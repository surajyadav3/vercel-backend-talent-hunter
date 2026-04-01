import nodemailer from "nodemailer";
import { ENV } from "./env.js";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: ENV.GMAIL_USER,
        pass: ENV.GMAIL_PASS,
    },
});

export const sendInviteEmail = async (studentEmail, sessionLink, sessionName, hostName) => {
    const mailOptions = {
        from: `"Talent Hunter" <${ENV.GMAIL_USER}>`,
        to: studentEmail,
        subject: `Technical Interview Invitation`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #2563eb;">Interview Invitation</h2>
                <p>Hello,</p>
                <p>You have been invited to a technical interview by <strong>${hostName}</strong> on the Talent Hunter platform.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${sessionLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Connect to Session
                    </a>
                </div>
                <p>If the button doesn't work, copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #666;">${sessionLink}</p>
                <p>Good luck!</p>
                <hr style="margin-top: 30px;">
                <p style="font-size: 12px; color: #999;">This invitation was sent from Talent-Hunter Platform.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Invite email sent to ${studentEmail}`);
        return true;
    } catch (error) {
        console.error("❌ Error sending invite email:", error);
        return false;
    }
};
