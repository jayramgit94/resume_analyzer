# AI Resume Analyzer - System Design Document

**Version:** 1.0  
**Author:** Senior Developer  
**Date:** 2026  
**Status:** Production-Ready

---

## 📋 Executive Summary

**Resume Analyzer** is a full-stack SaaS platform that leverages AI (Google Gemini) to provide intelligent resume evaluation, ATS compatibility scoring, and interview preparation. The system enables users to upload PDF resumes, receive algorithmic + AI-powered analysis, track improvements over time, and access interview prep materials.

**Key Value Proposition:**
- Real-time resume scoring (0-100 scale)
- AI-powered insights (strengths, weaknesses, missing keywords)
- Auto-generated tailored interview questions
- Progress tracking with historical analytics
- Admin dashboard for platform management

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  (React 19 + Vite + TypeScript | Tailwind CSS + Lucide)        │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐│
│  │  Authentication │  │  Dashboard       │  │  Admin Panel    ││
│  │  Pages          │  │  (Analysis/Hist) │  │  (Management)   ││
│  └─────────────────┘  └──────────────────┘  └─────────────────┘│
│                                                                   │
│  ┌─ Auth Context ─┐  ┌─ Theme Context ─┐                       │
│  │ (JWT Token)    │  │ (Dark/Light)     │                       │
│  └────────────────┘  └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                           │
                    HTTP/REST API
                    (Axios)
                           │
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                            │
│                  (FastAPI + CORS)                               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           FastAPI Application                            │   │
│  │  - Lifespan Management (MongoDB Connect/Close)          │   │
│  │  - Request Middleware (DB Connection Pool)              │   │
│  │  - Error Handling & JSONRPC Response Format             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                      │                      │
         ├──────────────────────┼──────────────────────┤
         │                      │                      │
    AUTH ROUTER            RESUME ROUTER         ADMIN ROUTER
    (JWT/bcrypt)          (Analysis Engine)      (Management)
         │                      │                      │
┌────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                        │
│                                                                  │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐   │
│  │ PDF Parser   │  │ ATS Calculator │  │ Gemini AI Proxy │   │
│  │ (pypdf)      │  │ (Algorithm)     │  │ (Analysis Gen)  │   │
│  └──────────────┘  └────────────────┘  └─────────────────┘   │
└────────────────────────────────────────────────────────────────┘
         │
┌────────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                      │
│         (MongoDB Atlas + Motor Async Driver)                   │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ users       │  │ resumes      │  │ Session/Analytics  │   │
│  │ Collection  │  │ Collection   │  │ (Optional)         │   │
│  └─────────────┘  └──────────────┘  └────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
         │
    Cloud Provider
    (MongoDB Atlas / Google Cloud / AWS)
```

---

## 📊 Data Models

### **1. Users Collection**
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  username: String,
  password_hash: String (bcrypt),
  role: String (enum: "user" | "admin"),
  created_at: ISODate,
  updated_at: ISODate,
  profile: {
    full_name: String,
    job_title: String,
    avatar_url: String
  }
}
```

### **2. Resumes Collection**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (indexed),
  file_name: String,
  file_path: String,
  raw_text: String,
  created_at: ISODate (indexed),
  
  // Analysis Results
  algorithm_score: Number (0-100),
  analysis: {
    strengths: [String],
    weaknesses: [String],
    missing_keywords: [String],
    suggestions: [String],
    hr_questions: [String],
    tips: [String]
  },
  
  // Metadata
  word_count: Number,
  has_experience: Boolean,
  has_education: Boolean,
  detected_skills: [String],
  badge: String (enum: "gold" | "silver" | "bronze" | null)
}
```

### **3. Collections Indexes**
| Collection | Index      | Unique | Purpose                |
|-----------|-----------|--------|----------------------|
| users     | email     | Yes    | User lookup/auth     |
| resumes   | user_id   | No     | User's resume list   |
| resumes   | created_at| No     | Timeline/history     |

---

## 🔄 Core Workflows

### **Workflow 1: Resume Analysis (Main Feature)**

```
User Authentication
    ↓
[User uploads PDF]
    ↓
PDF Extraction (pypdf)
    ├─ Extract raw text
    └─ Count words
    ↓
Parallel Processing (async)
    ├─ Algorithm Score Calculation
    │   ├─ Skill detection (Python, Java, etc.)
    │   ├─ Metrics extraction (Years exp, %)
    │   ├─ Action verbs count
    │   ├─ Section presence check
    │   ├─ Word count evaluation
    │   └─ Scoring logic (0-100)
    │
    └─ Gemini AI Analysis
        ├─ Prompt engineering (structured JSON)
        ├─ Generate strengths/weaknesses
        ├─ Identify missing keywords
        ├─ Create suggestions
        ├─ Generate 5 HR interview questions
        └─ Provide actionable tips
    ↓
