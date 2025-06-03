const { createClient } = require('redis');
const { promisify } = require('util');
const { ErrorResponse } = require('../middleware/errorMiddleware');

/**
 * Redis Client Singleton
 */
let redisClient;

/**
 * Initialize Redis client and connect
 * @returns {Object} Redis client instance
 */
const initRedisClient = async () => {
  if (redisClient) {
    return redisClient;
  }

  try {
    // Create Redis client
    redisClient = createClient({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    // Handle Redis errors
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    // Connect to Redis
    await redisClient.connect();
    console.log('Redis client initialized and connected');
    
    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    // Return null but don't throw - allow app to work without caching
    return null;
  }
};

/**
 * Set a key in Redis with optional expiration
 * @param {string} key - The key to set
 * @param {any} value - The value to set (will be JSON stringified)
 * @param {number} expireInSeconds - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<boolean>} - Success status
 */
const setCache = async (key, value, expireInSeconds = 3600) => {
  try {
    if (!redisClient) {
      await initRedisClient();
      if (!redisClient) return false;
    }
    
    await redisClient.set(
      key, 
      JSON.stringify(value),
      {
        EX: expireInSeconds
      }
    );
    
    return true;
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
    return false;
  }
};

/**
 * Get a value from Redis by key
 * @param {string} key - The key to retrieve
 * @returns {Promise<any>} - The value (parsed from JSON) or null if not found
 */
const getCache = async (key) => {
  try {
    if (!redisClient) {
      await initRedisClient();
      if (!redisClient) return null;
    }
    
    const data = await redisClient.get(key);
    
    if (!data) {
      return null;
    }
    
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

/**
 * Delete a key from Redis
 * @param {string} key - The key to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteCache = async (key) => {
  try {
    if (!redisClient) {
      await initRedisClient();
      if (!redisClient) return false;
    }
    
    await redisClient.del(key);
    
    return true;
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
    return false;
  }
};

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Pattern to match keys (e.g., 'chapters:*')
 * @returns {Promise<boolean>} - Success status
 */
const deleteCacheByPattern = async (pattern) => {
  try {
    if (!redisClient) {
      await initRedisClient();
      if (!redisClient) return false;
    }
    
    const keys = await redisClient.keys(pattern);
    
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting cache for pattern ${pattern}:`, error);
    return false;
  }
};

/**
 * Clear the entire Redis cache
 * @returns {Promise<boolean>} - Success status
 */
const clearCache = async () => {
  try {
    if (!redisClient) {
      await initRedisClient();
      if (!redisClient) return false;
    }
    
    await redisClient.flushAll();
    console.log('Redis cache cleared');
    
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Create a cache key with consistent format
 * @param {string} prefix - Key prefix (e.g., 'chapters')
 * @param {Object} params - Parameters to include in the key
 * @returns {string} - Formatted cache key
 */
const createCacheKey = (prefix, params = {}) => {
  const paramString = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}:${value}`)
    .join(':');
    
  return `${prefix}${paramString ? ':' + paramString : ''}`;
};

/**
 * Cache middleware for Express routes
 * @param {number} duration - Cache duration in seconds
 * @returns {Function} - Express middleware function
 */
const cacheMiddleware = (duration = 3600) => {
  return async (req, res, next) => {
    try {
      if (!redisClient) {
        await initRedisClient();
        if (!redisClient) return next();
      }
      
      // Create a cache key based on the URL and query parameters
      const cacheKey = `route:${req.originalUrl}`;
      
      // Try to get cached response
      const cachedResponse = await getCache(cacheKey);
      
      if (cachedResponse) {
        console.log(`Serving from cache: ${cacheKey}`);
        return res.status(200).json(cachedResponse);
      }
      
      // Store the original send function
      const originalSend = res.send;
      
      // Override the send function to cache the response
      res.send = function(body) {
        // Only cache successful responses
        if (res.statusCode === 200) {
          try {
            const responseBody = JSON.parse(body);
            setCache(cacheKey, responseBody, duration);
          } catch (err) {
            console.error('Error caching response:', err);
          }
        }
        
        // Call the original send function
        originalSend.call(this, body);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

module.exports = {
  initRedisClient,
  setCache,
  getCache,
  deleteCache,
  deleteCacheByPattern,
  clearCache,
  createCacheKey,
  cacheMiddleware
};

