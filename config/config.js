const dotenv = require('dotenv');
const path = require('path');

dotenv.config();


const checkRequiredEnvs = (requiredEnvs) => {
  const missing = requiredEnvs.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('Required environment variables are missing:', missing.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
};

const requiredEnvs = [
  'MONGO_URI',
  'JWT_SECRET'
];

checkRequiredEnvs(requiredEnvs);

// Configuration object
const config = {  server: {
    port: parseInt(process.env.PORT) || 3000
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
    host: process.env.REDIS_HOST ,
    port: parseInt(process.env.REDIS_PORT) ,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    adminToken: process.env.JWT_SECRET
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 30,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Cache configuration
  cache: {
    duration: parseInt(process.env.CACHE_DURATION) || 3600,
    prefix: 'mathongo:',
    enabled: process.env.CACHE_ENABLED !== 'false'
  }
};

// Export the configuration
module.exports = config;

