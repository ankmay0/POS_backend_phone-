import Cart from "../models/cartModel.js";
import { getCache, setCache, invalidateCache, CACHE_KEYS, CACHE_TTL } from "../utils/cache.js";

// Get user's cart
export const getCart = async (req, res) => {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "userEmail is required" });
    }

    // Try to get from cache first
    const cacheKey = `${CACHE_KEYS.CART}${userEmail}`;
    const cachedCart = await getCache(cacheKey);
    if (cachedCart !== null) {
      console.log("✅ Serving cart from cache");
      return res.status(200).json({ cart: cachedCart });
    }

    let cart = await Cart.findOne({ userEmail });

    if (!cart) {
      // Return empty cart if not found
      return res.status(200).json({ cart: [] });
    }

    // Cache the result
    await setCache(cacheKey, cart.items || [], CACHE_TTL.CART);
    console.log(`✅ Cart cached for ${CACHE_TTL.CART} seconds`);

    res.status(200).json({ cart: cart.items || [] });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ message: "Failed to fetch cart", error: error.message });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const { userEmail, userId, userName, foodId, foodName, category, type, quantity, price, image, selectedSize } = req.body;

    console.log("📦 Add to cart request:", { userEmail, foodId, foodName, price, selectedSize });

    if (!userEmail || !foodId || !foodName || !price) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let cart = await Cart.findOne({ userEmail });

    if (!cart) {
      // Create new cart
      cart = new Cart({
        userEmail,
        userId: userId || "",
        userName: userName || "Guest User",
        items: [],
      });
    }

    // Check if item already exists in cart (same foodId and same size)
    const size = selectedSize && ["Small", "Medium", "Large"].includes(selectedSize) 
      ? selectedSize 
      : null;
    
    const existingItemIndex = cart.items.findIndex(
      (item) => item.foodId === foodId && item.selectedSize === size
    );

    if (existingItemIndex >= 0) {
      // Update quantity if item exists with same size
      cart.items[existingItemIndex].quantity += quantity || 1;
    } else {
      // Add new item (different size or new item)
      const newItem = {
        foodId,
        foodName,
        category: category || "Uncategorized",
        type: type || "Veg",
        quantity: quantity || 1,
        price,
        image: image || "",
      };
      
      // Only add selectedSize if it's a valid value
      if (size) {
        newItem.selectedSize = size;
      }
      
      cart.items.push(newItem);
    }

    await cart.save();

    // ✅ Invalidate cart cache
    const cacheKey = `${CACHE_KEYS.CART}${userEmail}`;
    await invalidateCache(cacheKey);

    console.log("✅ Item added to cart successfully");

    res.status(200).json({ 
      message: "Item added to cart successfully",
      cart: cart.items 
    });
  } catch (error) {
    console.error("❌ Error adding to cart:", error);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    res.status(500).json({ 
      message: "Failed to add item to cart", 
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};

// Update item quantity in cart
export const updateCartItem = async (req, res) => {
  try {
    const { userEmail, foodId, quantity } = req.body;

    if (!userEmail || !foodId || quantity === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    const cart = await Cart.findOne({ userEmail });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex((item) => item.foodId === foodId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    // ✅ Invalidate cart cache
    const cacheKey = `${CACHE_KEYS.CART}${userEmail}`;
    await invalidateCache(cacheKey);

    res.status(200).json({ 
      message: "Cart item updated successfully",
      cart: cart.items 
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ message: "Failed to update cart", error: error.message });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    // Support both body (Axios DELETE with data) and query params
    const { userEmail, foodId } = req.body || req.query;

    if (!userEmail || !foodId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const cart = await Cart.findOne({ userEmail });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter((item) => item.foodId !== foodId);
    await cart.save();

    // ✅ Invalidate cart cache
    const cacheKey = `${CACHE_KEYS.CART}${userEmail}`;
    await invalidateCache(cacheKey);

    res.status(200).json({ 
      message: "Item removed from cart successfully",
      cart: cart.items 
    });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ message: "Failed to remove item from cart", error: error.message });
  }
};

// Clear entire cart
export const clearCart = async (req, res) => {
  try {
    // Support both body (Axios DELETE with data) and query params
    const { userEmail } = req.body || req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "userEmail is required" });
    }

    const cart = await Cart.findOne({ userEmail });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = [];
    await cart.save();

    // ✅ Invalidate cart cache
    const cacheKey = `${CACHE_KEYS.CART}${userEmail}`;
    await invalidateCache(cacheKey);

    res.status(200).json({ 
      message: "Cart cleared successfully",
      cart: [] 
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ message: "Failed to clear cart", error: error.message });
  }
};

