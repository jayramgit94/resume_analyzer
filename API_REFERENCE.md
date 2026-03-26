# Resume Analyzer - Complete API Reference & Data Contracts

**Last Updated**: 2026-03-26  
**API Version**: v1  
**Base URL**: `http://localhost:8000` (local) | `https://resume-analyzer.vercel.app` (production)

---

## 🔑 Authentication

### JWT Token Format

All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

**JWT Payload Structure:**
```json
{
  "user_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "role": "user|admin",
  "exp": 1711468800
}
```

**Token Details:**
- Algorithm: `HS256`
- Expiry: 24 hours
- Secret: `JWT_SECRET` env variable
- Stored in: `localStorage` or `httpOnly cookie`

---

## 📝 API Endpoints

### **Authentication Routes** (`/api/auth/*`)

#### 1. Register User
```http
POST /register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "username": "john_doe"
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "username": "john_doe",
    "role": "user",
    "created_at": "2026-03-26T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "User registered successfully"
}
```

**Error: 400 Bad Request**
```json
{
  "success": false,
  "error": "Email already registered",
  "code": "EMAIL_EXISTS"
}
```

**Validation Rules:**
- Email: Must be valid email format, unique
- Password: Min 8 chars, at least 1 uppercase, 1 number
- Username: 3-50 chars, alphanumeric + underscore

---

#### 2. Login User
```http
POST /login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "username": "john_doe",
    "role": "user",
    "created_at": "2026-03-26T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

**Error: 401 Unauthorized**
```json
{
  "success": false,
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS"
}
```

---

#### 3. Get Current User (Protected)
```http
GET /user
Authorization: Bearer <JWT_TOKEN>
```

**Response: 200 OK**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "username": "john_doe",
    "role": "user",
    "profile": {
      "full_name": "John Doe",
      "job_title": "Software Engineer",
      "avatar_url": "https://..."
    },
    "created_at": "2026-03-26T10:30:00Z",
    "updated_at": "2026-03-26T15:45:00Z"
  }
}
```

**Error: 401 Unauthorized**
```json
{
  "success": false,
  "error": "Invalid or expired token",
  "code": "INVALID_TOKEN"
}
```

---

