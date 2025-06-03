const IORedis = require('ioredis');
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const config = require('../config/config');

// Redis client for rate limiting
let redisClient;

// Initialize Redis client
const initRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }

  // Create Redis client using configuration
  redisClient = new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    enableOfflineQueue: false,
  });

  // Handle connection events
  redisClient.on('error', (err) => {
    console.error('Redis Rate Limiter Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis Rate Limiter Connected');
  });

  return redisClient;
};

// Create in-memory fallback limiter for when Redis is down
const memoryRateLimiter = new RateLimiterMemory({
  points: 10, // More restrictive when Redis is down
  duration: 60, // Per minute
});

// Create rate limiter instance
const rateLimiterRedis = new RateLimiterRedis({
  storeClient: initRedisClient(),
  keyPrefix: 'rl:',
  points: process.env.RATE_LIMIT_MAX || 30, // Number of requests allowed
  duration: process.env.RATE_LIMIT_WINDOW_SECONDS || 60, // Per time window (in seconds)
  blockDuration: 60, // Block for 1 minute if limit exceeded
  // Use memory-based limiter as fallback when Redis is down
  insuranceLimiter: memoryRateLimiter
});

// Middleware function that applies rate limiting
const rateLimiter = async (req, res, next) => {
  try {
    // Use IP address as the key for rate limiting
    const key = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    
    // Check rate limit
    const result = await rateLimiterRedis.consume(key);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimiterRedis.points);
    res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());
    
    next();
  } catch (error) {
    // Rate limit exceeded
    if (error.remainingPoints !== undefined) {
      res.setHeader('X-RateLimit-Limit', rateLimiterRedis.points);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + error.msBeforeNext).toISOString());
      res.setHeader('Retry-After', Math.ceil(error.msBeforeNext / 1000));
      
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(error.msBeforeNext / 1000)
      });
    }
    
    // Redis connection error - proceed without rate limiting
    console.error('Rate limiting error:', error);
    next();
  }
};

// Create in-memory fallback limiter for API endpoints
const apiMemoryRateLimiter = new RateLimiterMemory({
  points: 20, // More restrictive when Redis is down
  duration: 60, // Per minute
});

// API-specific rate limiter with stricter limits
const apiRateLimiter = new RateLimiterRedis({
  storeClient: initRedisClient(),
  keyPrefix: 'rl:api:',
  points: 60, // 60 requests
  duration: 60, // per minute
  blockDuration: 120, // block for 2 minutes
  insuranceLimiter: apiMemoryRateLimiter
});

// Middleware function for API endpoints
const apiLimiter = async (req, res, next) => {
  try {
    const key = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    const result = await apiRateLimiter.consume(key);
    
    res.setHeader('X-RateLimit-Limit', apiRateLimiter.points);
    res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());
    
    next();
  } catch (error) {
    if (error.remainingPoints !== undefined) {
      res.setHeader('X-RateLimit-Limit', apiRateLimiter.points);
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

