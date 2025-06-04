const { createClient } = require('redis');

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
    return null;
  }
};

module.exports = {
  initRedisClient
};

