import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true, // linked to logged-in Firebase user
    },
    userName: {
      type: String,
      default: "Guest User", // Username from Firebase displayName
    },
    tableNumber: {
      type: Number,
      required: false, // Not required when using tables array
      default: 0, // 0 = delivery/takeaway
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
    selectedSize: {
      type: String,
      enum: ["Small", "Medium", "Large", "Half", "Full"],
      default: null,
      required: false,
    },
    status: {
      type: String,
      enum: ["Order", "Preparing", "Served", "Completed"],
      default: "Order",
    },
    userId: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    isInRestaurant: {
      type: Boolean,
      default: true,
    },
    contactNumber: {
      type: String,
      trim: true,
      default: "",
    },
    chairsBooked: {
      type: Number,
      default: 0,
      min: 0,
      max: 4, // TABLE OPTIONS: Maximum 4 chairs per table
    },
    chairIndices: {
      type: [Number], // Array of chair indices (0-3) for dine-in orders
      default: [],
      validate: {
        validator: function(v) {
          // TABLE OPTIONS: Each index must be between 0-3 (4 chairs per table)
          return v.every(idx => idx >= 0 && idx <= 3);
        },
        message: 'Chair indices must be between 0 and 3'
      }
    },
    chairLetters: {
      type: String,
      trim: true,
      default: "", // Chair letters (a, b, c, d) for display, space-separated
    },
    tables: [
      {
        tableNumber: { type: Number, required: true },
        chairIndices: { type: [Number], default: [] },
        chairLetters: { type: String, default: "" }
      }
    ],
    deliveryLocation: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
      address: {
        type: String,
        trim: true,
        default: "",
      },
    },
  },
  { timestamps: true } // ✅ adds createdAt & updatedAt automatically
);

// ⚡ Pre-save middleware to normalize table data
orderSchema.pre('save', function(next) {
  // If using multi-table structure, ensure it's populated correctly
  if (this.tables && this.tables.length > 0) {
    // Use the first table as the primary tableNumber if not set
    if (!this.tableNumber || this.tableNumber === 0) {
      this.tableNumber = this.tables[0].tableNumber;
    }
  } else if (this.tableNumber && this.tableNumber > 0) {
    // If using single table structure, populate tables array for consistency
    this.tables = [{
      tableNumber: this.tableNumber,
      chairIndices: this.chairIndices || [],
      chairLetters: this.chairLetters || ''
    }];
  }
  next();
});


// ⚡ Indexes for performance (optimized for 1000+ users)
orderSchema.index({ userEmail: 1 });
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ tableNumber: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "tables.tableNumber": 1 });

// ⚡ Compound indexes for common query patterns
orderSchema.index({ status: 1, createdAt: -1 }); // Admin dashboard - orders by status and time
orderSchema.index({ userEmail: 1, status: 1 });  // User order history filtered by status
orderSchema.index({ userEmail: 1, createdAt: -1 }); // User order history chronological

export default mongoose.model("Order", orderSchema);