#### 4. Logout User (Protected)
```http
POST /logout
Authorization: Bearer <JWT_TOKEN>
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### **Resume Routes** (`/api/resume/*`)

#### 1. Analyze Resume (Protected)
```http
POST /analyze
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data

file: <PDF binary file>
```

**File Requirements:**
- Format: PDF only
- Max size: 10MB
- Min size: 10KB

**Response: 200 OK**
```json
{
  "success": true,
  "analysis": {
    "_id": "507f1f77bcf86cd799439012",
    "user_id": "507f1f77bcf86cd799439011",
    "file_name": "resume.pdf",
    "created_at": "2026-03-26T10:35:00Z",
    
    "algorithm_score": 75,
    "badge": "silver",
    
    "analysis": {
      "strengths": [
        "Strong technical background with 5+ years of experience",
        "Proficient in multiple programming languages",
        "Clear action-oriented language in accomplishments"
      ],
      "weaknesses": [
        "Lacks quantifiable metrics in some achievements",
        "Missing specific tools/frameworks mentioned",
        "Could improve formatting consistency"
      ],
      "missing_keywords": [
        "Cloud computing (AWS, Azure, GCP)",
        "CI/CD pipelines",
        "Leadership experience",
        "System design"
      ],
      "suggestions": [
        "Add specific project metrics (e.g., 'Improved API performance by 40%')",
        "Include cloud platform certifications",
        "Highlight team leadership or mentorship experiences",
        "Add relevant industry keywords from job descriptions"
      ],
      "hr_questions": [
        "Tell me about your most challenging project and how you solved it?",
        "Can you describe your experience with cloud technologies?",
        "How do you approach learning new technologies?",
        "Tell me about a time you led a team or mentored someone?",
        "What are your long-term career goals?"
      ],
      "tips": [
        "DO: Use metrics and percentages for achievements",
        "DO: Include industry-specific keywords from your target jobs",
        "DON'T: Use personal pronouns (I, me, my)",
        "DON'T: Include photos or graphics (unless creative role)",
        "DON'T: Exceed 1 page for entry-level, 2 pages for experienced"
      ]
    },
    
    "metadata": {
      "word_count": 487,
      "has_experience": true,
      "has_education": true,
      "detected_skills": ["python", "java", "react", "aws"],
      "estimated_years_experience": 5
    }
  }
}
```

**Error: 400 Bad Request**
```json
{
  "success": false,
  "error": "Invalid file format. Please upload a PDF.",
  "code": "INVALID_FILE_FORMAT"
}
```

**Error: 413 Payload Too Large**
```json
{
  "success": false,
  "error": "File size exceeds 10MB limit",
  "code": "FILE_TOO_LARGE"
}
```

**Scoring Algorithm Breakdown:**
```
Total: 0-100 points

- Skills detection: +3 per skill (max 20)
  Skills: python, java, c++, machine learning, sql, aws, react
  
- Metrics extraction: +4 per metric (max 20)
  Looks for: percentages (%), years (+)
  
- Years of experience: +5 per mention (max 20)
  Pattern: \d+ years
  
- Action verbs: +2 per verb (max 10)
  Verbs: developed, built, designed, implemented, optimized
  
- Word count: 0-15 points
  >300 words: +15
  >200 words: +10
  <200 words: 0
  
- Section presence: +15 points
  Must have both "experience" and "education"
  
- Final: min(total, 100)
```

---

#### 2. Get Resume History (Protected)
```http
GET /history?limit=50&offset=0
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Pagination offset (default: 0)
- `sort`: `date_asc | date_desc` (default: date_desc)

**Response: 200 OK**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "file_name": "resume_v1.pdf",
      "algorithm_score": 75,
      "badge": "silver",
      "created_at": "2026-03-26T10:35:00Z",
      "summary": {
        "total_strengths": 3,
        "total_weaknesses": 3,
        "missing_keywords_count": 4
      }
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "file_name": "resume_v2.pdf",
      "algorithm_score": 82,
      "badge": "silver",
      "created_at": "2026-03-25T14:20:00Z",
      "summary": {
        "total_strengths": 4,
        "total_weaknesses": 2,
        "missing_keywords_count": 3
      }
    }
  ],
  "metadata": {
    "total_count": 12,
    "best_score": 82,
    "avg_score": 73.5,
    "improvement_percentage": 9.3
  }
}
```

---

#### 3. Get Specific Analysis (Protected)
```http
GET /analysis/{resumeId}
Authorization: Bearer <JWT_TOKEN>
```

**Response: 200 OK**
```json
{
  "success": true,
  "analysis": {
    "_id": "507f1f77bcf86cd799439012",
    "user_id": "507f1f77bcf86cd799439011",
    "file_name": "resume.pdf",
    "algorithm_score": 75,
    "badge": "silver",
    "created_at": "2026-03-26T10:35:00Z",
    "analysis": { /* full analysis object */ },
    "metadata": { /* metadata */ }
  }
}
```

**Error: 404 Not Found**
```json
{
  "success": false,
  "error": "Resume analysis not found",
  "code": "NOT_FOUND"
}
```

---

#### 4. Delete Resume Analysis (Protected)
```http
DELETE /analysis/{resumeId}
Authorization: Bearer <JWT_TOKEN>
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Resume analysis deleted successfully"
}
```

**Error: 404 Not Found**
```json
{
  "success": false,
  "error": "Resume not found",
  "code": "NOT_FOUND"
}
```

**Error: 403 Forbidden**
```json
{
  "success": false,
  "error": "You can only delete your own analyses",
  "code": "PERMISSION_DENIED"
}
```

---

### **Admin Routes** (`/api/admin/*`)

#### 1. Get Platform Statistics (Admin Only)
```http
GET /admin/stats
Authorization: Bearer <JWT_TOKEN>
```

**Requires:** `role === "admin"`

**Response: 200 OK**
```json
{
  "success": true,
  "stats": {
    "total_users": 127,
    "total_resumes_analyzed": 892,
    "avg_score": 71.5,
    "score_distribution": {
      "gold": 142,
      "silver": 389,
      "bronze": 261,
      "none": 100
    },
    "daily_analyses": [
      {
        "date": "2026-03-26",
        "count": 45
      },
      {
        "date": "2026-03-25",
        "count": 38
      }
    ],
    "top_skills_detected": [
      {
        "skill": "python",
        "frequency": 234
      },
      {
        "skill": "react",
        "frequency": 189
      },
      {
        "skill": "aws",
        "frequency": 156
      }
    ],
    "gemini_api_usage": {
      "total_calls": 892,
      "failed_calls": 12,
      "avg_latency_ms": 2450
    }
  }
}
```

**Error: 403 Forbidden**
```json
{
  "success": false,
  "error": "Admin access required",
  "code": "FORBIDDEN"
}
```

---

#### 2. List All Users (Admin Only)
```http
GET /admin/users?page=1&limit=20
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search by email/username
- `role`: Filter by role (user, admin)

**Response: 200 OK**
```json
{
  "success": true,
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "email": "john@example.com",
      "username": "john_doe",
      "role": "user",
      "created_at": "2026-03-20T10:30:00Z",
      "resume_count": 5,
      "avg_score": 74.2,
      "last_analysis": "2026-03-26T10:35:00Z",
      "status": "active"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "email": "admin@example.com",
      "username": "admin_user",
      "role": "admin",
      "created_at": "2026-01-01T00:00:00Z",
      "resume_count": 0,
      "status": "active"
    }
  ],
  "pagination": {
    "total": 127,
    "page": 1,
    "limit": 20,
    "pages": 7
  }
}
```

---

#### 3. Ban/Unban User (Admin Only)
```http
POST /admin/users/{userId}/ban
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "action": "ban",
  "reason": "Spam activity detected"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "status": "banned",
    "banned_at": "2026-03-26T12:00:00Z",
    "ban_reason": "Spam activity detected"
  },
  "message": "User banned successfully"
}
```

---

#### 4. Get API Logs (Admin Only)
```http
GET /admin/logs?limit=100&level=error
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `limit`: Number of logs (default: 100)
- `level`: Log level (error, warning, info)
- `endpoint`: Filter by endpoint
- `start_date`: ISO date filter
- `end_date`: ISO date filter

**Response: 200 OK**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2026-03-26T10:35:00Z",
      "level": "error",
      "endpoint": "POST /analyze",
      "error": "PDF parsing failed: corrupted file",
      "user_id": "507f1f77bcf86cd799439011",
      "status_code": 400
    },
    {
      "timestamp": "2026-03-26T10:30:00Z",
      "level": "error",
      "endpoint": "POST /analyze",
      "error": "Gemini API rate limit exceeded",
      "user_id": "507f1f77bcf86cd799439012",
      "status_code": 503
    }
  ],
  "metadata": {
    "total_errors": 156,
    "errors_today": 3,
    "critical_errors": 1
  }
}
```

---

## 🔄 Common Response Patterns

### Success Response
```json
{
  "success": true,
  "data": { /* actual data */ },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": { /* optional: more info */ }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

