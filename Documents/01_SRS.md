# Software Requirements Specification (SRS)
## SkillForge AI — Personalized Learning & Career Mentor
Version 1.0 | Hack Orbit 2026 | PS-01

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for **SkillForge AI**, a web platform that analyzes a student's resume, skills, and interests to generate personalized learning roadmaps, project/certification recommendations, interview prep resources, and progress analytics.

This SRS is written to be handed directly to an AI coding agent (Antigravity) or a human dev team, feature by feature, so each section can be implemented independently and verified against its own acceptance criteria.

### 1.2 Scope
In scope for the hackathon build (MVP):
- Resume upload + skill/experience extraction
- User skill profile (self-declared + extracted)
- AI-generated personalized learning roadmap
- Project, certification, and interview-question recommendations
- Progress tracking dashboard with analytics
- Basic authentication and per-user data isolation

Out of scope for MVP (mention as "future work" in README, do not build):
- Payment/subscription systems
- Native mobile apps
- Real integrations with LMS platforms (Coursera/Udemy APIs) — mocked/curated data is fine
- Multi-tenant enterprise admin panel

### 1.3 Definitions
- **LLM** — Large Language Model (used via API, e.g., a hosted provider; must be declared per hackathon rules)
- **Roadmap** — an ordered sequence of skills/topics/resources with milestones
- **Skill Gap** — difference between a student's current skill profile and a target role's required skills
- **PII** — Personally Identifiable Information (name, email, phone, resume content)

### 1.4 Intended Audience
Developers (human or AI agent) implementing this system feature-by-feature, and hackathon judges evaluating design quality.

### 1.5 References
- Hack Orbit 2026, PS-01 problem statement (parent document)

---

## 2. Overall Description

### 2.1 Product Perspective
SkillForge AI is a standalone web application (not integrated into an existing product). Architecture: SPA/Next.js-style frontend + REST/GraphQL backend + Postgres DB + async worker for heavy tasks (resume parsing, LLM calls) + LLM provider API.

### 2.2 User Classes
| User Class | Description | Access Level |
|---|---|---|
| Student (primary user) | Uploads resume, views roadmap, tracks progress | Full self-service on own data |
| Guest | Browses landing page only | No data access |
| (Optional) Admin | Hackathon demo account to showcase seeded data | Read-only dashboard view |

### 2.3 Operating Environment
- Frontend: modern browsers (Chrome/Edge/Firefox), responsive down to mobile width (375px)
- Backend: containerized (Docker), deployable to any free-tier cloud (Render/Railway/Fly.io/Vercel+Supabase)
- No native OS dependency

### 2.4 Design & Implementation Constraints
- Must use only open-source or free-tier libraries (hackathon rule)
- Any proprietary LLM API (OpenAI/Gemini/Claude) must be explicitly declared in submission
- Must be deployed and demo-able (not just running locally)
- Team has limited experience → prefer well-documented, batteries-included frameworks over bleeding-edge tools

### 2.5 Assumptions & Dependencies
- LLM API availability and free-tier quota is sufficient for demo load (~50-100 requests during judging)
- Resume files are in PDF/DOCX, English language, single-column preferred (multi-column parsing is a stretch goal, not MVP)
- Users provide honest self-declared skill ratings for portions the resume can't infer

---

## 3. System Features (Functional Requirements)

> Each feature below is written to be copy-pasted individually into a task/ticket. See `02_FEATURES.md` for the expanded, standalone version of each with acceptance criteria.

### FR-1: User Authentication
The system shall allow users to register and log in via email/password (and optionally OAuth — Google) with secure session handling.

### FR-2: Resume Upload & Parsing
The system shall accept PDF/DOCX resume uploads (max 5MB), extract raw text, and use NLP/LLM extraction to structure it into: skills, education, work/project experience, certifications.

### FR-3: Skill Profile Management
The system shall let users view, edit, add, or remove extracted skills, and self-rate proficiency (Beginner/Intermediate/Advanced) for each.

### FR-4: Target Role / Interest Selection
The system shall let users select or type a target career role (e.g., "Backend Developer", "Data Analyst") to anchor recommendations.

### FR-5: Personalized Roadmap Generation
The system shall generate a structured, ordered learning roadmap (topics → subtopics → resources) bridging the gap between the user's current skill profile and their target role, using the LLM with retrieval-augmented context (not a raw prompt-only call).

### FR-6: Project & Certification Recommendations
The system shall recommend specific project ideas and certifications relevant to identified skill gaps, each with a short rationale.

