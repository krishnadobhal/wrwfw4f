const config = require('../config/config');
const { ErrorResponse } = require('./errorMiddleware');

exports.protect = (req, res, next) => {
  // Extract token from headers or query string
  const token = req.header('x-admin-token') || 
                req.header('authorization')?.replace('Bearer ', '') || 
                req.query.token;

  // Validate token
  if (!token || token !== config.auth.adminToken) {
    return next(new ErrorResponse(
      !token ? 'Authentication token is required' : 'Invalid authentication token', 
      401
    ));
  }

  // Mark request as admin authenticated
  req.isAdmin = true;
  next();
};

