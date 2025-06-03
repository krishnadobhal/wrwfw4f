const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { ErrorResponse } = require('./errorMiddleware');

/**
 * Middleware to protect routes that require admin access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.protect = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('x-admin-token') || 
                  req.header('authorization')?.replace('Bearer ', '') || 
                  req.query.token;

    // Check if token exists
    if (!token) {
      return next(new ErrorResponse('Access denied. Authentication token is required', 401));
    }

    // Simple token validation (for this assignment)
    if (token !== config.auth.adminToken) {
      return next(new ErrorResponse('Access denied. Invalid authentication token', 401));
    }

    // Add admin flag to request
    req.isAdmin = true;

    next();
  } catch (err) {
    next(new ErrorResponse('Authentication failed', 401));
  }
};

/**
 * Middleware for JWT token validation (for future implementation)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.jwtProtect = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('authorization')?.replace('Bearer ', '') || 
                  req.header('x-auth-token') || 
                  req.query.token;

    // Check if token exists
    if (!token) {
      return next(new ErrorResponse('Access denied. Authentication token is required', 401));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.auth.jwtSecret);
      
      // Add user info to request
      req.user = decoded;
      
      next();
    } catch (error) {
      return next(new ErrorResponse('Invalid token. Authentication failed', 401));
    }
  } catch (err) {
    next(new ErrorResponse('Authentication failed', 401));
  }
};

/**
 * Middleware to restrict access to certain roles (for future implementation)
 * @param  {...String} roles - Roles that are allowed to access the route
 * @returns {Function} - Express middleware function
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ErrorResponse('Unauthorized access', 403));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`Role ${req.user.role} is not authorized to access this route`, 403));
    }
    
    next();
  };
};

