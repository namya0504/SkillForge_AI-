# SkillForge AI — Backend Architecture Documentation

> **Last Updated:** 2026-08-18  
> **Runtime:** Node.js v24 + Express 5  
> **ORM:** Prisma 7.9.1  
> **Database:** PostgreSQL (Supabase)  
> **AI Provider:** Groq API (Qwen 3.6 27B model)

---

## System Architecture

```
                    ┌─────────────────────────────────────┐
                    │       Vercel (Frontend)              │
                    │   React + Vite SPA                   │
                    │   skill-forge-ai-rose.vercel.app     │
                    └────────────────┬────────────────────┘
                                     │ HTTPS + Cookies
                                     ▼
┌────────────────────────────────────────────────────────────────┐
│                    Render (Backend)                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Express 5 Server                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐              │  │
│  │  │  Auth     │  │  Resume  │  │  Skills   │              │  │
│  │  │  Routes   │  │  Routes  │  │  Routes   │              │  │
│  │  └──────────┘  └──────────┘  └───────────┘              │  │
│  │  ┌──────────┐  ┌──────────┐                              │  │
│  │  │  Roles   │  │ Roadmap  │                              │  │
│  │  │  Routes  │  │  Routes  │                              │  │
│  │  └──────────┘  └──────────┘                              │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                      │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │              Background Job Worker                       │  │
│  │  Polls DB every 2s for pending jobs                      │  │
│  │  ┌─────────┐  ┌────────────┐  ┌───────────────┐         │  │
│  │  │ Parser  │→ │ Extractor  │→ │ Skill Upsert  │         │  │
│  │  │ (Text)  │  │ (LLM/Rule) │  │ (Database)    │         │  │
│  │  └─────────┘  └────────────┘  └───────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────────────┘
                             │ Prisma ORM (PgBouncer port 6543)
                             ▼
                    ┌─────────────────────────────────────┐
                    │       Supabase PostgreSQL            │
                    │   6 Tables: users, resumes, skills,  │
                    │   jobs, roles_reference, roadmaps    │
                    └─────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────────────────────────┐
                    │       Groq AI API (LLM)             │
                    │   Model: qwen/qwen3.6-27b           │
                    │   Used for: Resume parsing,         │
                    │   Roadmap generation                 │
                    └─────────────────────────────────────┘
```

---

## Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma           # Database schema definition
│   ├── seedRoles.js            # Seeds 15 curated career roles
│   └── migrateFeature5.js      # DDL migration for roadmaps table
├── src/
│   ├── server.js               # Entry point — starts Express + Worker
│   ├── app.js                  # Express app configuration + route mounting
│   ├── runWorker.js            # Standalone worker entry point
│   ├── config/
│   │   ├── env.js              # Environment variable loader
│   │   ├── database.js         # Prisma client singleton
│   │   └── storage.js          # File storage abstraction (local FS)
│   ├── middleware/
│   │   ├── auth.js             # JWT cookie authentication middleware
│   │   ├── security.js         # Helmet + CORS configuration
│   │   ├── rateLimiter.js      # Rate limiting (general + auth)
│   │   ├── validate.js         # express-validator error handler
│   │   ├── fileValidator.js    # File magic byte validation
│   │   └── upload.js           # Multer file upload configuration
│   ├── controllers/
│   │   ├── auth.controller.js  # Register, Login, Logout, GetMe
│   │   ├── resume.controller.js # Upload, GetCurrent
│   │   └── job.controller.js   # GetJobStatus
│   ├── routes/
│   │   ├── auth.routes.js      # /api/v1/auth/*
│   │   ├── resume.js           # /api/v1/resume/*
│   │   ├── skills.js           # /api/v1/skills/*
│   │   ├── roles.routes.js     # /api/v1/roles/*
│   │   ├── roadmap.routes.js   # /api/v1/roadmap/*
│   │   └── job.routes.js       # /api/v1/jobs/*
│   ├── services/
│   │   ├── parser.js           # PDF/DOCX text extraction
│   │   ├── extractor.js        # AI skill extraction (Groq LLM + fallback)
│   │   ├── worker.js           # Background job processing engine
│   │   └── roadmap.generator.js # Gap analysis + roadmap + recommendations
│   └── utils/
│       └── token.js            # JWT generation, verification, cookie config
└── package.json
```

---

## API Endpoints Reference

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Create account. Rate limited. |
| POST | `/login` | No | Login with email/password. Rate limited. |
| POST | `/logout` | No | Clear auth cookie. |
| GET | `/me` | Yes | Get current user profile. |

### Resume (`/api/v1/resume`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/upload` | Yes | Upload PDF/DOCX resume (max 5MB). |
| GET | `/current` | Yes | Get latest resume status & parsed data. |

### Skills (`/api/v1/skills`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Yes | List all user skills. |
| POST | `/` | Yes | Add or upsert a skill. |
| PUT | `/:id` | Yes | Update skill proficiency. |
| DELETE | `/:id` | Yes | Delete a skill (ownership check). |

### Roles (`/api/v1/roles`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | List all curated roles. |
| GET | `/target` | Yes | Get user's current target role. |
| POST | `/target` | Yes | Set target role (curated or custom). |

