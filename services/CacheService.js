/**
 * Cache Service
 * Handles caching operations (abstraction for Redis)
 */
export class CacheService {
  constructor(redisClient = null) {
    this.redis = redisClient;
    this.enabled = !!redisClient;
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.enabled) return null;
    
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = 60) {
    if (!this.enabled) return false;
    
    try {
      await this.redis.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Invalidate cache key
   */
  async invalidate(key) {
    if (!this.enabled) return false;
    
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache invalidate error:', error.message);
      return false;
    }
  }

  /**
   * Check if cache is enabled
   */
  isEnabled() {
    return this.enabled;
  }
}
