import express from "express";
import Offer from "../models/offerModel.js";
import { connectDB } from "../config/db.js";
import mongoose from "mongoose";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Configure Cloudinary (using existing configuration)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// GET /api/offers - Get all offers (public)
router.get("/", async (req, res) => {
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const offers = await Offer.find().sort({ createdAt: -1 });
    res.status(200).json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch offers",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/offers/active - Get only active offers (for homepage)
router.get("/active", async (req, res) => {
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const now = new Date();
    const offers = await Offer.find({
      active: true,
      $or: [
        { validUntil: { $exists: false } }, // No expiry date
        { validUntil: null }, // No expiry date
        { validUntil: { $gte: now } }, // Not expired
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    console.error("Error fetching active offers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active offers",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// POST /api/offers - Create new offer (admin only)
router.post("/", upload.single("image"), async (req, res) => {
  try {
    // Check if admin request
    const isAdmin = req.query.admin === "true" || req.headers["x-admin-request"] === "true";
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const { title, description, active, validFrom, validUntil } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    let imageUrl = null;

    // Upload image to Cloudinary if provided
    if (req.file) {
      try {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        const uploadResult = await cloudinary.uploader.upload(dataURI, {
          folder: "offers",
          resource_type: "auto",
        });

        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Error uploading image to Cloudinary:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
        });
      }
    }

    // Create offer
    const offer = new Offer({
      title,
      description,
      image: imageUrl,
      active: active === "true" || active === true,
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined,
    });

    await offer.save();

    res.status(201).json({
      success: true,
      message: "Offer created successfully",
      offer,
    });
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create offer",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// PUT /api/offers/:id - Update offer (admin only)
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    // Check if admin request
    const isAdmin = req.query.admin === "true" || req.headers["x-admin-request"] === "true";
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const { id } = req.params;
    const { title, description, active, validFrom, validUntil } = req.body;

    const updateData = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (active !== undefined) updateData.active = active === "true" || active === true;
    if (validFrom) updateData.validFrom = new Date(validFrom);
    if (validUntil) updateData.validUntil = new Date(validUntil);

    // Upload new image if provided
    if (req.file) {
      try {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        const uploadResult = await cloudinary.uploader.upload(dataURI, {
          folder: "offers",
          resource_type: "auto",
        });

        updateData.image = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Error uploading image to Cloudinary:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
        });
      }
    }

    const offer = await Offer.findByIdAndUpdate(id, updateData, { new: true });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      offer,
    });
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update offer",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// DELETE /api/offers/:id - Delete offer (admin only)
router.delete("/:id", async (req, res) => {
  try {
    // Check if admin request
    const isAdmin = req.query.admin === "true" || req.headers["x-admin-request"] === "true";
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required.",
      });
    }

    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const { id } = req.params;
    const offer = await Offer.findByIdAndDelete(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
      deletedOfferId: id,
    });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete offer",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;
