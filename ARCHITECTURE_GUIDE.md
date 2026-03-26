# Resume Analyzer - Architecture & Workflow Guide

## 🎯 What Is This Project?

**Resume Analyzer** is an **AI-powered SaaS platform** that helps job seekers evaluate and improve their resumes using:
- **Algorithmic scoring** (rule-based, fast)
- **Google Gemini AI** (intelligent analysis)
- **Interview prep** (auto-generated questions)
- **Progress tracking** (historical analytics)
- **Admin dashboard** (platform management)

**User Need**: "How good is my resume? What's missing? How do I prepare for interviews?"

**Solution**: Upload PDF → Get instant ATS score + AI insights + 5 tailored interview questions → Track improvements over time

---

## 🏗️ System Layers (Bottom-Up)

### Layer 1: Data Persistence (MongoDB Atlas)
**What**: Cloud NoSQL database  
**Collections**:
- `users` → email, password_hash, role, profile
- `resumes` → analysis results, scores, timestamps
- `sessions` (optional) → JWT blacklist for logout

**Key Decisions**:
- ✅ Used MongoDB for flexibility (schema-less, scales horizontally)
- ✅ Motor async driver (compatible with Vercel serverless)
- ✅ Indexes on `email` (unique), `user_id`, `created_at` for fast queries

---

### Layer 2: Backend Business Logic (Python FastAPI)
**What**: Async REST API server  
**Location**: `/backend/` and `/api/index.py`

**Core Modules**:

#### **auth.py** → Authentication
```python
# Functions:
- hash_password(plain) → bcrypt hash
- verify_password(plain, hashed) → boolean
- create_jwt_token(user_id, email, role) → JWT string
- verify_jwt_token(token) → user_id or raise error
- get_current_user(token) → user dict
```

#### **routes_auth.py** → Auth Endpoints
```python
POST /register
  Input: email, password, username
  Output: user object + JWT token
  
POST /login
  Input: email, password
  Output: user object + JWT token (24h expiry)
  
GET /user (protected)
  Output: current user profile
```

#### **routes_resume.py** → Analysis Engine
```python
def extract_text_from_pdf(file) → string
  Uses: pypdf library
  Returns: full text content

def calculate_resume_score(text) → int (0-100)
  Algorithm:
    - Skill detection (+3 per skill, max 20pts)
    - Metrics extraction (+4 per %, max 20pts)
    - Experience years (+5 per year, max 20pts)
    - Action verbs (+2 per verb, max 10pts)
    - Word count (>300 = +15pts)
    - Section presence (+15pts)
    Result: 0-100 scale

def analyze_with_gemini(text) → JSON object
  Prompt: Structured instruction to Gemini API
  Output: {
    "strengths": [...],
    "weaknesses": [...],
    "missing_keywords": [...],
    "suggestions": [...],
    "hr_questions": [...],
    "tips": [...]
  }

POST /analyze (protected)
  Input: PDF file
  Process:
    1. Extract text from PDF
    2. Calculate algorithm score
    3. Call Gemini for AI analysis
    4. Validate JSON response
    5. Save to MongoDB
    6. Assign badge (gold/silver/bronze)
  Output: complete analysis object
  
GET /history (protected)
  Output: array of user's past analyses (sorted by date)
```

#### **routes_admin.py** → Admin Panel
```python
GET /admin/users (admin only)
  Returns: list of all users

GET /admin/stats (admin only)
  Returns: platform KPIs
  - Total users
  - Total resumes analyzed
  - Average score
  - Score distribution (histogram)
  - Usage trends
```

#### **database.py** → DB Connection Management
```python
async connect_db()
  - Initialize Motor client
  - Create indexes on first run
  - Handle Vercel warm restarts

async ensure_db()
  - Check if DB is still connected
  - Reconnect if event loop changed (important for serverless)

def get_db() → Motor database instance
```

---

### Layer 3: API Gateway (FastAPI CORS + Middleware)
**What**: HTTP server with middleware  
**Location**: `/main.py`

**Features**:
```python
# CORS: Allow all origins (frontend can call from any domain)
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# Lifespan: Connect/close DB on app start/stop
async def lifespan(app):
    await connect_db()
    yield
    await close_db()

# Middleware: Ensure DB connected before each request (Vercel fix)
async def ensure_db_middleware(request, call_next):
    await ensure_db()
    return await call_next(request)

# Routes: Register routers
app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(admin_router)
```

