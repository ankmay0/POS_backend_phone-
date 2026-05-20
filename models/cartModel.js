import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      // Removed 'index: true' - unique index defined below
    },
    userId: {
      type: String,
      default: "",
    },
    userName: {
      type: String,
      default: "Guest User",
    },
    items: [
      {
        foodId: {
          type: String,
          required: true,
        },
        foodName: {
          type: String,
          required: true,
          trim: true,
        },
        category: {
          type: String,
          trim: true,
          default: "Uncategorized",
        },
        type: {
          type: String,
          enum: ["Veg", "Non-Veg", "Other"],
          default: "Veg",
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        image: {
          type: String,
          default: "",
        },
        selectedSize: {
          type: String,
          enum: {
            values: ["Small", "Medium", "Large", "Half", "Full"],
            message: "{VALUE} is not a valid size",
          },
          default: null,
          required: false,
        },
      },
    ],
  },
  { timestamps: true }
);

// Ensure one cart per user
cartSchema.index({ userEmail: 1 }, { unique: true });

export default mongoose.model("Cart", cartSchema);

