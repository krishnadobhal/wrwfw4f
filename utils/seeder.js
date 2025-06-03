const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { createClient } = require('redis');
const Chapter = require('../models/chapterModel');

// Load environment variables
dotenv.config();

// Connect to Redis
const redisClient = createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD || undefined,
});

// Parse command line arguments
const args = process.argv.slice(2);
const deleteAll = args.includes('--delete');
const filePath = args.find(arg => arg.startsWith('--file='))?.split('=')[1] || 'all_subjects_chapter_data.json';

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Function to clear the cache
const clearCache = async () => {
  try {
    await redisClient.connect();
    await redisClient.flushAll();
    console.log('Redis cache cleared');
  } catch (error) {
    console.error('Error clearing Redis cache:', error.message);
    // Continue even if Redis is not available
  }
};

// Function to import data
const importData = async () => {
  try {
    // Connect to the database
    await connectDB();
    
    // Clear Redis cache
    await clearCache();
    
    // Read the JSON file
    const dataPath = path.join(process.cwd(), filePath);
    console.log(`Reading data from ${dataPath}`);
    
    const jsonData = fs.readFileSync(dataPath, 'utf-8');
    const chapters = JSON.parse(jsonData);
    
    if (!Array.isArray(chapters)) {
      throw new Error('The JSON file does not contain an array of chapters');
    }
    
    console.log(`Found ${chapters.length} chapters in the file`);
    
    // Delete existing data if --delete flag is provided
    if (deleteAll) {
      console.log('Deleting existing chapters...');
      await Chapter.deleteMany({});
      console.log('All chapters deleted successfully');
    }
    
    // Track successful and failed uploads
    const results = {
      success: [],
      failed: []
    };
    
    // Import each chapter
    console.log('Importing chapters...');
    
    for (const chapterData of chapters) {
      try {
        // Convert yearWiseQuestionCount to Map format expected by Mongoose
        const yearWiseMap = new Map();
        if (chapterData.yearWiseQuestionCount) {
          Object.entries(chapterData.yearWiseQuestionCount).forEach(([year, count]) => {
            yearWiseMap.set(year, count);
          });
          chapterData.yearWiseQuestionCount = yearWiseMap;
        }
        
        // Create a new chapter
        const chapter = new Chapter(chapterData);
        await chapter.save();
        results.success.push(chapter.chapter);
      } catch (err) {
        results.failed.push({
          chapter: chapterData.chapter,
          error: err.message
        });
      }
    }
    
    console.log('\nImport Summary:');
    console.log(`Successfully imported: ${results.success.length} chapters`);
    console.log(`Failed to import: ${results.failed.length} chapters`);
    
    if (results.failed.length > 0) {
      console.log('\nFailed chapters:');
      results.failed.forEach(failure => {
        console.log(`- ${failure.chapter}: ${failure.error}`);
      });
    }
    
    // Disconnect from MongoDB
    console.log('\nDisconnecting from MongoDB...');
    await mongoose.disconnect();
    
    // Disconnect from Redis
    try {
      await redisClient.quit();
    } catch (error) {
      // Ignore Redis errors on disconnect
    }
    
    console.log('Import process completed');
    
  } catch (error) {
    console.error('\nError in import process:', error.message);
    process.exit(1);
  }
};

// Run the import function
importData();

// Display help text for command line usage
const displayHelp = () => {
  console.log(`
  Database Seeder Utility
  -----------------------
  
  Usage:
    node utils/seeder.js [options]
    
  Options:
    --delete     Delete all existing chapters before importing
    --file=PATH  Specify a custom file path for the JSON data
    --help       Display this help text
    
  Examples:
    node utils/seeder.js
    node utils/seeder.js --delete
    node utils/seeder.js --file=custom_data.json
  `);
  process.exit(0);
};

// Display help if requested
if (args.includes('--help')) {
  displayHelp();
}

