import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Food from "../models/foodModel.js";
import mongoose from "mongoose";

const router = express.Router();

// ✅ Memory storage (no local files)
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* ================================
   🥗 GET - All Foods
================================ */
router.get("/", async (req, res) => {
  try {
    // ✅ Ensure database connection
    const { connectDB } = await import("../config/db.js");
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    // Query foods
    const foods = await Food.find().sort({ createdAt: -1 });
    console.log(`✅ Fetched ${foods.length} foods successfully`);
    res.status(200).json(foods);
  } catch (err) {
    console.error("❌ Error fetching foods:", err);
    // Provide more detailed error information
    const errorMessage = err.message || "Unknown error";
    const errorName = err.name || "Error";
    
    console.error("Error details:", {
      message: errorMessage,
      name: errorName,
      stack: err.stack,
      readyState: mongoose.connection.readyState
    });
    
    // Check if it's a database connection error
    if (errorName === "MongoServerSelectionError" || errorMessage.includes("connection")) {
      return res.status(503).json({ 
        success: false, 
        message: "Database connection error. Please try again later.",
        error: process.env.NODE_ENV === "development" ? errorMessage : undefined
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch foods",
      error: process.env.NODE_ENV === "development" ? errorMessage : undefined
    });
  }
});

/* ================================
   🍔 GET - Single Food by ID
================================ */
router.get("/:id", async (req, res) => {
  try {
    // ✅ Validate MongoDB ObjectId format
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid food ID format" 
      });
    }

    // ✅ Ensure database connection
    const { connectDB } = await import("../config/db.js");
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const food = await Food.findById(id);
    if (!food)
      return res.status(404).json({ success: false, message: "Food not found" });
    res.status(200).json(food);
  } catch (err) {
    console.error("❌ Error fetching single food:", err);
    
    // Check if it's an invalid ObjectId CastError
    if (err.name === "CastError" || err.message.includes("Cast to ObjectId")) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid food ID format",
        error: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
    
    // Check if it's a database connection error
    if (err.name === "MongoServerSelectionError" || err.message.includes("connection")) {
      return res.status(503).json({ 
        success: false, 
        message: "Database connection error. Please try again later.",
        error: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch food",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

/* ================================
   🍕 POST - Add New Food
================================ */
router.post("/add", upload.single("image"), async (req, res) => {
  try {
    // ✅ Ensure database connection
    const { connectDB } = await import("../config/db.js");
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    // ✅ Validation
    const { name, category, type, price, hasSizes, sizeType, sizes, halfFull } = req.body;
    
    // If sizes are enabled, price is not required (sizes have their own prices)
    // If sizes are disabled, price is required
    const hasSizesBool = hasSizes === "true" || hasSizes === true;
    const finalSizeType = hasSizesBool ? (sizeType || "standard") : null;

    // Parse sizes and halfFull if they are strings (from FormData)
    let parsedSizesInput = sizes;
    let parsedHalfFullInput = halfFull;

    try {
      if (typeof sizes === 'string') parsedSizesInput = JSON.parse(sizes);
    } catch (e) {
      console.error("Error parsing sizes JSON:", e);
      parsedSizesInput = {};
    }

    try {
      if (typeof halfFull === 'string') parsedHalfFullInput = JSON.parse(halfFull);
    } catch (e) {
      console.error("Error parsing halfFull JSON:", e);
      parsedHalfFullInput = {};
    }
    
    if (!name || !category || !type) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, category, and type",
      });
    }

    if (!hasSizesBool && (!price || Number(price) <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid price when sizes are disabled",
      });
    }

    if (hasSizesBool) {
      if (finalSizeType === "half-full") {
        // Validate Half/Full sizes
        const halfFullPrices = {
          Half: parsedHalfFullInput?.Half ? Number(parsedHalfFullInput.Half) : null,
          Full: parsedHalfFullInput?.Full ? Number(parsedHalfFullInput.Full) : null,
        };
        
        // At least one Half/Full price should be provided
        if (!halfFullPrices.Half && !halfFullPrices.Full) {
          return res.status(400).json({
            success: false,
            message: "Please provide at least one size price (Half or Full)",
          });
        }
      } else {
        // Validate Standard sizes
        const sizePrices = {
          Small: parsedSizesInput?.Small ? Number(parsedSizesInput.Small) : null,
          Medium: parsedSizesInput?.Medium ? Number(parsedSizesInput.Medium) : null,
          Large: parsedSizesInput?.Large ? Number(parsedSizesInput.Large) : null,
        };
        
        // At least one size price should be provided
        if (!sizePrices.Small && !sizePrices.Medium && !sizePrices.Large) {
          return res.status(400).json({
            success: false,
            message: "Please provide at least one size price (Small, Medium, or Large)",
          });
        }
      }
    }

    const validTypes = ["Veg", "Non-Veg", "Other"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be one of: Veg, Non-Veg, Other",
      });
    }

    const priceNum = hasSizesBool ? 0 : Number(price); // Default price when sizes are enabled
    if (!hasSizesBool && (isNaN(priceNum) || priceNum <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Price must be a positive number",
      });
    }

    let imageUrl = null;

    if (req.file) {
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const uploadResponse = await cloudinary.uploader.upload(base64, {
        folder: "tastebite_foods",
        resource_type: "auto",
      });
      imageUrl = uploadResponse.secure_url;
      console.log("✅ Uploaded to Cloudinary:", imageUrl);
    }

    // Parse sizes based on sizeType
    let parsedSizes = null;
    let parsedHalfFull = null;
    
    if (hasSizesBool) {
      if (finalSizeType === "half-full") {
        // Parse Half/Full sizes
        parsedHalfFull = {
          Half: parsedHalfFullInput?.Half ? Number(parsedHalfFullInput.Half) : null,
          Full: parsedHalfFullInput?.Full ? Number(parsedHalfFullInput.Full) : null,
        };
        parsedSizes = {
          Small: null,
          Medium: null,
          Large: null,
        };
      } else {
        // Parse Standard sizes (Small/Medium/Large)
        parsedSizes = {
          Small: parsedSizesInput?.Small ? Number(parsedSizesInput.Small) : null,
          Medium: parsedSizesInput?.Medium ? Number(parsedSizesInput.Medium) : null,
          Large: parsedSizesInput?.Large ? Number(parsedSizesInput.Large) : null,
        };
        parsedHalfFull = {
          Half: null,
          Full: null,
        };
      }
    } else {
      parsedSizes = {
        Small: null,
        Medium: null,
        Large: null,
      };
      parsedHalfFull = {
        Half: null,
        Full: null,
      };
    }

    const food = new Food({
      name: name.trim(),
      category: category.trim(),
      type,
      price: priceNum,
      image: imageUrl,
      available: req.body.available !== "false" && req.body.available !== false,
      hasSizes: hasSizesBool,
      sizeType: finalSizeType,
      sizes: parsedSizes,
      halfFull: parsedHalfFull,
    });

    await food.save();

    // ✅ Emit socket event for real-time updates to all users
    const io = req.app.get("io");
    if (io && typeof io.emit === "function") {
      io.emit("newFoodAdded", food);
      console.log("➕ Emitted newFoodAdded event for food:", food._id);
    }

    res.status(201).json({
      success: true,
      message: "Food added successfully!",
      food,
    });
  } catch (err) {
    console.error("❌ Error adding food:", err);
    res.status(500).json({ success: false, message: "Failed to add food" });
  }
});

