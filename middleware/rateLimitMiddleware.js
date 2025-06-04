const IORedis = require('ioredis');
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const config = require('../config/config');
const { initRedisClient } = require('../utils/redisUtils');

// Create in-memory fallback limiter for when Redis is down
const memoryRateLimiter = new RateLimiterMemory({
  points: Math.floor(config.rateLimit.max / 3), 
  duration: Math.floor(config.rateLimit.windowMs / 1000), 
});

// Initialize rate limiters
let rateLimiterRedis;
let apiRateLimiter;

// Initialize Redis client and rate limiters
const initRateLimiters = async () => {
  try {
    const redisClient = await initRedisClient();
    
    if (!redisClient) {
      console.warn('Redis client not available, using memory rate limiter');
      return false;
    }

    // Create rate limiter instance using config values
    rateLimiterRedis = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: config.cache.prefix + 'rl:',
      points: config.rateLimit.max,
      duration: Math.floor(config.rateLimit.windowMs / 1000), 
      blockDuration: config.rateLimit.windowMs / 1000, 
      insuranceLimiter: memoryRateLimiter
    });

    // API-specific rate limiter with doubled limits from config
    apiRateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: config.cache.prefix + 'rl:api:',
      points: config.rateLimit.max * 2, 
      duration: Math.floor(config.rateLimit.windowMs / 1000),
      blockDuration: config.rateLimit.windowMs / 500, 
      insuranceLimiter: memoryRateLimiter
    });

    return true;
  } catch (err) {
    console.error('Failed to initialize rate limiters:', err);
    return false;
  }
};

// Initialize rate limiters immediately
initRateLimiters();

// Generic rate limiting middleware creator
const createRateLimiter = (limiterInstance, errorMessage) => async (req, res, next) => {
  try {
    const limiter = limiterInstance || memoryRateLimiter;
    const key = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    const result = await limiter.consume(key);
    
    res.setHeader('X-RateLimit-Limit', limiter.points);
    res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());
    
    next();
  } catch (error) {
    if (error.remainingPoints !== undefined) {
      const limiter = limiterInstance || memoryRateLimiter;
      const retryAfter = Math.ceil(error.msBeforeNext / 1000);
      
      res.setHeader('X-RateLimit-Limit', limiter.points);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + error.msBeforeNext).toISOString());
      res.setHeader('Retry-After', retryAfter);
      
      return res.status(429).json({
        success: false,
        message: errorMessage,
        retryAfter
      });
    }
    console.error('Rate limiting error:', error);
    next();
  }
};

// Create middleware instances
const rateLimiter = createRateLimiter(rateLimiterRedis, 'Too many requests. Please try again later.');
const apiLimiter = createRateLimiter(apiRateLimiter, 'API rate limit exceeded. Please try again later.');

module.exports = {
  rateLimiter,
  apiLimiter
};