---

### Layer 4: Frontend UI (React + Vite)
**What**: Single-page application (SPA)  
**Location**: `/src/`

**Key Components**:

#### **App.jsx** → Root Component
- Routes setup (React Router v7)
- Protected route guards (ProtectedRoute, AdminRoute)
- Navigation bar
- Theme toggle (dark/light)
- Context providers

#### **Pages**:

**Login.jsx / Register.jsx**
```
User input (email, password)
  ↓
Form validation
  ↓
API call (POST /login or /register)
  ↓
JWT token received
  ↓
Stored in AuthContext
  ↓
Navigate to dashboard
```

**UserDashboard.jsx** → Main feature page
```
Components:
├── ResumeUpload (drag-drop PDF)
├── AnalysisSections (display results)
│   ├── ATSScoreCard (visual score display)
│   ├── Strengths & Weaknesses (bullet lists)
│   └── Suggestions & Tips (actionable items)
├── InterviewQuestions (generated Q&A)
└── History (past analyses, trends)
```

**AdminDashboard.jsx** → Admin management
```
Components:
├── Stats Cards (KPIs)
├── Recharts visualization (trends)
├── User Manager (ban/unban)
└── Logs Viewer (errors)
```

#### **Context** (Global State)
```javascript
AuthContext.jsx
├── user (current user object)
├── token (JWT)
├── login(email, password)
├── logout()
└── isAuthenticated (boolean)

ThemeContext.jsx
├── dark (boolean)
└── toggle() → switch theme
```

#### **Services**
**api.js** → Axios instance
```javascript
// Setup
const api = axios.create({
  baseURL: "http://localhost:8000/api",
  withCredentials: true
})

// Interceptor for JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Main functions
export const analyzeResume = (file) → POST /analyze
export const getHistory = () → GET /history
export const loginUser = (email, password) → POST /login
export const registerUser = (data) → POST /register
export const getAdminStats = () → GET /admin/stats (admin only)
```

---

## 🔄 Core Workflows (Visual)

### Workflow 1: User Registration & Login

```
┌─────────────────┐
│ User Session    │
└────────┬────────┘
         │ Clicks "Register"
         ↓
    ┌─────────────────────────────┐
    │ Register Form               │
    │ [Email] [Password] [Submit] │
    └────────┬────────────────────┘
             │ Client validation
             ↓
    ┌─────────────────────────────┐
    │ POST /register              │
    │ Body: {email, password}     │
    └────────┬────────────────────┘
             │ 
             ↓
    Backend: routes_auth.py
    ├─ Validate email format
    ├─ Check if user exists
    ├─ Hash password with bcrypt
    └─ Save user to MongoDB
             │
             ↓
    ┌─────────────────────────────┐
    │ Response: {                 │
    │   user: {id, email, role},  │
    │   token: "eyJ..."           │
    │ }                           │
    └────────┬────────────────────┘
             │ Client stores token
             ↓
    ┌─────────────────────────────┐
    │ Redirect to Dashboard       │
    │ (AuthContext.user is set)   │
    └─────────────────────────────┘
```

### Workflow 2: Resume Analysis (Main Feature)