---

## 🔢 HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful registration, POST |
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Missing/invalid JWT token |
| 403 | Forbidden | User doesn't have permission (not admin) |
| 404 | Not Found | Resource doesn't exist |
| 413 | Payload Too Large | File size exceeds limit |
| 500 | Server Error | Unexpected server error |
| 503 | Service Unavailable | Database/API down |

---

## 🔄 Data Contracts

### User Object
```typescript
interface User {
  _id: ObjectId;
  email: string;                      // unique, lowercase
  username: string;                   // unique, 3-50 chars
  password_hash: string;              // bcrypt format
  role: "user" | "admin";
  profile: {
    full_name?: string;
    job_title?: string;
    avatar_url?: string;
  };
  created_at: Date;
  updated_at: Date;
  status: "active" | "banned" | "suspended";
}
```

### Resume Analysis Object
```typescript
interface ResumeAnalysis {
  _id: ObjectId;
  user_id: ObjectId;
  file_name: string;
  file_path: string;
  raw_text: string;                   // full resume text
  algorithm_score: number;            // 0-100
  badge: "gold" | "silver" | "bronze" | null;
  
  analysis: {
    strengths: string[];              // array of 3-5 items
    weaknesses: string[];             // array of 3-5 items
    missing_keywords: string[];       // array of 4-6 items
    suggestions: string[];            // array of 4-6 items
    hr_questions: string[];           // exactly 5 questions
    tips: string[];                   // array of 6-8 tips
  };
  
  metadata: {
    word_count: number;
    has_experience: boolean;
    has_education: boolean;
    detected_skills: string[];        // lowercase
    estimated_years_experience: number;
  };
  
  created_at: Date;
  updated_at: Date;
}
```

---

## 🧪 Example Requests (cURL)

### Register
```bash
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "username": "john_doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Analyze Resume
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@resume.pdf"
```

### Get History
```bash
curl -X GET "http://localhost:8000/history?limit=10" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Admin Stats
```bash
curl -X GET http://localhost:8000/admin/stats \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## ⏱️ Rate Limits (Future Implementation)

**Current**: No rate limiting (open)

**Recommended**:
- `/register`: 5 requests per hour per IP
- `/login`: 10 requests per hour per IP
- `/analyze`: 5 requests per hour per user
- `/admin/*`: 100 requests per hour per admin

---

## 🔐 Error Handling Codes

| Code | Meaning |
|------|---------|
| `INVALID_CREDENTIALS` | Wrong email/password |
| `EMAIL_EXISTS` | Email already registered |
| `INVALID_TOKEN` | JWT invalid or expired |
| `INVALID_FILE_FORMAT` | Not a PDF |
| `FILE_TOO_LARGE` | Exceeds 10MB |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `GEMINI_ERROR` | AI analysis failed |
| `DB_ERROR` | Database operation failed |
| `INTERNAL_ERROR` | Unexpected server error |

---

## 📌 Frontend Integration Example

```javascript
// Example: Analyze Resume
import axios from 'axios';

async function uploadAndAnalyze(file, token) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      'http://localhost:8000/analyze',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return response.data.analysis;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('Token expired, redirect to login');
    } else if (error.response?.status === 400) {
      console.error('Invalid file format');
    } else {
      console.error('Server error:', error.message);
    }
  }
}
```

---

**Version History:**
- v1.0 (2026-03-26): Initial API documentation

**Last Reviewed**: 2026-03-26  
**Next Review**: 2026-04-26
