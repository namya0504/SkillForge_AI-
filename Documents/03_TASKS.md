# Task Breakdown — SkillForge AI
Ordered by build phase. Each task is small enough to be a single Antigravity/agent prompt. Check off as completed.

---

## Phase 0: Project Setup (Day 1, first 2 hours)
- [ ] Initialize monorepo or frontend+backend repos with clear folder structure (`/frontend`, `/backend`, `/worker`)
- [ ] Set up environment variable management (`.env.example` committed, `.env` gitignored) — NEVER commit real API keys
- [ ] Set up Postgres (or SQLite for pure speed, but Postgres if you want to show scalability awareness) with a migration tool
- [ ] Set up basic CI-less but working dev script (`npm run dev` / `docker-compose up`) so any teammate can run the whole stack in one command
- [ ] Create `.gitignore` covering `node_modules`, `.env`, uploaded files, build artifacts
- [ ] Set up object storage bucket (S3-compatible / Supabase Storage free tier) for resume files

## Phase 1: Auth & Core Backend Skeleton
- [ ] Implement user model/table (id, email, password_hash, created_at)
- [ ] Implement register endpoint with bcrypt hashing + validation
- [ ] Implement login endpoint issuing HTTP-only cookie session/JWT
- [ ] Implement auth middleware to protect routes
- [ ] Implement logout
- [ ] Implement rate limiting middleware on `/auth/*` routes
- [ ] Write a basic health-check endpoint (`/api/health`) for deployment verification

## Phase 2: Resume Upload Pipeline
- [ ] Frontend: file upload component with client-side type/size validation
- [ ] Backend: upload endpoint → stores raw file in object storage, creates a "parsing job" record, returns job ID immediately (202 Accepted, not 200 with full data)
- [ ] Worker: background job that (a) extracts text from PDF/DOCX, (b) calls LLM for structured extraction, (c) validates JSON schema, (d) writes structured skill/experience data to DB, (e) marks job complete
- [ ] Frontend: polling or SSE endpoint to check job status; show progress UI
- [ ] Error path: corrupted/unparseable file → job marked failed with a user-facing message + manual entry fallback form
- [ ] Concurrency cap on the worker (max N parsing jobs at once) — document the chosen limit and why (CPU protection)

## Phase 3: Skill Profile
- [ ] DB schema: skills table (user_id, skill_name, proficiency, source)
- [ ] API: GET/POST/PATCH/DELETE for user skills
- [ ] Frontend: editable skill list UI with proficiency selector
- [ ] Server-side dedup/normalization logic (case-insensitive skill matching)

## Phase 4: Target Role Selection
- [ ] Seed a curated JSON/DB table of ~20-30 roles with associated "required skills" baseline (this is your grounding dataset — build this BEFORE the roadmap feature, it's a dependency)
- [ ] Frontend: role selection UI (autocomplete + free text)
- [ ] API: save selected role to user profile

## Phase 5: Roadmap Generation (core AI feature)
- [ ] Backend: gap-analysis function — compare user skills vs. role's required-skills dataset, output structured gap list
- [ ] Backend: prompt template that injects gap list + role context, requests structured JSON roadmap output
- [ ] Backend: JSON schema validation on LLM response, with retry-on-malformed logic (max 2 retries)
- [ ] Backend: response caching layer keyed on (skills_hash + role) with TTL
- [ ] Backend: expose generation as an async job (same pattern as resume parsing) with streaming/incremental status if feasible
- [ ] Frontend: roadmap display UI (ordered topic list, expandable subtopics, resource links)
- [ ] Frontend: loading state + graceful error/retry state
- [ ] DB: version roadmaps (don't hard-overwrite on regenerate) and link progress records to a specific roadmap version

## Phase 6: Recommendations (Projects + Certifications)
- [ ] Extend gap-analysis output to include recommended projects/certs (reuse Phase 5 LLM call's structured output rather than a second call, if possible, to save latency/cost)
- [ ] Frontend: recommendations panel with rationale text per item

## Phase 7: Interview Prep
- [ ] Backend: role-level (not user-level) cached question generation
- [ ] Frontend: expandable Q&A list, tabs for Technical / Behavioral

## Phase 8: Progress Tracking Dashboard
- [ ] DB: progress table (user_id, roadmap_item_id, status, updated_at)
- [ ] API: update status endpoint
- [ ] Backend: aggregation endpoint for chart data (completion %, growth over time) — compute server-side
- [ ] Frontend: dashboard with charts (pick one lightweight charting lib) + empty states

## Phase 9: Export
- [ ] Backend: JSON export endpoint (straightforward serialization)
- [ ] Backend: PDF export using a lightweight PDF-gen library (async if slow)

## Phase 10: Account Deletion & Privacy
- [ ] Backend: cascade-delete endpoint (profile, skills, roadmap, progress, object-storage file)
- [ ] Frontend: confirm-with-password delete flow
- [ ] Verify no orphaned records via a manual test pass

## Phase 11: Security Hardening Pass (do NOT skip — schedule real time for this)
- [ ] Review every endpoint: is user_id scoping enforced at the query level (not just checked in app logic)?
- [ ] Confirm no API keys/secrets in frontend bundle (grep build output)
- [ ] Confirm HTTPS enforced in deployment config
- [ ] Confirm rate limiting active on auth + generation endpoints
- [ ] Confirm file upload validation can't be bypassed (test with a renamed .exe as .pdf)
- [ ] Run through `04_SECURITY.md` checklist fully

## Phase 12: Performance & Deployment Pass
- [ ] Verify LLM/parsing calls are all going through the async worker, not blocking API threads
- [ ] Load-test critical endpoints lightly (even 10-20 concurrent requests) to confirm no obvious bottleneck
- [ ] Deploy frontend + backend + worker + DB to chosen free-tier hosts
- [ ] Confirm environment variables set correctly in production (not just local `.env`)
- [ ] Final smoke test on the deployed URL (not localhost) before submission

## Phase 13: Submission Deliverables
- [ ] README: setup instructions, architecture overview, declared APIs/libraries used
- [ ] 3-minute demo video script + recording
- [ ] 1-page abstract
- [ ] Verify public GitHub repo is actually public and complete (no missing `.env.example`, no broken clone)

---

## Suggested Team Split (3–5 members)
- **Person A — Backend core:** auth, DB schema, API routes (Phases 1, 3, 4, 8, 10)
- **Person B — AI/worker pipeline:** resume parsing, roadmap generation, prompt engineering, caching (Phases 2, 5, 6, 7)
- **Person C — Frontend:** all UI components, dashboard, charts (works in parallel against mocked API responses early on)
- **Person D (if 4th) — Security + DevOps:** Phase 11, 12, deployment, rate limiting, env management
- **Person E (if 5th) — UI/UX polish + docs:** design system application, README, demo video, abstract

Build order matters more than team-member order: **Phase 0 → 1 → 4 (seed data) → 2 → 3 → 5 is the critical path.** Everything else can parallelize once the critical path's data model is stable.