### FR-7: Interview Preparation Resources
The system shall generate role-specific interview questions (technical + behavioral) with model-suggested answer outlines.

### FR-8: Progress Tracking Dashboard
The system shall allow users to mark roadmap items/projects as Not Started / In Progress / Completed, and shall visualize progress (charts: completion %, skill growth over time).

### FR-9: Data Export
The system shall allow users to export their roadmap and profile as a PDF or JSON.

### FR-10: Session & Data Privacy Controls
The system shall allow users to delete their account and all associated data (resume file, profile, roadmap) on request.

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- Landing page (value prop + CTA)
- Auth pages (login/register)
- Onboarding flow (upload resume → confirm extracted skills → pick target role)
- Dashboard (roadmap view, progress charts, recommendations panel)
- Profile/settings page

See `06_UI_DESIGN.md` for full visual design goals.

### 4.2 API Interfaces
- Internal REST API (`/api/v1/...`) between frontend and backend
- External LLM Provider API (declared in README) — called ONLY from backend, never from frontend (protects API key)

### 4.3 Hardware Interfaces
None (standard web client/server).

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements
- Resume parsing + structuring: complete within **8 seconds** for a 2-page resume (async job with progress indicator if it exceeds 3s)
- Roadmap generation: complete within **12 seconds**, streamed to the UI token-by-token so perceived latency is low
- Dashboard page load: Time-to-Interactive under **2 seconds** on a 4G connection
- API endpoints (non-LLM): p95 response time under **300ms**

### 5.2 CPU Load & Resource Management
- All LLM calls and resume parsing MUST run in an **async background worker/queue** (e.g., a simple job queue), never blocking the main request thread — this is what keeps the API responsive under load and keeps CPU usage predictable instead of spiking per-request.
- File parsing (PDF/DOCX text extraction) is CPU-bound; cap concurrent parsing jobs (e.g., max 3 concurrent on a single instance) to avoid CPU starvation; queue the rest.
- Set explicit timeouts on all LLM calls (e.g., 20s) with graceful fallback messaging — prevents hung requests from holding worker resources indefinitely.
- Cache LLM responses for identical (resume-hash + target-role) pairs for a short TTL (e.g., 1 hour) to avoid redundant CPU/API cost during demo/judging when the same account may be reloaded repeatedly.

### 5.3 Scalability Requirements
- Backend must be **stateless** (no in-memory session/user state) so it can be horizontally scaled behind a load balancer if needed.
- Database access via connection pooling (avoid connection exhaustion under concurrent load).
- Heavy jobs (parsing, LLM calls) decoupled from the web server via a queue, so the API layer and the worker layer can be scaled independently.
- File storage (resumes) should go to object storage (e.g., S3-compatible / Supabase Storage), not local disk — required for any horizontal scaling beyond one instance.

### 5.4 Security Requirements
See `04_SECURITY.md` for the full specification. Summary of hard requirements:
- All passwords hashed (bcrypt/argon2), never stored plaintext
- All traffic over HTTPS
- JWT or session tokens with short expiry + refresh mechanism
- Resume files and extracted PII encrypted at rest
- Strict per-user data isolation (no user can query another user's data — enforced at the DB query layer, not just UI)
- Input validation and sanitization on all uploads and form fields
- Rate limiting on auth endpoints and LLM-triggering endpoints
- API keys for LLM provider stored server-side only, in environment variables / secrets manager — never exposed to frontend or committed to git

### 5.5 Reliability & Availability
- Graceful degradation: if the LLM API fails/times out, show a clear error and allow retry — do not crash the session or lose the user's uploaded data.
- All destructive actions (account deletion) require confirmation.

### 5.6 Usability Requirements
- Onboarding (signup → first roadmap) achievable in under 5 user actions.
- Mobile-responsive down to 375px width.
- Clear loading states for all async operations (parsing, generation) — never a blank screen.

### 5.7 Maintainability
- Code organized by feature/module, not by file type dump.
- Environment-based config (no hardcoded secrets/URLs).
- README with setup instructions sufficient for a judge to run it locally in under 10 minutes.

---

## 6. Appendix: Acceptance Criteria Template
Every feature implementation should be checked against:
1. Does it work end-to-end (not just UI mockup)?
2. Is the heavy/slow work async and non-blocking?
3. Is user data scoped correctly (can't leak across accounts)?
4. Is there a loading and an error state?
5. Does it degrade gracefully if the LLM API is slow/down?
