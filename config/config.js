const dotenv = require('dotenv');
const path = require('path');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// Load environment variables from .env file
dotenv.config();

/**
 * Check if required environment variables are present
 * @param {Array} requiredEnvs - Array of required environment variable names
 */
const checkRequiredEnvs = (requiredEnvs) => {
  const missing = requiredEnvs.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ Required environment variables are missing:', missing.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
};

// List of required environment variables
const requiredEnvs = [
  'MONGO_URI',
  'JWT_SECRET'
];

// Check for required environment variables
checkRequiredEnvs(requiredEnvs);

// Configuration object
const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development',
    isDev: (process.env.NODE_ENV || 'development') === 'development',
    isProd: process.env.NODE_ENV === 'production'
  },
  
  // Database configuration
  db: {
    uri: process.env.MONGO_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    adminToken: process.env.ADMIN_TOKEN || process.env.JWT_SECRET
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX) || 30, // 30 requests per minute
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Cache configuration
  cache: {
    duration: parseInt(process.env.CACHE_DURATION) || 3600, // 1 hour in seconds
    prefix: 'mathongo:',
    enabled: process.env.CACHE_ENABLED !== 'false'
  },
  
  // Multer file upload configuration
  fileUpload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/json'],
    uploadDir: path.join(process.cwd(), 'uploads')
  },
  
  // Email configuration (for future use)
  email: {
    from: process.env.EMAIL_FROM || 'noreply@mathongo.com',
    smtp: {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    }
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'dev'
  }
};

// Export the configuration
module.exports = config;