```
┌────────────────────────────┐
│ User Dashboard             │
│ "Upload Resume" Button     │
└────────┬───────────────────┘
         │
         ↓
┌────────────────────────────┐
│ File Input / Drag-Drop PDF │
└────────┬───────────────────┘
         │ User selects file.pdf
         ↓
┌────────────────────────────────────────┐
│ Frontend Validation                    │
│ ├─ Check file type (must be .pdf)      │
│ └─ Check file size (< 10MB)            │
└────────┬───────────────────────────────┘
         │ Valid? Yes
         ↓
┌─────────────────────────────────────┐
│ POST /analyze                       │
│ Headers: Authorization: Bearer <JWT>│
│ Body: FormData {file: <PDF bytes>}  │
└────────┬──────────────────────────────┘
         │
         ↓
    ╔═══════════════════════════════════╗
    ║  BACKEND PROCESSING               ║
    ╚═════════════┬═════════════════════╝
                  │
        ┌─────────┴─────────┐
        │                   │
        ↓                   ↓
    Parse PDF          Queue Analysis
    pypdf lib          (Async)
        │                   │
        ├─ Extract text ◄───┤
        │                   │
        ↓                   ↓
    Algorithm Score    AI Analysis
    (Instant)          (Fast, ~2-5s)
        │                   │
        ├─ Skill regex      ├─ Gemini API
        ├─ Metrics parse    ├─ JSON parse
        ├─ Verb count       ├─ Validate response
        └─ Word analysis    └─ Extract insights
        │                   │
        └─────────┬─────────┘
                  │
                  ↓
        ┌──────────────────────────┐
        │ Badge Assignment         │
        ├─ Score ≥ 90? → Gold      │
        ├─ Score ≥ 70? → Silver    │
        ├─ Score ≥ 50? → Bronze    │
        └─ Score < 50? → None      │
                  │
                  ↓
        ┌──────────────────────────┐
        │ Save to MongoDB          │
        │ resumes collection       │
        │ {                        │
        │   user_id, algorithm_... │
        │   analysis: {...},       │
        │   created_at, badge...   │
        │ }                        │
        └──────────────────────────┘
                  │
                  ↓
┌────────────────────────────────────────┐
│ Response: 200 OK                       │
│ {                                      │
│   "algorithm_score": 75,               │
│   "analysis": {                        │
│     "strengths": [...],                │
│     "weaknesses": [...],               │
│     "missing_keywords": [...],         │
│     "suggestions": [...],              │
│     "hr_questions": [                  │
│       "Tell me about your...",         │
│       "How do you handle...",          │
│       ...                              │
│     ],                                 │
│     "tips": [...]                      │
│   },                                   │
│   "badge": "silver",                   │
│   "created_at": "2026-03-26T..."       │
│ }                                      │
└────────┬───────────────────────────────┘
         │ Frontend receives response
         ↓
┌─────────────────────────────────┐
│ React State Update              │
│ setAnalysis(responseData)       │
└────────┬────────────────────────┘
         │
         ↓
┌───────────────────────────────────────────┐
│ Display Analysis Results                  │
│ ├─ ATS Score Card (animated counter)      │
│ ├─ Badge Icon (gold/silver/bronze)        │
│ ├─ Strengths Section (bullet list)        │
│ ├─ Weaknesses Section (bullet list)       │
│ ├─ Missing Keywords (chips/tags)          │
│ ├─ Suggestions (numbered list)            │
│ └─ Interview Questions (Q&A accordion)    │
└───────────────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│ Update History View              │
│ ├─ Add new analysis to list      │
│ ├─ Update trend chart (Recharts) │
│ │  (show score progression)      │
│ └─ Show badge progression        │
└──────────────────────────────────┘
```

### Workflow 3: History & Progress Tracking

```
┌─────────────────────────────────┐
│ User clicks "History" tab       │
└────────┬────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│ GET /history                     │
│ Headers: Authorization: Bearer..│
└────────┬───────────────────────┘
         │
         ↓
Backend: MongoDB Query
    db.resumes.find({"user_id": user_id})
        .sort({created_at: -1})
        .limit(50)
         │
         ↓
┌──────────────────────────────────────┐
│ Response: [{analysis1}, {analysis2}] │
└────────┬───────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│ Frontend Displays                    │
│ ├─ Timeline of scores chart          │
│ ├─ Improvement percentage            │
│ ├─ Latest badge                      │
│ ├─ Peak score                        │
│ └─ List of past analyses with dates  │
│                                      │
│ Click on any item:                   │
│ └─ Show detailed analysis from that  │
│    date (reuse AnalysisSections)    │
└──────────────────────────────────────┘
```

### Workflow 4: Admin Dashboard

