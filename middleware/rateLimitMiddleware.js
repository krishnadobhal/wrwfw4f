const IORedis = require('ioredis');
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const config = require('../config/config');
const { initRedisClient } = require('../utils/redisUtils');

// Create in-memory fallback limiter for when Redis is down
const memoryRateLimiter = new RateLimiterMemory({
  points: Math.floor(config.rateLimit.max / 3), // More restrictive when Redis is down
  duration: Math.floor(config.rateLimit.windowMs / 1000), // Convert ms to seconds
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
      duration: Math.floor(config.rateLimit.windowMs / 1000), // Convert ms to seconds
      blockDuration: config.rateLimit.windowMs / 1000, // Use same window for block duration
      insuranceLimiter: memoryRateLimiter
    });

    // API-specific rate limiter with doubled limits from config
    apiRateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: config.cache.prefix + 'rl:api:',
      points: config.rateLimit.max * 2, // Double the standard limit for API routes
      duration: Math.floor(config.rateLimit.windowMs / 1000),
      blockDuration: config.rateLimit.windowMs / 500, // Shorter block for API routes
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

// Middleware function that applies rate limiting
const rateLimiter = async (req, res, next) => {
  try {
    // If Redis limiter not available, use memory limiter
    const limiter = rateLimiterRedis || memoryRateLimiter;
    const key = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    
    const result = await limiter.consume(key);
    
    res.setHeader('X-RateLimit-Limit', limiter.points);
    res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());
    
    next();
  } catch (error) {
    if (error.remainingPoints !== undefined) {
      const limiter = rateLimiterRedis || memoryRateLimiter;
      res.setHeader('X-RateLimit-Limit', limiter.points);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + error.msBeforeNext).toISOString());
      res.setHeader('Retry-After', Math.ceil(error.msBeforeNext / 1000));
      
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(error.msBeforeNext / 1000)
      });
    }
    
    console.error('Rate limiting error:', error);
    next();
  }
};

// Middleware function for API endpoints
const apiLimiter = async (req, res, next) => {
  try {
    // If Redis limiter not available, use memory limiter
    const limiter = apiRateLimiter || memoryRateLimiter;
    const key = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    
    const result = await limiter.consume(key);
    
    res.setHeader('X-RateLimit-Limit', limiter.points);
    res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());
    
    next();
  } catch (error) {
    if (error.remainingPoints !== undefined) {
      const limiter = apiRateLimiter || memoryRateLimiter;
      res.setHeader('X-RateLimit-Limit', limiter.points);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + error.msBeforeNext).toISOString());
      res.setHeader('Retry-After', Math.ceil(error.msBeforeNext / 1000));
      
      return res.status(429).json({
        success: false,
        message: 'API rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(error.msBeforeNext / 1000)
      });
    }
    
    console.error('API rate limiting error:', error);
    next();
  }
};

module.exports = {
  rateLimiter,
  apiLimiter
};

