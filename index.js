const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { createClient } = require('redis');
const { rateLimiter, apiLimiter } = require('./middleware/rateLimitMiddleware');

// Load environment variables
dotenv.config();

// Import routes
const chapterRoutes = require('./routes/chapterRoutes');

// Initialize Express app
const app = express();

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Apply Redis-based rate limiting to all routes
// Skip for the root route in development
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development' && req.originalUrl === '/') {
    return next();
  }
  rateLimiter(req, res, next);
});

// Set up Redis client for caching (separate from rate limiting)
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: process.env.REDIS_PASSWORD || undefined,
});

// Connect to Redis (for caching only, not rate limiting)
(async () => {
  try {
    // Handle Redis connection errors
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      console.log('Cache will not be available, but API will still function');
    });
    
    // Connect to Redis
    await redisClient.connect();
    console.log('Connected to Redis for caching');
  } catch (err) {
    console.error('Redis connection error:', err);
    console.log('API will function without Redis caching');
  }
})();

// API routes
// Apply API-specific rate limiter to API routes
app.use('/api/v1', apiLimiter);
app.use('/api/v1/chapters', chapterRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Chapter Performance Dashboard API'
  });
});

// 404 Error Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export app for testing
module.exports = app;

