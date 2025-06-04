const Chapter = require('../models/chapterModel');
const { initRedisClient } = require('../utils/redisUtils'); // Import the util
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter for JSON files only
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/json') {
    cb(null, true);
  } else {
    cb(new Error('Only JSON files are allowed'), false);
  }
};

// Initialize upload middleware
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).single('chaptersFile');

// Create uploads directory if it doesn't exist
try {
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }
} catch (err) {
  console.error('Error creating uploads directory:', err);
}

// Helper to get Redis client (singleton)
let redisClientPromise = null;
async function getRedisClient() {
  if (!redisClientPromise) {
    redisClientPromise = initRedisClient();
  }
  return redisClientPromise;
}

// Get all chapters with filtering, pagination, and caching
exports.getAllChapters = async (req, res, next) => {
  try {
    const { class: className, unit, status, subject, page = 1, limit = 10, weakChapters } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const cacheKey = `chapters:${className || ''}:${unit || ''}:${status || ''}:${subject || ''}:${weakChapters}:${page}:${limit}`;

    // Try to get from cache
    const redisClient = await getRedisClient();
    if (redisClient) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) return res.status(200).json(JSON.parse(cachedData));
      } catch (err) {}
    }

    // Build filter
    const filter = Object.entries({ class: className, unit, status, subject })
      .reduce((acc, [key, value]) => value ? { ...acc, [key]: value } : acc, {});
    if (weakChapters === 'true') filter.isWeakChapter = true;

    // Get data and total count
    const [chapters, totalChapters] = await Promise.all([
      Chapter.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ subject: 1, unit: 1, chapter: 1 }),
      Chapter.countDocuments(filter)
    ]);

    const response = {
      success: true,
      count: chapters.length,
      totalChapters,
      totalPages: Math.ceil(totalChapters / parseInt(limit)),
      currentPage: parseInt(page),
      data: chapters
    };

    // Cache response
    if (redisClient) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(response), {
          EX: parseInt(process.env.CACHE_DURATION) || 3600
        });
      } catch (err) {}
    }

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

// Get a specific chapter by ID
exports.getChapter = async (req, res, next) => {
  try {
    const redisClient = await getRedisClient();
    const cacheKey = `chapter:${req.params.id}`;

    // Check if the chapter is cached
    let cachedChapter = null;
    if (redisClient) {
      try {
        cachedChapter = await redisClient.get(cacheKey);
      } catch (err) {
        console.error('Redis get error:', err);
      }
    }
    if (cachedChapter) {
      console.log('Serving chapter from cache');
      return res.status(200).json({
        success: true,
        data: JSON.parse(cachedChapter),
      });
    }

    // Fetch the chapter from the database
    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    // Cache the chapter data
    if (redisClient) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(chapter), {
          EX: parseInt(process.env.CACHE_DURATION) || 3600,
        });
      } catch (err) {
        console.error('Redis set error:', err);
      }
    }

    res.status(200).json({
      success: true,
      data: chapter,
    });
  } catch (err) {
    next(err);
  }
};

// Upload chapters from a JSON file (admin only)
exports.uploadChapters = (req, res, next) => {
  upload(req, res, async function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Multer error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a JSON file'
      });
    }
    
    let filePath;
    try {
      filePath = path.join(process.cwd(), req.file.path);
      const fileData = fs.readFileSync(filePath, 'utf8');
      let chapters;
      
      try {
        chapters = JSON.parse(fileData);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON format'
        });
      }
      
      if (!Array.isArray(chapters)) {
        return res.status(400).json({
          success: false,
          message: 'JSON content must be an array of chapters'
        });
      }
      
      // Track successful and failed uploads
      const uploadResults = {
        success: [],
        failed: []
      };
      
      // Process each chapter
      for (const chapterData of chapters) {
        try {
          // Create a new chapter document
          const chapter = new Chapter(chapterData);
          await chapter.save();
          uploadResults.success.push(chapter);
        } catch (chapterError) {
          uploadResults.failed.push({
            chapter: chapterData.chapter,
            error: chapterError.message
          });
        }
      }
      
      // Clean up the uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.error('Error deleting uploaded file:', unlinkErr);
      }
      
      // Invalidate the cache for chapters
      try {
        const redisClient = await getRedisClient();
        if (redisClient) {
          const keys = await redisClient.keys('chapters:*');
          if (keys.length > 0) {
            await redisClient.del(keys);
          }
        }
      } catch (redisErr) {
        console.error('Error invalidating Redis cache:', redisErr);
      }
      
      res.status(200).json({
        success: true,
        message: `Successfully uploaded ${uploadResults.success.length} chapters. ${uploadResults.failed.length} chapters failed.`,
        successCount: uploadResults.success.length,
        failCount: uploadResults.failed.length,
        failedChapters: uploadResults.failed
      });
    } catch (err) {
      // Clean up the uploaded file if an error occurred
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error('Error deleting uploaded file after failure:', unlinkErr);
        }
      }
      next(err);
    }
  });
};