/* ================================
   ✏️ PUT - Update Food
================================ */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    // ✅ Ensure database connection
    const { connectDB } = await import("../config/db.js");
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const { id } = req.params;
    let updateData = { ...req.body };

    // ✅ Validation for type if provided
    if (updateData.type) {
      const validTypes = ["Veg", "Non-Veg", "Other"];
      if (!validTypes.includes(updateData.type)) {
        return res.status(400).json({
          success: false,
          message: "Type must be one of: Veg, Non-Veg, Other",
        });
      }
    }

    // ✅ Validation for price if provided
    if (updateData.price !== undefined) {
      const priceNum = Number(updateData.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a positive number",
        });
      }
      updateData.price = priceNum;
    }

    // ✅ Trim string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.category) updateData.category = updateData.category.trim();
    
    // ✅ Handle size options
    if (updateData.hasSizes === "true" || updateData.hasSizes === true) {
      updateData.hasSizes = true;
      
      // Parse sizes JSON if string
      if (typeof updateData.sizes === 'string') {
        try {
          updateData.sizes = JSON.parse(updateData.sizes);
        } catch (e) {
          console.error("Error parsing sizes JSON in update:", e);
          updateData.sizes = {};
        }
      }

      // Parse halfFull JSON if string
      if (typeof updateData.halfFull === 'string') {
        try {
          updateData.halfFull = JSON.parse(updateData.halfFull);
        } catch (e) {
          console.error("Error parsing halfFull JSON in update:", e);
          updateData.halfFull = {};
        }
      }

      if (updateData.sizes) {
        updateData.sizes = {
          Small: updateData.sizes.Small ? Number(updateData.sizes.Small) : null,
          Medium: updateData.sizes.Medium ? Number(updateData.sizes.Medium) : null,
          Large: updateData.sizes.Large ? Number(updateData.sizes.Large) : null,
        };
      }
      
      if (updateData.halfFull) {
        updateData.halfFull = {
          Half: updateData.halfFull.Half ? Number(updateData.halfFull.Half) : null,
          Full: updateData.halfFull.Full ? Number(updateData.halfFull.Full) : null,
        };
      }
    } else if (updateData.hasSizes === "false" || updateData.hasSizes === false) {
      updateData.hasSizes = false;
      updateData.sizes = {
        Small: null,
        Medium: null,
        Large: null,
      };
      updateData.halfFull = {
        Half: null,
        Full: null,
      };
    }

    // ✅ Upload new image if provided
    if (req.file) {
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const uploadResponse = await cloudinary.uploader.upload(base64, {
        folder: "tastebite_foods",
        resource_type: "auto",
      });
      updateData.image = uploadResponse.secure_url;
      console.log("✅ Updated image uploaded:", updateData.image);
    }

    const updatedFood = await Food.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedFood)
      return res.status(404).json({ success: false, message: "Food not found" });

    // ✅ Emit socket event for real-time updates to all users
    const io = req.app.get("io");
    if (io && typeof io.emit === "function") {
      io.emit("foodUpdated", updatedFood);
      console.log("🍽️ Emitted foodUpdated event for food:", updatedFood._id, "Available:", updatedFood.available);
    }

    res.status(200).json({
      success: true,
      message: "Food updated successfully",
      food: updatedFood,
    });
  } catch (err) {
    console.error("❌ Error updating food:", err);
    res.status(500).json({ success: false, message: "Failed to update food" });
  }
});

