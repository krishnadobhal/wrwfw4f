const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { rateLimiter, apiLimiter } = require('./middleware/rateLimitMiddleware');
const { initRedisClient } = require('./utils/redisUtils');

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
app.use(rateLimiter);

// Initialize Redis client for caching
try {
  (async () => {
    try {
      const redisClient = await initRedisClient();
      if (redisClient) {
        redisClient.on('error', (err) => {
          console.error('Redis Client Error:', err);
          console.log('Cache will not be available, but API will still function');
        });
        console.log('Connected to Redis for caching');
      }
    } catch (err) {
      console.error('Redis connection error:', err);
      console.log('API will function without Redis caching');
    }
  })();
} catch (outerErr) {
  console.error('Unexpected error during Redis setup:', outerErr);
}

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
  console.error('Error:', err);  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: {}
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export app for testing
module.exports = app;

