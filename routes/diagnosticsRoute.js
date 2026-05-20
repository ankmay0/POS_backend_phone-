import express from "express";
import Admin from "../models/adminModel.js";
import Subscription from "../models/subscriptionModel.js";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";

const router = express.Router();

/**
 * GET /api/admin/push-diagnostics
 * Check admin push notification setup
 */
router.get("/push-diagnostics", async (req, res) => {
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Please provide email query parameter"
      });
    }

    // Check if user is admin
    const admin = await Admin.findOne({ email });
    const isAdmin = !!admin;

    // Check if user has subscription
    const subscription = await Subscription.findOne({ 
      userEmail: email, 
      platform: 'web-push' 
    });
    const hasSubscription = !!subscription;

    // Get all admins for reference
    const allAdmins = await Admin.find({}, "email isSuperAdmin");
    const allSubscriptions = await Subscription.find({ platform: 'web-push' }, "userEmail");

    // Check VAPID configuration
    const vapidConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

    const result = {
      success: true,
      email,
      isAdmin,
      hasSubscription,
      vapidConfigured,
      adminDetails: admin ? {
        email: admin.email,
        isSuperAdmin: admin.isSuperAdmin,
        createdAt: admin.createdAt
      } : null,
      subscriptionDetails: subscription ? {
        userEmail: subscription.userEmail,
        platform: subscription.platform,
        hasValidSubscription: !!(subscription.subscription && subscription.subscription.endpoint)
      } : null,
      summary: {
        totalAdmins: allAdmins.length,
        totalSubscriptions: allSubscriptions.length,
        adminEmails: allAdmins.map(a => a.email),
        subscribedEmails: allSubscriptions.map(s => s.userEmail)
      },
      recommendations: []
    };

    // Add recommendations
    if (!isAdmin) {
      result.recommendations.push("❌ User is not registered as admin. Add to Admin collection.");
    }
    if (!hasSubscription) {
      result.recommendations.push("❌ User has not subscribed to push notifications. Log in as this user and allow notifications.");
    }
    if (!vapidConfigured) {
      result.recommendations.push("❌ VAPID keys not configured in environment variables.");
    }
    if (isAdmin && hasSubscription && vapidConfigured) {
      result.recommendations.push("✅ All checks passed! Push notifications should work.");
    }

    res.json(result);
  } catch (error) {
    console.error("Error in push diagnostics:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
