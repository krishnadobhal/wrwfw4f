const { createClient } = require('redis');

let redisClient;

const initRedisClient = async () => {
  try {
    if (!redisClient) {
      redisClient = createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
      });
      
      redisClient.on('error', err => console.error('Redis Client Error:', err));
      await redisClient.connect();
    }
    return redisClient;
  } catch (error) {
    console.error('Redis connection failed:', error);
    return null;
  }
};

module.exports = {
  initRedisClient
};

