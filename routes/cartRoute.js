import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../controllers/cartController.js";

const router = express.Router();

// GET /api/cart - Get user's cart
router.get("/", getCart);

// POST /api/cart/add - Add item to cart
router.post("/add", addToCart);

// PUT /api/cart/update - Update item quantity
router.put("/update", updateCartItem);

// DELETE /api/cart/remove - Remove item from cart
router.delete("/remove", removeFromCart);

// DELETE /api/cart/clear - Clear entire cart
router.delete("/clear", clearCart);

export default router;