Badge Assignment
    ├─ Score 90-100 → Gold
    ├─ Score 70-89  → Silver
    ├─ Score 50-69  → Bronze
    └─ Score <50    → None
    ↓
[Save to MongoDB - resumes collection]
    ↓
[Return complete analysis to frontend]
    ↓
[Display results with visualizations]
```

### **Workflow 2: User Authentication**

```
[User submits email/password]
    ↓
Validation
    ├─ Email format check
    ├─ Password strength
    └─ Existing user check
    ↓
[Registration Path]
    ├─ Hash password (bcrypt: 10 rounds)
    ├─ Create user document
    ├─ Save to MongoDB
    └─ Return success
    ↓
[Login Path]
    ├─ Find user by email
    ├─ Verify password (bcrypt compare)
    ├─ Generate JWT token
    │   ├─ Payload: user_id, email, role, exp
    │   ├─ Secret: JWT_SECRET
    │   ├─ Algorithm: HS256
    │   └─ Expiry: 24 hours
    ├─ Set token in httpOnly cookie
    └─ Return user data
    ↓
[Protected Routes]
    └─ Verify JWT on every request
        ├─ Extract token
        ├─ Validate signature
        ├─ Check expiry
        └─ Attach user to request context
```

### **Workflow 3: History & Progress Tracking**

```
[Authenticated User]
    ↓
[Requests: GET /user/resume-history]
    ↓
[Query resumes collection]
    ├─ Filter by user_id
    ├─ Sort by created_at (descending)
    └─ Return last 50 analyses
    ↓
[Frontend displays:]
    ├─ Timeline of scores
    ├─ Improvement trends (Recharts)
    ├─ Current best score
    ├─ Badge progression
    └─ Previous analysis details
    ↓
[User can compare versions]
    └─ Click on historical entry
        ├─ View old analysis
        ├─ See keyword changes
        └─ Track strength areas
```

### **Workflow 4: Admin Dashboard**

```
[Admin User logs in]
    ↓
[Verify role == "admin"]
    ↓
[Admin Dashboard loads]
    ├─ Total Users (count)
    ├─ Total Resumes Analyzed (count)
    ├─ Average Score (aggregate)
    ├─ Usage Analytics
    │   ├─ Resumes analyzed per day (chart)
    │   ├─ Score distribution (histogram)
    │   └─ Top verified skills
    ├─ User Management
    │   ├─ List all users
    │   ├─ Ban/unban users
    │   └─ View user activity
    └─ Logs & Monitoring
        ├─ API errors
        ├─ Gemini API errors
        └─ Auth failures
```

---

## 🔐 Security Architecture

| Layer | Mechanism | Implementation |
|-------|-----------|-----------------|
| **Transport** | HTTPS/TLS | All routes over HTTPS (Vercel) |
| **Authentication** | JWT + HttpOnly Cookies | 24-hour expiry, HS256 algorithm |
| **Password** | bcrypt (10 rounds) | $2b$ hash format, salted |
| **CORS** | Whitelist Origins | Allow frontend domain only |
| **Authorization** | Role-based (RBAC) | "user" vs "admin" roles |
| **Database** | Connection pooling | Motor async driver (safe for Vercel) |
| **API** | Input validation | Pydantic models |
| **Rate Limiting** | Message Queue (optional) | Prevent API abuse |
| **Secrets** | Environment variables | Never hardcoded |

---

## 🚀 API Endpoints Reference

### **Auth Routes** (`/backend/routes_auth.py`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/register` | ❌ | Register new user |
| POST | `/login` | ❌ | Login & get JWT |
| POST | `/logout` | ✅ | Clear session |
| GET | `/user` | ✅ | Get current user profile |

### **Resume Routes** (`/backend/routes_resume.py`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/analyze` | ✅ | Upload & analyze resume |
| GET | `/history` | ✅ | Get user's resume history |
| GET | `/analysis/{id}` | ✅ | Get specific analysis |
| DELETE | `/analysis/{id}` | ✅ | Delete resume record |

### **Admin Routes** (`/backend/routes_admin.py`)

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| GET | `/admin/users` | ✅ | admin | List all users |
| GET | `/admin/stats` | ✅ | admin | Platform analytics |
| POST | `/admin/users/{id}/ban` | ✅ | admin | Ban user |
| GET | `/admin/logs` | ✅ | admin | API error logs |

---

## 🎯 Component Hierarchy (Frontend)

