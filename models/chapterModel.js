const mongoose = require('mongoose');

// Define the Chapter schema
const chapterSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'A chapter must have a subject'],
    trim: true
  },
  chapter: {
    type: String,
    required: [true, 'A chapter must have a name'],
    trim: true,
    unique: true
  },
  class: {
    type: String,
    required: [true, 'A chapter must belong to a class'],
    trim: true,
    enum: ['Class 11', 'Class 12']
  },
  unit: {
    type: String,
    required: [true, 'A chapter must belong to a unit'],
    trim: true
  },
  yearWiseQuestionCount: {
    type: Map,
    of: Number,
    default: {}
  },
  questionSolved: {
    type: Number,
    default: 0,
    min: [0, 'Question solved count cannot be negative']
  },
  status: {
    type: String,
    required: true,
    enum: ['Not Started', 'In Progress', 'Completed'],
    default: 'Not Started'
  },
  isWeakChapter: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create the Chapter model
const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;

