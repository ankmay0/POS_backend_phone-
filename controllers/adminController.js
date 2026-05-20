import Admin from "../models/adminModel.js";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";

// Check if user is admin
export const checkAdminStatus = async (req, res) => {
  try {
    // Ensure database connection (for serverless)
    if (mongoose.connection.readyState !== 1) {
      console.log("🔄 Establishing database connection for checkAdminStatus...");
      await connectDB();
    }

    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        isAdmin: false,
        isSuperAdmin: false,
        message: "Email is required" 
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    if (!admin) {
      return res.status(200).json({ 
        success: true,
        isAdmin: false,
        isSuperAdmin: false,
        message: "User is not an admin" 
      });
    }

    res.status(200).json({ 
      success: true,
      isAdmin: true,
      isSuperAdmin: admin.isSuperAdmin || false,
      message: admin.isSuperAdmin ? "User is a super admin" : "User is an admin"
    });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ 
      success: false,
      isAdmin: false,
      isSuperAdmin: false,
      message: "Failed to check admin status",
      error: error.message 
    });
  }
};

// Get all admins (super admin only)
export const getAllAdmins = async (req, res) => {
  try {
    // Ensure database connection (for serverless)
    if (mongoose.connection.readyState !== 1) {
      console.log("🔄 Establishing database connection for getAllAdmins...");
      await connectDB();
    }

    const { requesterEmail } = req.query;

    if (!requesterEmail) {
      return res.status(400).json({ 
        success: false, 
        message: "Requester email is required" 
      });
    }

    // Check if requester is super admin
    const requester = await Admin.findOne({ email: requesterEmail.toLowerCase().trim() });
    
    if (!requester || !requester.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Only super admins can view all admins" 
      });
    }

    const admins = await Admin.find().sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true,
      admins: admins.map(admin => ({
        email: admin.email,
        isSuperAdmin: admin.isSuperAdmin,
        createdAt: admin.createdAt,
        createdBy: admin.createdBy,
      }))
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch admins",
      error: error.message 
    });
  }
};

// Add admin (super admin only)
export const addAdmin = async (req, res) => {
  try {
    // Ensure database connection (for serverless)
    if (mongoose.connection.readyState !== 1) {
      console.log("🔄 Establishing database connection for addAdmin...");
      await connectDB();
    }

    const { email, requesterEmail } = req.body;

    if (!email || !requesterEmail) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and requester email are required" 
      });
    }

    // Check if requester is super admin
    const requester = await Admin.findOne({ email: requesterEmail.toLowerCase().trim() });
    
    if (!requester || !requester.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Only super admins can add admins" 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: "This email is already an admin" 
      });
    }

    // Create new admin
    const newAdmin = new Admin({
      email: normalizedEmail,
      isSuperAdmin: false, // Only system can create super admins
      createdBy: requesterEmail,
    });

    await newAdmin.save();

    res.status(201).json({ 
      success: true,
      message: "Admin added successfully",
      admin: {
        email: newAdmin.email,
        isSuperAdmin: newAdmin.isSuperAdmin,
        createdAt: newAdmin.createdAt,
      }
    });
  } catch (error) {
    console.error("Error adding admin:", error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: "This email is already an admin" 
      });
    }
    res.status(500).json({ 
      success: false,
      message: "Failed to add admin",
      error: error.message 
    });
  }
};

// Remove admin (super admin only)
export const removeAdmin = async (req, res) => {
  try {
    // Ensure database connection (for serverless)
    if (mongoose.connection.readyState !== 1) {
      console.log("🔄 Establishing database connection for removeAdmin...");
      await connectDB();
    }

    const { email, requesterEmail } = req.body;

    if (!email || !requesterEmail) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and requester email are required" 
      });
    }

    // Check if requester is super admin
    const requester = await Admin.findOne({ email: requesterEmail.toLowerCase().trim() });
    
    if (!requester || !requester.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Only super admins can remove admins" 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Prevent removing super admin
    const adminToRemove = await Admin.findOne({ email: normalizedEmail });
    if (!adminToRemove) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin not found" 
      });
    }

    if (adminToRemove.isSuperAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot remove super admin" 
      });
    }

    // Prevent removing yourself
    if (normalizedEmail === requesterEmail.toLowerCase().trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "You cannot remove yourself" 
      });
    }

    await Admin.findOneAndDelete({ email: normalizedEmail });

    res.status(200).json({ 
      success: true,
      message: "Admin removed successfully"
    });
  } catch (error) {
    console.error("Error removing admin:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to remove admin",
      error: error.message 
    });
  }
};

