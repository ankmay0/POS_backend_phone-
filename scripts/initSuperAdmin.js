import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "../models/adminModel.js";
import { connectDB } from "../config/db.js";

dotenv.config();

const SUPER_ADMIN_EMAIL = "irajvmailcom0@gmail.com";

async function initSuperAdmin() {
  try {
    console.log("🔄 Connecting to database...");
    await connectDB();
    
    // Wait a bit for connection to be fully established
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (mongoose.connection.readyState !== 1) {
      console.error("❌ Failed to connect to database");
      process.exit(1);
    }

    console.log("✅ Database connected");

    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ email: SUPER_ADMIN_EMAIL.toLowerCase() });

    if (existingAdmin) {
      if (existingAdmin.isSuperAdmin) {
        console.log("✅ Super admin already exists:", SUPER_ADMIN_EMAIL);
        process.exit(0);
      } else {
        // Update to super admin
        existingAdmin.isSuperAdmin = true;
        await existingAdmin.save();
        console.log("✅ Updated existing admin to super admin:", SUPER_ADMIN_EMAIL);
        process.exit(0);
      }
    }

    // Create super admin
    const superAdmin = new Admin({
      email: SUPER_ADMIN_EMAIL.toLowerCase(),
      isSuperAdmin: true,
      createdBy: "system",
    });

    await superAdmin.save();
    console.log("✅ Super admin created successfully:", SUPER_ADMIN_EMAIL);
    console.log("🎉 You can now use this email to manage other admins!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing super admin:", error);
    process.exit(1);
  }
}

// Run the script
initSuperAdmin();

