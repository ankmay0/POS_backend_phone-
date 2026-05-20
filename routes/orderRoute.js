/**
 * TABLE OPTIONS CONFIGURATION:
 * - Total Tables: 11 tables (numbered 1-11)
 * - Chairs per Table: 4 chairs per table
 * - Table Numbering: Tables are numbered from 1 to 11
 * - Chair Indices: Each table has 4 chairs indexed 0-3 (top row: 0,1 | bottom row: 2,3)
 * - Delivery Orders: Use tableNumber = 0 for delivery/takeaway orders (not dine-in)
 * - Table Selection: Users can select multiple chairs at the same table
 * - Availability: Tables are considered booked if they have active orders (status !== "Completed" && status !== "Served")
 */
import express from "express";
import {
  createOrder,
  getOrders,
  createMultipleOrders,
  updateOrderStatus,
  deleteOrder,
  getOccupiedTables
} from "../controllers/orderController.js";
import Order from "../models/orderModel.js";

const router = express.Router();

/* ===========================================
   🧾 Existing Routes
=========================================== */
router.get("/", getOrders);
router.get("/occupied-tables", getOccupiedTables); // New route
router.post("/create", createOrder);
router.post("/create-multiple", createMultipleOrders);
router.put("/:id", updateOrderStatus);
router.delete("/:id", deleteOrder);

/* ===========================================
   🆕 Add Single Food Order (for Menu "Add" button)
=========================================== */
router.post("/add", async (req, res) => {
  try {
    // Ensure database connection (for serverless)
    const mongoose = await import("mongoose");
    const { connectDB } = await import("../config/db.js");
    if (mongoose.default.connection.readyState !== 1) {
      console.log("🔄 Establishing database connection for add order...");
      await connectDB();
      
      if (mongoose.default.connection.readyState !== 1) {
        return res.status(503).json({ 
          success: false,
          message: "Database connection unavailable. Please try again later." 
        });
      }
    }

    const {
      foodName,
      category,
      type,
      quantity,
      price,
      userId,
      userEmail,
      userName,
      image,
    } = req.body;

    // ✅ Validation
    if (!foodName || !price)
      return res.status(400).json({ success: false, message: "Missing food details" });

    // ✅ Create new order entry
    const newOrder = new Order({
      foodName,
      category,
      type,
      quantity: quantity || 1,
      price,
      image,
      userId,
      userEmail,
      userName,
      tableNumber: 0, // TABLE OPTIONS: Virtual/default table (0 = delivery/takeaway, 1-40 = dine-in tables with 4 chairs each)
      status: "Pending",
      paymentStatus: "Unpaid",
    });

    // ✅ Save to DB
    const savedOrder = await newOrder.save();

    // ✅ Emit real-time update if socket available - Use room-based broadcasting
    if (req.io && typeof req.io.to === "function") {
      // Emit to admins room for faster delivery
      req.io.to("admins").emit("newOrderPlaced", savedOrder);
      // Also emit to specific user if userId exists
      if (savedOrder.userId) {
        req.io.to(`user:${savedOrder.userId}`).emit("newOrderPlaced", savedOrder);
      }
      console.log("📦 Emitted newOrderPlaced event for order:", savedOrder._id);
    } else if (req.io && typeof req.io.emit === "function") {
      // Fallback for non-room-based setup
      req.io.emit("newOrderPlaced", savedOrder);
      console.log("📦 Emitted newOrderPlaced event for order:", savedOrder._id);
    }

    res.status(200).json({
      success: true,
      message: "Food added successfully!",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Error adding food:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding food",
    });
  }
});

export default router;
