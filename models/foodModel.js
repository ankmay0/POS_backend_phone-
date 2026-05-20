import mongoose from "mongoose";

const foodSchema = new mongoose.Schema(
  {
    name: String,
    category: String,
    type: String,
    price: Number,
    image: String, // now stores full ImageKit URL
    available: { type: Boolean, default: true },
    // Size options (optional - only for foods that have sizes)
    hasSizes: { type: Boolean, default: false },
    sizeType: {
      type: String,
      enum: ["standard", "half-full", null],
      default: null,
    },
    sizes: {
      Small: { type: Number, default: null },
      Medium: { type: Number, default: null },
      Large: { type: Number, default: null },
    },
    halfFull: {
      Half: { type: Number, default: null },
      Full: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

// ⚡ Indexes for performance (optimized for 1000+ users)
foodSchema.index({ category: 1 });
foodSchema.index({ type: 1 });
foodSchema.index({ available: 1 });
foodSchema.index({ createdAt: -1 });

// ⚡ Compound indexes for menu filtering
foodSchema.index({ category: 1, type: 1 });     // Filter by category + veg/non-veg
foodSchema.index({ category: 1, available: 1 }); // Available items per category
foodSchema.index({ available: 1, createdAt: -1 }); // Latest available items

export default mongoose.model("Food", foodSchema);
