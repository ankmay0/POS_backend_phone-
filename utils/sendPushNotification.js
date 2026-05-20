import Subscription from "../models/subscriptionModel.js";
import Admin from "../models/adminModel.js";
import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

// Configure VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Send push notification to a specific user
 * @param {string} userEmail - User's email
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} options - Additional options (icon, data, tag)
 */
export const sendPushToUser = async (userEmail, title, body, options = {}) => {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("⚠️ VAPID keys not configured. Push notifications disabled.");
      return { success: false, error: "VAPID keys not configured" };
    }

    // Get user's web-push subscription
    const normalizedEmail = userEmail.toLowerCase().trim();
    const subscriptionDoc = await Subscription.findOne({ userEmail: normalizedEmail, platform: 'web-push' });
    if (!subscriptionDoc) {
      return { success: false, error: "User subscription not found" };
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: options.icon || "/favicon.ico",
      badge: "/favicon.ico",
      tag: options.tag || "default",
      data: options.data || {},
      requireInteraction: options.requireInteraction || false
    });

    try {
      await webpush.sendNotification(subscriptionDoc.subscription, payload);
      // Push notification sent successfully
      return { success: true };
    } catch (error) {
      // If subscription is invalid, remove it
      if (error.statusCode === 410 || error.statusCode === 404) {
        await Subscription.deleteOne({ userEmail });
        // Removed invalid subscription
        return { success: false, error: "Subscription expired", removed: true };
      }
      throw error;
    }
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send push notification to all subscribed users
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} options - Additional options
 */
/**
 * Send push notification to all subscribed users
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} options - Additional options
 */
export const sendPushToAll = async (title, body, options = {}) => {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("⚠️ VAPID keys not configured. Push notifications disabled.");
      return { success: false, error: "VAPID keys not configured" };
    }

    const subscriptions = await Subscription.find({});
    
    if (subscriptions.length === 0) {
      return { success: true, sent: 0, message: "No subscriptions found" };
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: options.icon || "/favicon.ico",
      badge: "/favicon.ico",
      tag: options.tag || "broadcast",
      data: options.data || {},
      requireInteraction: options.requireInteraction || false
    });

    // ⚡ Parallel Execution with Promise.allSettled
    const results = await Promise.allSettled(
      subscriptions.map(subDoc => 
        webpush.sendNotification(subDoc.subscription, payload)
          .then(() => ({ status: 'fulfilled', id: subDoc._id }))
          .catch(err => {
            // Attach ID to error for cleanup
            err.subscriptionId = subDoc._id;
            throw err;
          })
      )
    );

    let sent = 0;
    let failed = 0;
    const invalidSubscriptions = [];

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        const error = result.reason;
        if (error.statusCode === 410 || error.statusCode === 404) {
          if (error.subscriptionId) invalidSubscriptions.push(error.subscriptionId);
        }
      }
    });

    if (invalidSubscriptions.length > 0) {
      // Fire-and-forget cleanup
      Subscription.deleteMany({ _id: { $in: invalidSubscriptions } })
        .then(res => console.log(`🗑️ Removed ${res.deletedCount} invalid subscriptions`))
        .catch(err => console.error("❌ Error removing invalid subscriptions:", err));
    }

    // Push notifications sent
    return { success: true, sent, failed, total: subscriptions.length };
  } catch (error) {
    console.error("Error sending push notifications:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send push notification to all admin users
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} options - Additional options
 */
export const sendPushToAdmins = async (title, body, options = {}) => {
  try {
    // Starting admin push notifications
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("⚠️ VAPID keys not configured. Push notifications disabled.");
      return { success: false, error: "VAPID keys not configured" };
    }

    // 1. Get all admin emails
    const admins = await Admin.find({}, "email");
    const adminEmails = admins.map(admin => admin.email.toLowerCase().trim());
    
    console.log(`📊 [Push Diagnostics] Found ${admins.length} admins in database`);
    console.log(`📧 [Push] Normalized Admin emails:`, adminEmails);
    
    if (!admins.length) {
      console.warn("⚠️ [Push] No admins found in Admin collection");
      return { success: true, sent: 0, message: "No admins found" };
    }

    // 2. Find subscriptions for these emails
    const subscriptions = await Subscription.find({ 
      userEmail: { $in: adminEmails },
      platform: 'web-push'
    });
    
    console.log(`🔔 [Push] Found ${subscriptions.length} matching admin subscriptions`);
    if (subscriptions.length > 0) {
      console.log(`📋 [Push] Subscribed admin emails:`, subscriptions.map(s => s.userEmail));
    }
    
    if (subscriptions.length === 0) {
      console.warn(`⚠️ [Push] No subscriptions found for admins. Admins: ${adminEmails.join(', ')}`);
      return { success: true, sent: 0, message: "No admin subscriptions found" };
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: options.icon || "/favicon.ico",
      badge: "/favicon.ico",
      tag: options.tag || "admin-notification",
      data: options.data || {},
      requireInteraction: options.requireInteraction || false
    });

    // ⚡ Parallel Execution with Promise.allSettled
    const results = await Promise.allSettled(
      subscriptions.map(subDoc => 
        webpush.sendNotification(subDoc.subscription, payload)
          .then(() => ({ status: 'fulfilled', email: subDoc.userEmail }))
          .catch(err => {
            err.subscriptionId = subDoc._id;
            err.email = subDoc.userEmail;
            throw err;
          })
      )
    );

    let sent = 0;
    let failed = 0;
    const invalidSubscriptions = [];

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        sent++;
        // Sent to admin
      } else {
        failed++;
        const error = result.reason;
        console.error(`❌ Failed to send to admin ${error.email}:`, error.statusCode);
        if (error.statusCode === 410 || error.statusCode === 404) {
          if (error.subscriptionId) invalidSubscriptions.push(error.subscriptionId);
        }
      }
    });

    if (invalidSubscriptions.length > 0) {
      // Fire-and-forget cleanup
      Subscription.deleteMany({ _id: { $in: invalidSubscriptions } })
        .then(res => console.log(`🗑️ Removed ${res.deletedCount} invalid admin subscriptions`))
        .catch(err => console.error("❌ Error removing invalid admin subscriptions:", err));
    }

    // Admin push result
    console.log(`✅ [Push] Admin notifications: ${sent} sent, ${failed} failed (total: ${subscriptions.length})`);
    return { success: true, sent, failed, total: subscriptions.length };
  } catch (error) {
    console.error("❌ Error sending admin push notifications:", error);
    return { success: false, error: error.message };
  }
};

