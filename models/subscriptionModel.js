import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
    },

    subscription: {
      type: Object,
      required: false,
    },

    fcmToken: {
      type: String,
      required: false,
    },

    platform: {
      type: String,
      enum: ["web-push", "fcm"],
      default: "web-push",
    },
  },
  {
    timestamps: true,
  }
);

/* ----------------------------------------------------
   INDEXES — CLEAN AND NO DUPLICATES
---------------------------------------------------- */

// Unique per user + platform
subscriptionSchema.index(
  { userEmail: 1, platform: 1 },
  { unique: true }
);

// For fast FCM token lookup
subscriptionSchema.index({ fcmToken: 1 });

const Subscription =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