```
App.jsx
├── Navbar
│   ├── Logo
│   ├── Nav Links (dynamic by role)
│   ├── Theme Toggle
│   └── User Menu
├── Routes
│   ├── <ProtectedRoute>
│   │   └── UserDashboard/
│   │       ├── ResumeUpload
│   │       ├── AnalysisSections
│   │       │   ├── ATSScoreCard
│   │       │   ├── Strengths/Weaknesses
│   │       │   └── Suggestions
│   │       ├── InterviewQuestions
│   │       └── History (with Recharts)
│   │
│   ├── <AdminRoute>
│   │   └── AdminDashboard/
│   │       ├── Stats Cards
│   │       ├── Charts
│   │       ├── User Manager
│   │       └── Logs Viewer
│   │
│   ├── Login/
│   └── Register/
│
├── Context Providers
│   ├── AuthContext (JWT, user, logout)
│   └── ThemeContext (dark/light mode)
└── UI Components (Tailwind + Lucide)
```

---

## 💾 Database Schema (NoSQL - MongoDB)

### **Collections Structure**

```
resume_analyzer (Database)
├── users
│   └── email (index, unique)
│   └── role
│   └── created_at
│
├── resumes
│   ├── user_id (index)
│   ├── created_at (index)
│   ├── algorithm_score
│   ├── analysis (nested object)
│   └── file metadata
│
└── (Optional: sessions, logs, analytics)
```

### **Query Patterns**

```python
# User lookup
await db.users.find_one({"email": "user@example.com"})

# User's resume history (sorted, paginated)
await db.resumes.find({"user_id": user_id})
    .sort("created_at", -1)
    .skip(0).limit(50)
    .to_list(None)

# Platform analytics
await db.resumes.aggregate([
    {"$group": {"_id": None, "avg_score": {"$avg": "$algorithm_score"}}},
])

# User count
await db.users.count_documents({})
```

---

## 🔄 Request/Response Flow Example

### **Resume Analysis Request**

```
CLIENT:
POST /analyze (protected)
Headers: Authorization: Bearer <JWT_TOKEN>
Body: FormData {
  file: <PDF binary>
}

↓

SERVER (FastAPI):
1. Middleware: Verify JWT token
2. Route handler: receive UploadFile
3. Extract text: pypdf.PdfReader
4. Calculate score: algorithm
5. Call Gemini API: analysis
6. Validate Gemini response: strict JSON parsing
7. Save to MongoDB: resumes collection
8. Return analysis object

← RESPONSE:
{
  "success": true,
  "analysis": {
    "algorithm_score": 75,
    "analysis": {
      "strengths": [...],
      "weaknesses": [...],
      "missing_keywords": [...],
      "suggestions": [...],
      "hr_questions": [...],
      "tips": [...]
    },
    "badge": "silver",
    "created_at": "2026-03-26T10:30:00Z"
  }
}

CLIENT:
Display results with animations
Store in React state
Update history view
Show badge
```

---

## 🛠️ Technology Stack Details

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend Framework** | React | 19 | UI rendering, hooks |
| **Build Tool** | Vite | 7 | Fast bundling, HMR |
| **Styling** | Tailwind CSS | 4 + @tailwindcss/vite | Utility-first CSS |
| **Icons** | Lucide React | 0.574 | SVG icons |
| **Routing** | React Router | 7 | Client-side navigation |
| **HTTP Client** | Axios | 1.13 | API requests, interceptors |
| **Charts** | Recharts | 3 | Data visualization |
| **Backend Framework** | FastAPI | 0.129 | Async ASGI framework |
| **Python Runtime** | Python | 3.9+ | Backend language |
| **Database** | MongoDB Atlas | Latest | NoSQL, cloud hosted |
| **Async Driver** | Motor | 3.7 | Async MongoDB (Vercel safe) |
| **Authentication** | PyJWT | Latest | JWT token creation |
| **Password Hash** | bcrypt | 5.0 | Secure password storage |
| **PDF Parsing** | pypdf | Latest | Extract text from PDF |
| **AI/ML API** | Google Gemini | 2.5-flash | Resume analysis |
| **Deployment** | Vercel | Latest | Serverless platform |
| **Environment** | python-dotenv | Latest | Config management |

---

## 🚀 Deployment Architecture

```
GitHub Repository
    ↓
Vercel (Automatic CI/CD)
    ├─ Frontend Build: npm run build
    │   └─ Output: dist/ → Vercel CDN (Static)
    │
    ├─ Serverless Functions: api/index.py
    │   └─ FastAPI app as Edge/Serverless function
    │
    └─ Environment Variables
        ├─ GEMINI_API_KEY
        ├─ MONGO_URI
        └─ JWT_SECRET

External Services:
├─ MongoDB Atlas (production DB)
├─ Google Cloud (Gemini API)
└─ Optional: SendGrid (email), S3 (file storage)

Monitoring:
├─ Vercel Analytics
├─ MongoDB Atlas Alerts
└─ Error Tracking (optional: Sentry)
```

