# Chapter Performance Dashboard API

A RESTful API-based backend for a Chapter Performance Dashboard. This application simulates real-world backend requirements such as API design, data filtering, caching, and performance optimization.


### Live API Endpoints

The API is available at two live endpoints:
- Primary endpoint: `http://13.235.48.218:3000/api/v1/chapters`
- Secondary endpoint: `https://wrwfw4f.onrender.com/api/v1/chapters/`

You can test the API functionality using these live endpoints.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
- [API Endpoints](#api-endpoints)
  - [Get All Chapters](#get-all-chapters)
  - [Get a Specific Chapter](#get-a-specific-chapter)
  - [Upload Chapters](#upload-chapters)
- [Performance Features](#performance-features)
  - [Redis Caching](#redis-caching)
  - [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)

## Project Overview

This project implements a backend API for a Chapter Performance Dashboard, allowing users to:
- View performance data for academic chapters across various subjects
- Filter chapters based on different criteria
- Upload new chapter data (admin only)

The system uses MongoDB for data storage, Redis for caching, and Express.js for the API layer.

## Features

- **RESTful API**: Well-structured API endpoints following RESTful principles
- **Data Filtering**: Filter chapters by class, unit, status, weak chapters, and subject
- **Pagination**: Limit the number of results returned per request
- **Caching**: Redis-based caching to improve performance
- **Rate Limiting**: Protect the API from abuse with in-memory rate limiting
- **Admin Authentication**: Simple token-based authentication for admin routes
- **Error Handling**: Comprehensive error handling and consistent error responses
- **Validation**: Input validation for all API endpoints

## Technologies Used

- **Node.js**: JavaScript runtime
- **Express.js**: Web framework for Node.js
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB object modeling for Node.js
- **Redis**: In-memory data store for caching
- **Multer**: Middleware for handling file uploads
- **Helmet**: Security middleware for Express
- **CORS**: Cross-origin resource sharing middleware
- **Dotenv**: Environment variable management
- **Express Rate Limit**: Rate limiting middleware for Express

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or remote instance)
- Redis (local or remote instance)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/mathongo.git
   cd mathongo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install nodemon globally (optional):
   ```bash
   npm install -g nodemon
   ```

### Environment Configuration

1. Create a `.env` file in the root directory using the provided template:
   ```
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # MongoDB Configuration
   MONGO_URI=mongodb://localhost:27017/mathongo

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=

   # Authentication
   JWT_SECRET=mathongo_secret_key
   JWT_EXPIRES_IN=1d

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX=30

   # Cache Configuration
   CACHE_DURATION=3600
   ```

2. Adjust the values to match your environment.

3. Start the server:
   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints


### Get All Chapters

```
GET /api/v1/chapters
```

**Query Parameters**:
- `class`: Filter by class (e.g., "Class 11", "Class 12")
- `unit`: Filter by unit (e.g., "Mechanics 1", "Physical Chemistry")
- `status`: Filter by status (e.g., "Not Started", "In Progress", "Completed")
- `weakChapters`: Filter weak chapters (set to "true")
- `subject`: Filter by subject (e.g., "Physics", "Chemistry", "Mathematics")
- `page`: Page number for pagination (default: 1)
- `limit`: Number of results per page (default: 10)

**Example**:
```
GET /api/v1/chapters?subject=Physics&class=Class%2011&weakChapters=true&page=1&limit=10
```

**Response**:
```json
{
  "success": true,
  "count": 5,
  "totalChapters": 15,
  "totalPages": 2,
  "currentPage": 1,
  "data": [
    {
      "_id": "60f1b2e3c8a4d92a3c8a4d92",
      "subject": "Physics",
      "chapter": "Motion In One Dimension",
      "class": "Class 11",
      "unit": "Mechanics 1",
      "yearWiseQuestionCount": {
        "2019": 2,
        "2020": 10,
        "2021": 6,
        "2022": 7,
        "2023": 0,
        "2024": 2,
        "2025": 6
      },
      "questionSolved": 33,
      "status": "Completed",
      "isWeakChapter": true
    },
    // more chapters...
  ]
}
```

### Get a Specific Chapter

```
GET /api/v1/chapters/:id
```

**Example**:
```
GET /api/v1/chapters/60f1b2e3c8a4d92a3c8a4d92
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "60f1b2e3c8a4d92a3c8a4d92",
    "subject": "Physics",
    "chapter": "Motion In One Dimension",
    "class": "Class 11",
    "unit": "Mechanics 1",
    "yearWiseQuestionCount": {
      "2019": 2,
      "2020": 10,
      "2021": 6,
      "2022": 7,
      "2023": 0,
      "2024": 2,
      "2025": 6
    },
    "questionSolved": 33,
    "status": "Completed",
    "isWeakChapter": true
  }
}
```

### Upload Chapters

```
POST /api/v1/chapters
```

**Headers**:
- `x-admin-token`: Admin authentication token (required, value is your JWT_SECRET from .env)
- `authorization`: Alternatively, use `Bearer <token>` (token is your JWT_SECRET)
- Or as a query parameter: `?token=YOUR_JWT_SECRET`
- `Content-Type`: multipart/form-data

**Body**:
- `chaptersFile`: JSON file containing an array of chapter objects

**Chapter Format**:
Each chapter in the JSON file should follow this format:
```json
{
  "subject": "Physics",
  "chapter": "Motion In One Dimension",
  "class": "Class 11",
  "unit": "Mechanics 1",
  "yearWiseQuestionCount": {
    "2019": 2,
    "2020": 10,
    "2021": 6,
    "2022": 7,
    "2023": 0,
    "2024": 2,
    "2025": 6
  },
  "questionSolved": 33,
  "isWeakChapter": true
}
```

**Admin Authentication Details**:
- The admin token is required for uploading chapters.
- The token value is set to the value of `JWT_SECRET` in your `.env` file.
- You can provide the token in one of three ways:
  1. As the `x-admin-token` header
  2. As a Bearer token in the `authorization` header
  3. As a `token` query parameter

**Example using cURL**:
```bash
curl -X POST \
  -H "x-admin-token: $JWT_SECRET" \
  -F "chaptersFile=@new_chapters.json" \
  http://localhost:3000/api/v1/chapters
# Or using Bearer token:
curl -X POST \
  -H "Authorization: Bearer $JWT_SECRET" \
  -F "chaptersFile=@new_chapters.json" \
  http://localhost:3000/api/v1/chapters
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully uploaded 10 chapters. 2 chapters failed.",
  "successCount": 10,
  "failCount": 2,
  "failedChapters": [
    {
      "chapter": "Invalid Chapter",
      "error": "Chapter validation failed: subject: A chapter must have a subject"
    },
    {
      "chapter": "Duplicate Chapter",
      "error": "E11000 duplicate key error collection: mathongo.chapters index: chapter_1 dup key: { chapter: \"Duplicate Chapter\" }"
    }
  ]
}
```

## Performance Features

### Redis Caching

- The `/api/v1/chapters` endpoint responses are cached in Redis for 1 hour
- Unique cache keys are generated based on query parameters
- Cache is invalidated when new chapters are added
- Caching can be configured through the `CACHE_DURATION` environment variable

### Rate Limiting

- API endpoints are protected by rate limiting (30 requests per minute per IP)
- Rate limiting is implemented using express-rate-limit with in-memory storage
- Rate limit configuration can be adjusted through the following environment variables:
  - `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds (default: 60000 - 1 minute)
  - `RATE_LIMIT_MAX`: Maximum number of requests per window (default: 30)

## Error Handling

The API uses a consistent error handling approach:

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing or invalid authentication
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side errors

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message describing what went wrong",
  "error": {
    // Additional error details (development mode only)
  }
}
```

---

## License

This project is licensed under the ISC License.