/* ================================
   🗑️ DELETE - Remove Food
================================ */
router.delete("/:id", async (req, res) => {
  try {
    // ✅ Ensure database connection
    const { connectDB } = await import("../config/db.js");
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const { id } = req.params;
    console.log("🗑️ DELETE request for food:", id); // ✅ Helpful for Render logs

    const food = await Food.findById(id);
    if (!food) {
      console.log("❌ Food not found in DB");
      return res.status(404).json({ success: false, message: "Food not found" });
    }

    // ✅ Delete Cloudinary image if exists
    if (food.image) {
      try {
        const publicId = food.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`tastebite_foods/${publicId}`);
        console.log(`🗑️ Deleted Cloudinary image: ${publicId}`);
      } catch (error) {
        console.warn("⚠️ Could not delete Cloudinary image:", error.message);
      }
    }

    await food.deleteOne();

    // ✅ Emit socket event for real-time updates to all users
    const io = req.app.get("io");
    if (io && typeof io.emit === "function") {
      io.emit("foodDeleted", id);
      console.log("🗑️ Emitted foodDeleted event for food:", id);
    }

    res.status(200).json({
      success: true,
      message: "Food deleted successfully",
    });
  } catch (err) {
    console.error("❌ Error deleting food:", err);
    res.status(500).json({ success: false, message: "Failed to delete food" });
  }
});

export default router;
