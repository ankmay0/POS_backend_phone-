import express from "express";
import webpush from "web-push";
import dotenv from "dotenv";
import Subscription from "../models/subscriptionModel.js";

dotenv.config();
const router = express.Router();

/* ------------------------------------------------------------
   CONFIGURE VAPID KEYS
------------------------------------------------------------ */
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log("✅ VAPID keys configured.");
} else {
  console.warn("⚠️ VAPID keys missing. Run: node scripts/generateVapidKeys.js");
}

/* ------------------------------------------------------------
   GET PUBLIC VAPID KEY
------------------------------------------------------------ */
router.get("/vapid-key", (req, res) => {
  if (!vapidPublicKey) {
    return res.status(500).json({ error: "VAPID key missing." });
  }
  res.json({ publicKey: vapidPublicKey });
});

/* ------------------------------------------------------------
   SAVE SUBSCRIPTION
------------------------------------------------------------ */
router.post("/subscribe", async (req, res) => {
  try {
    // Ensure database connection (for serverless)
    const { connectDB } = await import("../config/db.js");
    const mongoose = await import("mongoose");
    
    if (mongoose.default.connection.readyState !== 1) {
      console.log("🔄 Establishing database connection for push subscription...");
      await connectDB();
      
      // Verify connection is ready
      if (mongoose.default.connection.readyState !== 1) {
        return res.status(503).json({ 
          error: "Database connection unavailable", 
          details: "Please try again later" 
        });
      }
    }

    const { subscription, userEmail } = req.body;

    if (!subscription || !userEmail) {
      return res
        .status(400)
        .json({ error: "subscription & userEmail required." });
    }

    // Always store subscription with platform: "web-push"
    const platform = "web-push";
    const normalizedEmail = userEmail.toLowerCase().trim();

    const result = await Subscription.findOneAndUpdate(
      { userEmail: normalizedEmail },
      {
        userEmail: normalizedEmail,
        platform,
        subscription,
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log("✅ Subscription saved:", userEmail);
    res.json({ success: true, message: "Subscription saved", subscription: result });

  } catch (error) {
    // ⚡ Handle Race Condition (Duplicate Key Error)
    // Check code 11000 or string message (Mongoose sometimes wraps it)
    if (error.code === 11000 || (error.message && (error.message.includes('duplicate key') || error.message.includes('E11000')))) {
      console.warn("⚠️ Race condition detected for push subscription. Retrying update...");
      try {
        const retryResult = await Subscription.findOneAndUpdate(
            { userEmail },
            {
              userEmail,
              platform,
              subscription,
              updatedAt: new Date(),
            },
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
            }
          );
          console.log("✅ Subscription saved (retry successful):", userEmail);
          return res.json({ success: true, message: "Subscription saved", subscription: retryResult });
      } catch (retryError) {
        console.error("❌ Retry failed:", retryError);
        // Fallthrough to 500
      }
    }

    console.error("❌ Error saving subscription:", error);
    res.status(500).json({
      error: "Failed to save subscription",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/* ------------------------------------------------------------
   REMOVE SUBSCRIPTION
------------------------------------------------------------ */
router.post("/unsubscribe", async (req, res) => {
  try {
    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: "userEmail is required" });
    }

    const normalizedEmail = userEmail.toLowerCase().trim();
    await Subscription.deleteOne({ userEmail: normalizedEmail, platform: "web-push" });

    console.log("🗑️ Subscription removed:", userEmail);
    res.json({ success: true, message: "Unsubscribed" });

  } catch (error) {
    console.error("❌ Error removing subscription:", error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

/* ------------------------------------------------------------
   SEND NOTIFICATION TO A SINGLE USER
------------------------------------------------------------ */
router.post("/send", async (req, res) => {
  try {
    const { userEmail, title, body, icon, data, tag } = req.body;

    if (!userEmail || !title || !body) {
      return res.status(400).json({ error: "userEmail, title, body required" });
    }

    const normalizedEmail = userEmail.toLowerCase().trim();
    // Retrieve only web-push subscriptions
    const subscriptionDoc = await Subscription.findOne({
      userEmail: normalizedEmail,
      platform: "web-push",
    });

    if (!subscriptionDoc) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/favicon.ico",
      badge: "/favicon.ico",
      tag: tag || "default",
      data: data || {},
    });

    try {
      await webpush.sendNotification(subscriptionDoc.subscription, payload);

      console.log(`📨 Notification sent → ${userEmail}`);
      return res.json({ success: true, message: "Notification sent" });

    } catch (error) {
      // If outdated subscription → delete it
      if (error.statusCode === 410 || error.statusCode === 404) {
        await Subscription.deleteOne({ _id: subscriptionDoc._id });
        console.log(`🗑️ Removed invalid subscription → ${userEmail}`);
        return res.status(410).json({ error: "Subscription expired", removed: true });
      }
      throw error;
    }

  } catch (error) {
    console.error("❌ Error sending push notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

/* ------------------------------------------------------------
   SEND BROADCAST TO ALL USERS
------------------------------------------------------------ */
router.post("/send-all", async (req, res) => {
  try {
    const { title, body, icon, data, tag } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "title & body required" });
    }

    const subscriptions = await Subscription.find({ platform: "web-push" });

    if (!subscriptions.length) {
      return res.json({ success: true, message: "No subscriptions" });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/favicon.ico",
      badge: "/favicon.ico",
      tag: tag || "broadcast",
      data: data || {},
    });

    let sent = 0,
      failed = 0;
    const invalid = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
      } catch (error) {
        failed++;
        if (error.statusCode === 410 || error.statusCode === 404) {
          invalid.push(sub._id);
        }
      }
    }

    if (invalid.length > 0) {
      await Subscription.deleteMany({ _id: { $in: invalid } });
    }

    console.log(`📢 Broadcast result: ${sent} sent, ${failed} failed`);
    res.json({ success: true, sent, failed });

  } catch (error) {
    console.error("❌ Error sending broadcast:", error);
    res.status(500).json({ error: "Failed to send broadcast" });
  }
});

export default router;
