/**
 * Simple In-Memory Cache (No Redis Required)
 * Uses JavaScript Map for caching
 */

// In-memory cache storage
const cache = new Map();

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  FOODS: 1800, // 30 minutes
  ORDERS: 60, // 1 minute
  CART: 600, // 10 minutes
  ADMIN: 600, // 10 minutes
};

// Cache key prefixes
const CACHE_KEYS = {
  FOODS: "foods:all",
  FOOD: "food:",
  ORDERS: "orders:all",
  ORDER: "order:",
  CART: "cart:",
  ADMINS: "admins:all",
  ADMIN: "admin:",
};

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Cached data or null
 */
export const getCache = async (key) => {
  try {
    const item = cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if cache expired
    if (Date.now() > item.expiresAt) {
      cache.delete(key);
      return null;
    }
    
    return item.data;
  } catch (error) {
    console.error(`❌ Error getting cache for key ${key}:`, error.message);
    return null;
  }
};

/**
 * Set cached data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} - Success status
 */
export const setCache = async (key, data, ttl = 300) => {
  try {
    cache.set(key, {
      data,
      expiresAt: Date.now() + (ttl * 1000),
    });
    return true;
  } catch (error) {
    console.error(`❌ Error setting cache for key ${key}:`, error.message);
    return false;
  }
};

/**
 * Delete cached data
 * @param {string} key - Cache key or pattern
 * @returns {Promise<boolean>} - Success status
 */
export const deleteCache = async (key) => {
  try {
    // Check if key contains wildcard
    if (key.includes("*")) {
      // Delete allkeys matching pattern
      const pattern = key.replace(/\*/g, '.*');
      const regex = new RegExp(pattern);
      
      for (const [cacheKey] of cache) {
        if (regex.test(cacheKey)) {
          cache.delete(cacheKey);
        }
      }
    } else {
      cache.delete(key);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error deleting cache for key ${key}:`, error.message);
    return false;
  }
};

/**
 * Invalidate cache after data modification
 * @param {string|string[]} keys - Cache key(s) to invalidate
 */
export const invalidateCache = async (keys) => {
  try {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    
    for (const key of keysArray) {
      await deleteCache(key);
      if (process.env.NODE_ENV !== 'production') {
        // Cache invalidated
      }
    }
  } catch (error) {
    console.error("❌ Error invalidating cache:", error);
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  cache.clear();
  // All cache cleared
};

/**
 * Get cache stats
 */
export const getCacheStats = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
};

// Auto-cleanup expired cache every 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, item] of cache) {
    if (now > item.expiresAt) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0 && process.env.NODE_ENV !== 'production') {
    // Cleaned expired cache entries
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Export cache keys and TTL for use in controllers
export { CACHE_KEYS, CACHE_TTL };
