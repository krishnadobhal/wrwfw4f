const config = require('../config/config');
const { ErrorResponse } = require('./errorMiddleware');

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