```
┌──────────────────────────────────┐
│ Admin clicks "Dashboard" nav link │
└────────┬─────────────────────────┘
         │
         ↓
    App checks: user.role === "admin"?
         │
         ├─ No → Redirect to /
         │
         └─ Yes → Load AdminDashboard
                  │
                  ↓
            Parallel API calls:
            ├─ GET /admin/stats
            ├─ GET /admin/users
            └─ GET /admin/logs
                  │
                  ↓
        ┌────────────────────────────┐
        │ Backend: routes_admin.py   │
        │                            │
        │ GET /admin/stats:          │
        │ ├─ Count users collection  │
        │ ├─ Count resumes collection│
        │ ├─ Avg of scores          │
        │ ├─ Group by date (trend)  │
        │ └─ Return KPI object      │
        │                            │
        │ GET /admin/users:          │
        │ └─ Return list of users   │
        │    (id, email, role, ...)  │
        │                            │
        │ GET /admin/logs:           │
        │ └─ Return API error logs  │
        └────────┬───────────────────┘
                 │
                 ↓
        ┌────────────────────────────┐
        │ Admin Dashboard Renders    │
        │                            │
        │ Stats Cards:               │
        │ ├─ "125 Users"             │
        │ ├─ "892 Resumes"          │
        │ ├─ "Avg Score: 72"        │
        │ └─ "Trending Up ↑"        │
        │                            │
        │ Recharts Visualization:    │
        │ ├─ Line chart (score over │
        │   time)                   │
        │ ├─ Bar chart (analyses per│
        │   day)                    │
        │ └─ Pie chart (badge dist) │
        │                            │
        │ User Management Table:     │
        │ ├─ Email | Role | Actions │
        │ ├─ user1 | user | Ban     │
        │ ├─ user2 | user | Ban     │
        │ └─ admin | admin| -       │
        │                            │
        │ Logs:                      │
        │ └─ List of errors/failures│
        └────────────────────────────┘
```

---

## 🔐 Security

### JWT Flow

```
USER LOGIN
    ↓
   [POST /login with email + password]
         ↓
    Backend: hash password and compare with stored hash (bcrypt)
         ↓
    Password matches?
    ├─ YES: Create JWT
    │   Payload: {
    │     "user_id": "507f...",
    │     "email": "user@example.com",
    │     "role": "user",
    │     "exp": 1648382400 (24h from now)
    │   }
    │   Secret: JWT_SECRET from env
    │   Algorithm: HS256
    │   Token: "eyJhbGc..." (long string)
    │
    └─ NO: Return 401 Unauthorized
         ↓
    [Return token to frontend]
         ↓
    Frontend stores in localStorage/httpOnly cookie
         ↓
PROTECTED REQUESTS
    ↓
   [Every API call includes: Authorization: Bearer <token>]
         ↓
    Backend middleware: verify_jwt_token(token)
    ├─ Decode using JWT_SECRET
    ├─ Check signature
    ├─ Check expiry
    ├─ Extract user_id
    └─ Attach to request context
         ↓
    user = await get_current_user(token)
         ↓
    Continue with authorized request
```

### Password Security

```
User Registration:
[plaintext password] 
    ↓
bcrypt.hashpw(password, rounds=10)
    ↓
[hashed: $2b$10$...] ← Store in DB

User Login:
[plaintext password]
    ↓
bcrypt.checkpw(plaintext, stored_hash)
    ↓
[True/False] ← Grant access or deny
```

---

## 📊 Database Activities

### Data Insertion (Registration)

```python
# Register endpoint
await db.users.insert_one({
    "email": "john@example.com",
    "password_hash": "$2b$10$...",
    "username": "john_doe",
    "role": "user",
    "created_at": datetime.now(timezone.utc),
    "profile": {
        "full_name": "John Doe",
        "job_title": None,
        "avatar_url": None
    }
})
```

### Data Query (Resume History)

```python
# Get user's resume history
user_id = ObjectId("507f...")
resumes = await db.resumes.find(
    {"user_id": user_id}
).sort("created_at", -1).limit(50).to_list(None)

# Result: [
#   {
#     "_id": ObjectId("..."),
#     "user_id": ObjectId("507f..."),
#     "algorithm_score": 75,
#     "analysis": {...},
#     "badge": "silver",
#     "created_at": 2026-03-26T10:30Z
#   },
#   {...}
# ]
```

### Data Aggregation (Admin Stats)

```python
# Platform statistics
pipeline = [
    {
        "$group": {
            "_id": None,
            "total_resumes": {"$sum": 1},
            "avg_score": {"$avg": "$algorithm_score"},
            "max_score": {"$max": "$algorithm_score"},
            "min_score": {"$min": "$algorithm_score"}
        }
    }
]
stats = await db.resumes.aggregate(pipeline).to_list(None)

# Result: [{
#   "total_resumes": 892,
#   "avg_score": 71.5,
#   "max_score": 100,
#   "min_score": 25
# }]
```

