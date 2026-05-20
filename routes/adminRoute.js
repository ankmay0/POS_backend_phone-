import express from "express";
import {
  checkAdminStatus,
  getAllAdmins,
  addAdmin,
  removeAdmin,
} from "../controllers/adminController.js";

const router = express.Router();

// GET /api/admin/check - Check if user is admin
router.get("/check", checkAdminStatus);

// GET /api/admin/all - Get all admins (super admin only)
router.get("/all", getAllAdmins);

// POST /api/admin/add - Add admin (super admin only)
router.post("/add", addAdmin);

// DELETE /api/admin/remove - Remove admin (super admin only)
router.delete("/remove", removeAdmin);

export default router;

