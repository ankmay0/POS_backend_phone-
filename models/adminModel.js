import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // Removed 'index: true' - unique index defined below
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
      default: "system", // Email of the admin who created this admin
    },
  },
  { timestamps: true }
);

// Ensure email is unique
adminSchema.index({ email: 1 }, { unique: true });

export default mongoose.model("Admin", adminSchema);

