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
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for faster queries
chapterSchema.index({ subject: 1, class: 1, unit: 1 });
chapterSchema.index({ status: 1 });
chapterSchema.index({ isWeakChapter: 1 });

// Virtual for calculating total questions
chapterSchema.virtual('totalQuestions').get(function() {
  // Handle the case when yearWiseQuestionCount is not available or empty
  if (!this.yearWiseQuestionCount || this.yearWiseQuestionCount.size === 0) {
    return 0;
  }
  
  // Safely convert Map to array and sum values
  let total = 0;
  this.yearWiseQuestionCount.forEach((value) => {
    total += Number(value) || 0;
  });
  
  return total;
});

// Virtual for calculating completion percentage
chapterSchema.virtual('completionPercentage').get(function() {
  const totalQuestions = this.totalQuestions;
  if (totalQuestions === 0) return 0;
  
  return Math.round((this.questionSolved / totalQuestions) * 100);
});

// Pre-save middleware to update the status based on questionSolved
chapterSchema.pre('save', function(next) {
  const totalQuestions = this.totalQuestions;
  
  if (this.questionSolved === 0) {
    this.status = 'Not Started';
  } else if (this.questionSolved >= totalQuestions) {
    this.status = 'Completed';
  } else {
    this.status = 'In Progress';
  }
  
  this.updatedAt = Date.now();
  next();
});

// Create the Chapter model
const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;