---

## 🚀 Deployment Pipeline

```
Developer pushes to GitHub
    ↓
Vercel webhook triggered
    ↓
Vercel runs build:
    ├─ Frontend: npm run build
    │   └─ Produces: dist/ (static files)
    │       └─ Uploaded to CDN (instant global delivery)
    │
    └─ Backend: NO BUILD NEEDED
        └─ FastAPI app deployed as serverless function
            └─ Starts when request comes in
            └─ Auto-scales on demand
    ↓
Environment variables injected
    ├─ GEMINI_API_KEY
    ├─ MONGO_URI
    └─ JWT_SECRET
    ↓
Live on: resume-analyzer.vercel.app
    ├─ Frontend: https://resume-analyzer.vercel.app/
    ├─ API: https://resume-analyzer.vercel.app/api/...
    └─ Function: Python FastAPI running serverless
```

---

## 💡 Key Design Decisions & Trade-offs

| Decision | Reason | Trade-off |
|----------|--------|-----------|
| **MongoDB** instead of PostgreSQL | Schema flexibility, easy scaling | Less structured data, more memory |
| **JWT auth** instead of sessions | Stateless, serverless-friendly | Can't revoke instantly (logout not immediate) |
| **Synchronous Gemini calls** | Simpler code, better UX | Slow endpoint if Gemini is rate-limited |
| **Vercel serverless** | Free tier, auto-scaling | Cold starts (~1-2s), limited CPU |
| **Motor async driver** | Handles Vercel event loop issues | Needs serverless-aware reconnect logic |
| **Single PDF support** | MVP focus | Users can't upload .docx, .txt |
| **No caching layer** | Simpler initial setup | Slower repeated requests (costs API calls) |

---

## 📈 Performance Characteristics

| Operation | Time | Bottleneck |
|-----------|------|-----------|
| Register | ~200ms | bcrypt hashing (intentional slowness for security) |
| Login | ~150ms | JWT creation + DB lookup |
| Resume upload | ~2-5s | Gemini API latency (varies) |
| History retrieval | ~50-100ms | MongoDB network latency |
| Admin dashboard load | ~200-300ms | Multiple parallel API calls + aggregations |

---

## 🛠️ Local Development Setup

```bash
# Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB Atlas account + connection string
- Google Gemini API key

# Clone
git clone <repo>
cd resume_analyzer

# Backend setup
python -m venv env
source env/Scripts/activate  # Windows: .\env\Scripts\activate
pip install -r requirements.txt

# Create .env
GEMINI_API_KEY=your_key_here
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_random_secret

# Start backend (terminal 1)
python main.py
# Server runs on http://localhost:8000

# Frontend setup (terminal 2)
npm install
npm run dev
# App runs on http://localhost:5173

# Build for production
npm run build  # Creates dist/ folder

# Open browser
http://localhost:5173
```

---

## 🎓 Success Criteria

✅ **User uploads resume** → Completes in <5 seconds  
✅ **Analysis correct** → Scores match manual review  
✅ **Interview questions relevant** → 80%+ user satisfaction  
✅ **History tracking works** → Shows progress over time  
✅ **Admin dashboard accurate** → Stats match database counts  
✅ **Responsive design** → Works on mobile/tablet/desktop  
✅ **Auth secure** → No password leaks, JWT validation strict  
✅ **Uptime 99.5%** → Vercel SLA standard  

---

## 📞 Common Tasks

### How to add a new API endpoint?

1. Create function in `/backend/routes_resume.py`
2. Decorate with `@router.post("/endpoint-name")`
3. Add `Depends(get_current_user)` if protected
4. Test with Postman/cURL
5. Add frontend API call in `/src/services/api.js`

### How to change the scoring algorithm?

Edit `calculate_resume_score()` in `/backend/routes_resume.py` → Adjust weights, add verbs, change thresholds

### How to add a new database collection?

1. Add to MongoDB Atlas
2. Create index in `ensure_db()` in `/backend/database.py`
3. Query with `db.new_collection.find(...)`

### How to deploy?

Push to GitHub → Vercel auto-deploys → Check https://resume-analyzer.vercel.app

---

This is your **complete system blueprint**. Use it as reference for development, onboarding, and maintenance.
