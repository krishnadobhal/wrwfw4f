const express = require('express');
const chapterController = require('../controllers/chapterController');
const router = express.Router();

// Admin authentication middleware
const isAdmin = (req, res, next) => {
  // Get token from header
  const token = req.header('x-admin-token');

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    // Verify token (in a real app, use JWT verification)
    if (token !== process.env.JWT_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.'
      });
    }

    // If token is valid, proceed
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token.'
    });
  }
};

// Routes
router
  .route('/')
  .get(chapterController.getAllChapters)
  .post(isAdmin, chapterController.uploadChapters);

router
  .route('/:id')
  .get(chapterController.getChapter);

module.exports = router;

