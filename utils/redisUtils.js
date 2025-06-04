const { createClient } = require('redis');

let redisClient;

const initRedisClient = async () => {
  try {
    if (!redisClient) {
      // Try Redis Cloud first
      try {
        console.log('📡 Connecting to Redis...');
        redisClient = createClient({
          username: 'default',
          password: process.env.REDIS_PASSWORD || undefined,
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379
          }
        });

        // Set up event listeners
        redisClient.on('error', err => console.error('Redis Client Error:', err));
        redisClient.on('connect', () => console.log('Connected to Redis'));
        redisClient.on('reconnecting', () => console.log('Reconnecting to Redis...'));

        await redisClient.connect();
      } catch (error) {
        console.error('Redis connection failed:', error);
        redisClient = null;
        return null;
      }
    }
    return redisClient;
  } catch (error) {
    console.error('Unexpected error initializing Redis client:', error);
    redisClient = null;
    return null;
  }
};

module.exports = {
  initRedisClient
};

