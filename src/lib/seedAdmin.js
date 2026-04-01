import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const seedAdmin = async () => {
    try {
        const adminEmail = "admin@talenthunter.com";
        const adminPassword = "admin123";

        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log("ℹ️ Admin user already exists.");
            return;
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await User.create({
            name: "Universal Admin",
            email: adminEmail,
            role: "admin",
            password: hashedPassword,
            clerkId: "admin_master_id", // placeholder
        });

        console.log("✅ Universal Admin created successfully!");
        console.log("📧 Email: " + adminEmail);
        console.log("🔑 Password: " + adminPassword);
    } catch (error) {
        console.error("❌ Error seeding admin:", error);
    }
};