### Roadmap (`/api/v1/roadmap`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Yes | Get user's active roadmap. |
| POST | `/generate` | Yes | Generate/regenerate personalized roadmap. |

### Jobs (`/api/v1/jobs`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:id` | Yes | Get job processing status. |

### Health (`/api/v1/health`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Health check endpoint. |

---

## Middleware Stack

Requests flow through these middleware layers in order:

```
1. helmet()          — Security headers (CSP, X-Frame-Options, etc.)
2. cors()            — Cross-Origin Resource Sharing (Vercel domains)
3. express.json()    — Parse JSON bodies (10kb limit)
4. cookieParser()    — Parse cookies (JWT auth token)
5. generalLimiter    — Rate limit: 100 requests / 15 min per IP
6. authLimiter       — Rate limit: 10 requests / 15 min (auth routes only)
7. authenticate      — JWT cookie verification → sets req.user.id
8. validate          — express-validator error aggregation
```

---

## Authentication Flow

```
Registration/Login:
  1. Validate email + password (express-validator)
  2. Hash password with bcrypt (12 salt rounds)
  3. Create/verify user in database
  4. Generate JWT: jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30m' })
  5. Set httpOnly cookie: { secure: true, sameSite: 'none', maxAge: 30min }
  6. Return user object

Protected Request:
  1. Extract token from req.cookies.token OR Authorization: Bearer header
  2. Verify JWT signature + expiration
  3. Set req.user = { id: decoded.id }
  4. Call next()
```

---

## Resume Processing Pipeline (Detailed)

```
Step 1: UPLOAD (synchronous)
  ├─ Multer receives multipart file (max 5MB)
  ├─ fileValidator checks magic bytes (PDF/DOCX signatures)
  ├─ storage.saveFile() writes to local filesystem
  ├─ prisma.resume.create({ parsedStatus: 'pending' })
  ├─ prisma.job.create({ type: 'resume_parse', status: 'pending' })
  └─ Return { resumeId, jobId } to client

Step 2: WORKER POLL (background, every 2 seconds)
  ├─ prisma.job.findFirst({ status: 'pending', orderBy: createdAt })
  ├─ prisma.job.update({ status: 'processing' })
  └─ Process job:

Step 3: TEXT EXTRACTION
  ├─ Read file buffer from storage
  ├─ If PDF → pdf-parse library → raw text
  └─ If DOCX → mammoth library → raw text

Step 4: STRUCTURED DATA EXTRACTION
  ├─ If LLM_API_KEY is set:
  │   ├─ Detect Groq key (gsk_*) → api.groq.com + qwen/qwen3.6-27b
  │   ├─ Send text to LLM with JSON schema prompt
  │   ├─ Clean response (strip <think> tags, extract JSON)
  │   ├─ Parse and validate JSON → { skills, education, experience, certs }
  │   └─ On failure → fallback to rule engine
  └─ Fallback Rule Engine:
      ├─ Regex match against 80+ skill keywords
      ├─ Context window analysis for proficiency level
      └─ Pattern match for education, experience, certifications

Step 5: DATABASE UPDATE
  ├─ Upsert each extracted skill into skills table (source: 'extracted')
  ├─ Update resume.parsedData with full structured data
  ├─ Update resume.parsedStatus = 'completed'
  └─ Update job.status = 'completed'
```

---

## Roadmap Generation Engine (Detailed)

```
Input: User's skills + Target role's required_skills

Step 1: GAP ANALYSIS MATRIX
  For each required skill in target role:
    ├─ Score mapping: Beginner=1, Intermediate=2, Advanced=3
    ├─ If user doesn't have skill → missingSkills (priority: High)
    ├─ If user score < required score → levelGaps
    └─ If user score >= required score → matchedSkills

Step 2: MILESTONE GENERATION
  ├─ If LLM available: Single-pass prompt with gap data → 3 phases
  └─ Rule engine fallback:
      ├─ Phase 1: Foundation & Gap Remediation (3-4 weeks)
      ├─ Phase 2: Intermediate Implementation (4-6 weeks)
      └─ Phase 3: Production Systems & Deployment (3-4 weeks)

Step 3: PROJECT RECOMMENDATIONS (Feature 6)
  ├─ Project 1: Targeted at primary skill gap (Intermediate difficulty)
  └─ Project 2: Capstone portfolio project (Advanced difficulty)
  ├─ Each includes: title, description, rationale, difficulty, hours, targetSkills

Step 4: CERTIFICATION RECOMMENDATIONS (Feature 6)
  ├─ Match gap skills against curated CERTIFICATION_DATABASE
  ├─ 10 providers: AWS, Azure, Docker, K8s, Python, React, Node.js, ML, Security, Git
  └─ Each includes: title, issuer, costType, difficulty, url, rationale, targetSkills

Step 5: SAVE
  └─ prisma.roadmap.upsert() — one roadmap per user
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (PgBouncer) |
| `JWT_SECRET` | Yes | — | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | No | `30m` | JWT token expiration |
| `PORT` | No | `3001` | Server listen port |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed CORS origin |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `LLM_API_KEY` | No | — | Groq/OpenAI API key (enables AI features) |
| `MAX_CONCURRENT_JOBS` | No | `3` | Max parallel worker jobs |
| `UPLOAD_DIR` | No | `./uploads` | File storage directory |
