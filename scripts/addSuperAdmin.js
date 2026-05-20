import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "../models/adminModel.js";
import { connectDB } from "../config/db.js";

dotenv.config();

/**
 * Promote (or create) a super admin by email.
 *
 * Usage:
 *   node scripts/addSuperAdmin.js <email>
 *
 * Behavior:
 *   - If the email does not exist in the Admin collection → creates a new doc with isSuperAdmin: true
 *   - If the email already exists as a regular admin → upgrades it to isSuperAdmin: true
 *   - If the email is already a super admin → no-op
 */

async function addSuperAdmin() {
  const email = (process.argv[2] || "").toLowerCase().trim();

  if (!email) {
    console.error("❌ Email argument is required.");
    console.error("   Usage: node scripts/addSuperAdmin.js <email>");
    process.exit(1);
  }

  // Light email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`❌ "${email}" is not a valid email address.`);
    process.exit(1);
  }

  try {
    console.log("🔄 Connecting to database…");
    await connectDB();

    // Wait briefly for connection to settle (matches initSuperAdmin.js pattern)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (mongoose.connection.readyState !== 1) {
      console.error("❌ Failed to connect to database");
      process.exit(1);
    }

    console.log("✅ Database connected");

    const existing = await Admin.findOne({ email });

    if (existing) {
      if (existing.isSuperAdmin) {
        console.log(`✅ ${email} is already a super admin — nothing to do.`);
        process.exit(0);
      }
      existing.isSuperAdmin = true;
      await existing.save();
      console.log(`✅ Promoted existing admin to super admin: ${email}`);
      process.exit(0);
    }

    const superAdmin = new Admin({
      email,
      isSuperAdmin: true,
      createdBy: "system",
    });

    await superAdmin.save();
    console.log(`✅ Super admin created: ${email}`);
    console.log("🎉 This account can now manage other admins.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error adding super admin:", err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

addSuperAdmin();
