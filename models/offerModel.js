import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: false, // Optional - can have text-only offers
    },
    active: {
      type: Boolean,
      default: true,
    },
    validFrom: {
      type: Date,
      required: false,
    },
    validUntil: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Index for faster queries
offerSchema.index({ active: 1 });
offerSchema.index({ validUntil: 1 });

const Offer = mongoose.models.Offer || mongoose.model("Offer", offerSchema);

export default Offer;