---

## 📈 Scalability Considerations

### **Current State (MVP)**
- Single MongoDB instance
- Simple JWT auth (no refresh token rotation)
- No caching layer
- Synchronous Gemini API calls
- No rate limiting

### **Future Optimizations**
1. **Caching**: Redis for frequently accessed resumes
2. **Message Queue**: Celery/RabbitMQ for async Gemini calls
3. **Database**: Sharding by user_id for horizontal scaling
4. **API Rate Limiting**: Implement token bucket algorithm
5. **Load Balancing**: Multiple Vercel regions
6. **CDN**: CloudFlare for static assets
7. **Session Store**: Redis instead of JWT-only
8. **Search**: Elasticsearch for advanced resume queries

---

## 🧪 Testing Strategy

### **Unit Tests** (pytest)
```python
test_auth.py
├─ test_register_user
├─ test_login_valid
├─ test_login_invalid
└─ test_password_hashing

test_resume.py
├─ test_pdf_extraction
├─ test_score_calculation
└─ test_gemini_parsing

test_database.py
├─ test_connection_pool
└─ test_index_creation
```

### **Integration Tests**
```bash
# Full workflow tests
test_complete_auth_flow()
test_resume_upload_analysis()
test_history_retrieval()
```

### **Frontend Tests** (Vitest/Playwright)
```javascript
test_auth_context.test.jsx
test_dashboard.test.jsx
test_form_validation.test.jsx
```

---

## 🎓 How It Works: End-to-End Example

### **Scenario: Job seeker uploads resume**

1. **User navigates to app** → App checks JWT token → Redirects to login if missing
2. **User logs in** → Password hashed with bcrypt → JWT created (24h expiry) → Stored in httpOnly cookie
3. **User clicks "Analyze Resume"** → File upload component opens
4. **User selects PDF** → Frontend validates file type and size
5. **File submitted** → POST /analyze with JWT in Authorization header
6. **Server validates JWT** → Extracts user_id from token payload
7. **PDF parsed** → Text extracted using pypdf library
8. **Parallel processing**:
   - **Algorithm score**: Regex patterns find skills, metrics, verbs, word count → Score calculated (0-100)
   - **AI analysis**: Gemini API receives resume text + structured prompt → Receives JSON response
9. **Badge assigned**: Score 75 → "silver" badge
10. **Data saved**: MongoDB insert into resumes collection with all analysis
11. **Response sent**: Complete analysis object returned to frontend
12. **Frontend displays**: Score card, strengths/weaknesses sections, interview questions, history updated
13. **Historical tracking**: User can compare with previous analyses to see progress

---

## ⚠️ Known Limitations & Trade-offs

| Issue | Current Approach | Future Solution |
|-------|------------------|-----------------|
| **Async Gemini calls** | Synchronous (blocking) | Message queue (async processing) |
| **Serverless cold starts** | Affects first request latency | Warm-up schedules, always-on instances |
| **No caching** | Repeated analyses = API calls | Redis cache layer |
| **Single PDF format** | Only PDF supported | Add .docx, .txt parsing |
| **No resume versioning** | Latest replaces old | Store versioned documents |
| **Event loop issues** | Manual reconnect logic | Native async ORM |

---

## 📞 Support & Maintenance

### **Error Handling Strategy**
- **Try-catch** on all async operations
- **Gemini API failures** → Return mock analysis with explanation
- **MongoDB down** → Return 503 with retry message
- **Invalid JWT** → Return 401 Unauthorized
- **PDF parsing errors** → Return 400 Bad Request with details

### **Monitoring Points**
```python
# Log all Gemini API calls
# Track resume analysis latency
# Monitor MongoDB connection pool
# Alert on JWT validation failures
# Track error rates per endpoint
```

---

## 📝 Summary

This **AI Resume Analyzer** is a production-ready SaaS application that combines algorithmic analysis with AI-powered insights. It demonstrates:

✅ **Modern stack**: React + FastAPI + MongoDB  
✅ **Enterprise auth**: JWT + bcrypt  
✅ **Async patterns**: Motor driver for serverless compatibility  
✅ **Scalable architecture**: Ready for horizontal scaling  
✅ **User experience**: Real-time analysis + progress tracking  
✅ **Admin capabilities**: Analytics & user management  
✅ **Deployment ready**: Vercel serverless configuration  

**Next steps for production**: Add monitoring, implement rate limiting, optimize Gemini calls, enhance PDF parsing for edge cases.

---

*This document serves as the source of truth for system architecture, development standards, and maintenance procedures.*
