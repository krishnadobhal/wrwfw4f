const { RateLimiterMemory } = require('rate-limiter-flexible');

const basicRateLimiter = new RateLimiterMemory({
  points: 30,
  duration: 5 * 60
});

// Main rate limiting function
async function checkRequestLimit(req, res, next) {
  // Get the user's IP address to track their requests
  const visitorIP = req.ip || '0.0.0.0';

  try {
    // Check if user can make another request
    const requestsRemaining = await basicRateLimiter.consume(visitorIP);

    res.set({
      'Requests-Remaining': requestsRemaining.remainingPoints,
      'Request-Limit': basicRateLimiter.points,
      'Request-Reset-Time': new Date(Date.now() + requestsRemaining.msBeforeNext)
    });

    next();

  } catch (error) {
    // User has made too many requests
    const timeToWait = Math.ceil(error.msBeforeNext / 1000);

    res.status(429).json({
      error: true,
      message: 'Please slow down! Too many requests.',
      waitForSeconds: timeToWait
    });
  }
}

module.exports = {
  rateLimiter: checkRequestLimit,
  apiLimiter: checkRequestLimit
};

