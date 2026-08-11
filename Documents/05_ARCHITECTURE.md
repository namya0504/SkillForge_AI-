# Architecture, Scalability & Performance — SkillForge AI

## 1. Recommended Stack (beginner-friendly, but explainable to judges)

| Layer | Suggestion | Why |
|---|---|---|
| Frontend | React (Next.js) or plain React + Vite | Huge tutorial base, good defaults, fast to build forms/dashboards |
| Backend API | Node.js + Express, or Python + FastAPI | FastAPI gives you async support and schema validation almost for free — strong pick if anyone knows Python |
| Database | PostgreSQL (via Supabase free tier, or Railway) | Relational fits this data well (users, skills, roadmaps, progress) and Supabase gives you auth+storage+DB in one free tier |
| Object Storage | Supabase Storage or S3-compatible free tier | Needed to keep resumes out of your app server's local disk |
| Background Jobs | Simple job table + polling worker, OR a lightweight queue (BullMQ if Node, or FastAPI `BackgroundTasks`/Celery-lite if Python) | Keeps LLM/parsing calls off the request thread |
| LLM Provider | Any (declare it) | Used only server-side |
| Deployment | Vercel (frontend) + Railway/Render (backend+worker+DB) | Free tiers, simple CI, good for a hackathon timeline |

You do not need microservices, Kubernetes, or a message broker like Kafka for this project — that would be over-engineering for the scope and time you have. The goal is to *demonstrate* good architectural judgment, not maximum complexity.

---

## 2. High-Level Architecture

```
[Browser/React SPA]
        |
        | HTTPS (cookies, JSON)
        v
[API Server (stateless)] ---- reads/writes ----> [PostgreSQL]
        |                                              ^
        | enqueues job                                 |
        v                                              |
[Job Queue / Jobs table] <--- polled by ---- [Worker process] --(writes results)--/
        |
        | calls (server-side only, with API key)
        v
[LLM Provider API]

[API Server] --- signed upload URL ---> [Object Storage] <--- worker reads file for parsing
```

Key architectural decision: **the API server never does the slow work itself.** It only ever (a) validates the request, (b) writes a job record, (c) returns immediately. The worker does the CPU/latency-heavy work asynchronously. This single decision is what makes the rest of the performance/scalability story work.

---

## 3. Why "stateless API + async worker" solves your CPU load requirement

If resume parsing and LLM calls happened directly inside the HTTP request handler:
- Each concurrent user uploading a resume ties up a request thread/worker process for 5-12 seconds
- With a typical small server (1-2 CPU cores), 5-10 concurrent uploads would make the whole app unresponsive — including simple things like login, which shouldn't be affected by someone else's resume upload
- CPU spikes would be unpredictable and hard to reason about

With async workers:
- The API layer stays fast and responsive regardless of how many parsing/generation jobs are queued
- You can explicitly cap worker concurrency (e.g., `MAX_CONCURRENT_JOBS=3`) so CPU usage has a predictable ceiling instead of spiking with traffic
- If load increases beyond capacity, jobs queue up (with a visible "position in queue" or "processing, please wait" state) instead of crashing the server

**Concrete implementation guidance for the worker concurrency cap:**
- Use a semaphore/counter pattern: worker picks up new jobs only while `active_jobs < MAX_CONCURRENT_JOBS`
- Start with `MAX_CONCURRENT_JOBS = 3` on a typical free-tier instance (1 vCPU); tune based on actual measured CPU usage during testing, not guesswork

---

## 4. Scalability Notes (for judges, and for if this ever needed to grow)

- **Horizontal scaling of API layer:** because it's stateless (no in-memory session data — sessions live in signed cookies/DB, not server memory), you could run N instances behind a load balancer with zero code changes.
- **Horizontal scaling of workers:** independent from the API layer — you could scale worker count up during high load (e.g., hackathon judging period) without touching the API servers at all.
- **Database:** use connection pooling (e.g., PgBouncer, or your ORM's built-in pool) so scaling API instances doesn't exhaust DB connections.
- **Caching:** cache LLM responses keyed by (skills-hash + role) — this both reduces LLM cost/latency AND reduces load on the system when the same request pattern repeats (e.g., a judge reloading your demo account).
- **CDN for static frontend assets** — trivial with Vercel/Netlify, worth mentioning in your README as a scalability point even though it requires no extra work from you.

---

## 5. Performance Budget Summary (repeated from SRS for convenience)

| Operation | Target | Mechanism |
|---|---|---|
| Static page load (TTI) | < 2s on 4G | CDN + code splitting |
| Non-LLM API calls | p95 < 300ms | Indexed DB queries, connection pooling |
| Resume parsing | < 8s, async | Background worker, concurrency cap |
| Roadmap generation | < 12s, streamed | Async worker + streaming response |
| LLM call timeout | 20s hard cap | Prevents hung workers |

---

## 6. Data Model (minimum viable schema)

```
users (id, email, password_hash, target_role, created_at)
skills (id, user_id, skill_name, proficiency, source, created_at)
resumes (id, user_id, storage_key, parsed_status, created_at)
roadmaps (id, user_id, version, role, generated_at, data JSONB)
roadmap_items (id, roadmap_id, title, subtopics JSONB, resources JSONB, order_index)
progress (id, user_id, roadmap_item_id, status, updated_at)
roles_reference (id, role_name, required_skills JSONB)   -- your curated grounding dataset
jobs (id, user_id, type, status, payload JSONB, result JSONB, created_at, completed_at)
```

Using `JSONB` columns for flexible AI-generated structures (roadmap content, resources) while keeping core relational fields (user_id, status, timestamps) as proper indexed columns is a good balance of flexibility and query performance for this project's timeline.

---

## 7. What NOT to build (scope control for CPU/time reasons)
- Don't build your own PDF renderer/parser from scratch — use an existing library.
- Don't fine-tune an LLM — prompt engineering + a curated grounding dataset is enough and dramatically cheaper on time/CPU.
- Don't build a custom job queue system from scratch if a simple library option exists in your stack — reinventing this wastes hackathon hours you need elsewhere.
