# 🚀 SkillForge AI — AI-Powered Career Mentor & Roadmap Generator

[![Live Application](https://img.shields.io/badge/Live_App-skill--forge--ai--rose.vercel.app-0F4C5C?style=for-the-badge&logo=vercel)](https://skill-forge-ai-rose.vercel.app/)
[![Frontend](https://img.shields.io/badge/Frontend-React_%7C_Vite-61DAFB?style=for-the-badge&logo=react)](https://vitejs.dev/)
[![Backend](https://img.shields.io/badge/Backend-Node.js_%7C_Express_5-339933?style=for-the-badge&logo=node.js)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_%7C_Supabase-336791?style=for-the-badge&logo=postgresql)](https://supabase.com/)
[![ORM](https://img.shields.io/badge/ORM-Prisma_7.9.1-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![AI Provider](https://img.shields.io/badge/AI_Engine-Groq_Qwen_3.6_27B-F4A259?style=for-the-badge)](https://groq.com/)

> **Live Demo:** [https://skill-forge-ai-rose.vercel.app/](https://skill-forge-ai-rose.vercel.app/)

SkillForge AI is a production-ready, full-stack web application designed to help tech professionals and job seekers analyze their current skill set, benchmark themselves against target industry roles, and receive personalized 3-phase milestone learning roadmaps complete with traceable project and certification recommendations.

---

## ✨ Core Features

- 📄 **AI Resume Extraction**: Upload PDF or DOCX resumes to automatically extract technical skills, proficiency levels, education, and experience using Groq's high-speed LLM (`qwen/qwen3.6-27b`) with automatic fallback to context-aware rule extraction.
- 🎯 **Target Career Track & Grounding Benchmark**: Choose from a curated grounding dataset of 15+ career tracks (*Full Stack, Frontend, Backend, AI/Prompt Engineer, Cloud Architect, DevOps, etc.*) or specify custom career goals.
- 📊 **Skill Gap Benchmark Matrix**: Calculates real-time match percentages, categorizing skills into **Matched**, **Level Gaps** (e.g., *Beginner → Advanced*), and **Missing Skills**.
- 🗺️ **Personalized Milestone Roadmaps**: Generates a structured 3-phase learning timeline (`Foundation & Gap Remediation`, `Intermediate Implementation`, `Production Systems & Deployment`).
- 🎓 **Traceable Project & Certification Recommendations**: Suggests hands-on capstone project ideas and curated industry certifications (*AWS, Azure, Docker, Kubernetes, Python, React, Node.js, Security, Git*) with cost badges (`Free`, `Paid`, `Freemium`) traceable directly to identified skill gaps.
- 🛡️ **Guided First-Time Onboarding Flow**: Smooth multi-step onboarding guard (`useOnboardingStatus`) with visual progress indicators preventing new users from seeing empty or broken dashboard states.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    subgraph Frontend ["Frontend (Vercel)"]
        UI["React 18 + Vite SPA"]
        AC["AuthContext (JWT Cookie Session)"]
        HOOK["useOnboardingStatus Hook"]
    end

    subgraph Backend ["Backend (Render Web Service)"]
        API["Express 5 REST API"]
        AUTH["JWT Middleware (sameSite: none, secure: true)"]
        SEC["Helmet + CORS Security"]
        PARSER["Resume Parser (pdf-parse / mammoth)"]
        WORKER["Background Job Worker (Polling Engine)"]
        GEN["Unified Roadmap & Recs Generator"]
    end

    subgraph External ["External Services"]
        GROQ["Groq AI API (qwen/qwen3.6-27b)"]
        SUPABASE["Supabase PostgreSQL (PgBouncer port 6543)"]
    end

    UI -->|HTTPS Requests + Auth Cookie| API
    API --> AUTH --> SEC
    API -->|Job Queue| WORKER
    WORKER --> PARSER
    WORKER --> GROQ
    GEN --> GROQ
    API -->|Prisma 7 ORM| SUPABASE
```

---

## 📁 Directory Structure

```
SkillForge AI/
├── DEPLOYMENT_GUIDE.md          # Full production deployment guide
├── DATABASE_SCHEMA.md           # Database ER diagram & table documentation
├── BACKEND_ARCHITECTURE.md      # Detailed backend architecture & API reference
├── prisma.config.ts             # Prisma 7 configuration file
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Prisma ORM Database Models
│   │   ├── seedRoles.js         # Curated Grounding Dataset Seeder (15+ roles)
│   │   └── migrateFeature5.js   # Roadmaps table DDL migration
│   ├── src/
│   │   ├── config/              # Environment & Database Configuration
│   │   ├── controllers/         # Auth, Resume, Job Controllers
│   │   ├── middleware/          # Auth, Security, Rate Limiter, File Validator
│   │   ├── routes/              # Auth, Resume, Skills, Roles, Roadmap Routes
│   │   ├── services/            # Parser, Worker, Extractor, Roadmap Generator
│   │   ├── utils/               # JWT Token & Cookie Helpers
│   │   ├── app.js               # Express 5 App Configuration
│   │   └── server.js            # Server Entry Point & Worker Startup
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── vercel.json              # Vercel Single-Page Application Rewrites
    ├── vite.config.js
    ├── src/
    │   ├── components/          # Navigation, Layout, Step Indicator
    │   ├── context/             # AuthContext Provider
    │   ├── hooks/               # useAuth, useOnboardingStatus
    │   ├── pages/
    │   │   ├── Landing/         # Public Hero & Feature Highlights
    │   │   ├── Login/           # Login Authentication
    │   │   ├── Register/        # Account Registration (Redirects to /upload)
    │   │   ├── Upload/          # Resume Drag-and-Drop Upload
    │   │   ├── SkillsConfirm/   # Skills Review & Manual Management
    │   │   ├── RoleSelection/   # Target Role Picker & Grounding Preview
    │   │   └── Dashboard/       # Interactive Roadmap & Recommendations
    │   ├── services/            # API Fetch Service (Auto-formats VITE_API_BASE_URL)
    │   ├── App.jsx              # React Router Configuration
    │   └── main.jsx
    ├── .env.example
    └── package.json
```

---

## 🗃️ Database Schema Summary

The database uses PostgreSQL managed via Supabase and Prisma ORM:

| Model | Table | Description |
|-------|-------|-------------|
| `User` | `users` | User accounts, credentials hash, target role reference |
| `RoleReference` | `roles_reference` | Curated grounding dataset of 15+ target career roles |
| `Resume` | `resumes` | Uploaded resume metadata, storage keys, and parsed JSON output |
| `Skill` | `skills` | User technical skills (`source: extracted/manual`, proficiency level) |
| `Job` | `jobs` | Background job processing queue (`status: pending/processing/completed`) |
| `Roadmap` | `roadmaps` | User gap matrix, 3-phase milestones, project & cert recommendations |

> For full table definitions, constraints, and data flows, view [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md).

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js v18+ (tested on Node v24)
- PostgreSQL / Supabase Database URL

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
JWT_SECRET="your-development-jwt-secret-key"
JWT_EXPIRES_IN="30m"
PORT=3001
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
LLM_API_KEY="gsk_your_groq_api_key" # Optional
```

Seed the grounding dataset & run migrations:
```bash
node prisma/seedRoles.js
npm run dev
```

### 3. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

Start Vite dev server:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🌐 Production Deployment

- **Frontend**: Deployed on [Vercel](https://vercel.com) with root directory set to `frontend` and `VITE_API_BASE_URL` pointed to Render.
- **Backend**: Deployed on [Render](https://render.com) as a Node.js Web Service with root directory set to `backend`.
- **Database**: Hosted on [Supabase](https://supabase.com) using PgBouncer pooler on port `6543`.

> For complete deployment instructions, view [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md).

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
