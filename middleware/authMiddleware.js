const config = require('../config/config');
const { ErrorResponse } = require('./errorMiddleware');

exports.protect = (req, res, next) => {
  const token = req.header('x-admin-token') || 
                req.header('authorization')?.replace('Bearer ', '') || 
                req.query.token;

  if (!token || token !== config.auth.adminToken) {
    return next(new ErrorResponse(
      !token ? 'Authentication token is required' : 'Invalid authentication token', 
      401
    ));
  }

  req.isAdmin = true;
  next();
};

