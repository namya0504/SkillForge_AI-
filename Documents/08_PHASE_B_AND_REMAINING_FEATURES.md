# SkillForge AI — Phase B, Phase C & Remaining SRS Features
Continue from 07_AUDIT_FIX_PROMPTS.md. One prompt at a time, test after each.

**Priority reality check:** Items 6–13 are real product gaps — do these.
Items 14–18 are Phase C polish — do if time allows.
**Items 17 (Export) and 18 (hardcoded→DB) are the first two to cut if you're short on time.**

---

## FIX 6 — Resume Re-Upload (FEAT-03)

```
Add a resume re-upload capability. Backend: the existing POST /api/v1/resume/upload 
endpoint already creates a new resume + job each time it's called — confirm it does 
NOT reject a second upload for a user who already has one (check resume.controller.js; 
if it blocks duplicates, remove that check, since re-upload should simply create a 
new resume record, matching your "resumes: one-to-many" schema).

Frontend: add an "Update Resume" button/link in the main navigation bar (visible 
whenever the user is logged in) that routes to /upload. Also add the same button 
inside the Dashboard page. Reuse the existing Upload.jsx component as-is — it 
already handles the full upload+poll+result flow.

Test: upload a resume, complete onboarding, then use the new button to upload a 
second resume — confirm the new one processes correctly and the user's skills 
list updates (upserted, not duplicated) to reflect the newer resume's content.
```

---

## FIX 7 — Permanent "Skip & Enter Skills Manually" Button (UX-03)

```
In frontend/src/pages/Upload/Upload.jsx, the "Enter skills manually" link 
currently only appears in the status === 'error' state. Add a second, always-visible 
version of this link/button directly below the drop-zone in the status === 'initial' 
state, so users without a resume file can skip straight to manual skill entry 
without needing to fail an upload first. Style it as a secondary/text-link action, 
not competing visually with the primary drop-zone.
```

---

## FIX 8 — Fix Regex for Special-Character Skills (BUG-05)

```
In backend/src/services/extractor.js, the fallback extractor's regex uses \b 
word boundaries, which fail to correctly match skills containing non-word 
characters like C++, C#, .NET, and Node.js (the \b boundary doesn't work 
correctly adjacent to punctuation).

Replace the boundary logic: for skills containing only word characters (letters, 
digits), keep the existing \b-based regex. For skills containing special 
characters (detect via a regex test like /[^\w\s]/.test(skill)), instead use 
a manual boundary check: escape the skill string for regex safety, then match 
it with boundaries defined as "not preceded/followed by a letter or digit" 
using lookaround, e.g.:

const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = /[a-zA-Z0-9]/.test(skill[0]) || /[a-zA-Z0-9]/.test(skill[skill.length-1])
  ? new RegExp(`\\b${escaped}\\b`, 'i')
  : new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'i');

Apply this pattern selection per-skill inside the existing SKILLS_LIST.forEach loop, 
replacing the current single regex construction line. Add or update a test in 
extractor.test.js confirming "Experienced in C++, C#, and Node.js development" 
correctly extracts all three skills.
```

---

## FIX 9 — Dashboard Onboarding Guard (BUG-01 + UX-01)

```
Fix the broken first-time user flow across two files:

1. In frontend/src/pages/Register/Register.jsx, change the post-registration 
   redirect from /dashboard to /upload.

2. In frontend/src/pages/Dashboard/Dashboard.jsx, before calling handleGenerate() 
   or rendering roadmap content, check the user's onboarding completeness using 
   data already available from GET /api/v1/skills and GET /api/v1/roles/target 
   (call both on mount if not already cached in state):
   
   - If skills array is empty AND no resume exists → redirect to /upload
   - If skills exist but no target role is set → redirect to the role selection page
   - Only if both skills and target role exist → proceed with dashboard rendering 
     and roadmap generation as before

   Wrap this check in a loading state so the user sees a brief spinner while the 
   check runs, not a flash of the broken dashboard before redirecting.

Test: register a brand new account and confirm you land on /upload, not a broken 
Dashboard. Then manually navigate to /dashboard before completing onboarding and 
confirm it redirects you back to the correct incomplete step instead of crashing.
```

---

## FIX 10 — Refresh Token / Longer Session (FEAT-05)

```
Implement a simple refresh token pattern to avoid silent 30-minute logouts during 
active use. Keep this proportionate to hackathon scope — not a full rotation system.

Backend:
1. In backend/src/utils/token.js, add a second token generator: generateRefreshToken(userId) 
   using a longer expiry (e.g. 7d) and a SEPARATE secret (add REFRESH_TOKEN_SECRET to 
   env.js and .env.example — never reuse JWT_SECRET for both).
2. On login (auth.controller.js), set TWO httpOnly cookies: the existing short-lived 
   'token' (access token, 30m) and a new 'refreshToken' (7d), both with the same 
   secure/sameSite settings as your existing cookie.
3. Add a new endpoint POST /api/v1/auth/refresh: reads the refreshToken cookie, 
   verifies it against REFRESH_TOKEN_SECRET, and if valid, issues a new short-lived 
   access token cookie. Return 401 if the refresh token itself is invalid/expired 
   (this correctly forces a real re-login only after 7 days of total inactivity).
4. On logout, clear both cookies, not just one.

Frontend:
In frontend/src/services/api.js, inside your 401-handling logic (from Fix 2), 
BEFORE redirecting to /login, first attempt one call to POST /auth/refresh. 
If that succeeds, retry the original failed request once. Only redirect to 
/login if the refresh call itself also fails. Be careful to avoid an infinite 
loop — track that a request is a "retry after refresh" and don't attempt a 
second refresh on that retry.

Test: log in, wait past 30 minutes (or temporarily shorten JWT_EXPIRES_IN to 
'20s' for testing), then perform an action — confirm it silently refreshes and 
succeeds instead of redirecting to login.
```

---

## FIX 11 — Progress Tracking Dashboard (original SRS Feature 8)

```
Add progress tracking against the existing roadmap. Your roadmap.milestones field 
is a JSON blob of phases/topics with no stable per-item ID yet — add one first.

Step 1 — Schema: add a new model to schema.prisma:

model Progress {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  itemId    String
  status    String   @default("not_started") // not_started | in_progress | completed
  updatedAt DateTime @updatedAt

  @@unique([userId, itemId])
  @@index([userId])
  @@map("progress")
}

Add the reverse relation (progress Progress[]) to the User model. Run 
npx prisma migrate dev --name add_progress_table.

Step 2 — Stable IDs: in backend/src/services/roadmap.generator.js, when building 
the milestones array (whether via LLM or the rule-engine fallback), assign each 
topic a stable id field, e.g. `${phaseIndex}-${topicIndex}`, before saving. This 
must happen at generation time so the same id persists across reads.

Step 3 — API endpoints (new file backend/src/controllers/progress.controller.js 
+ backend/src/routes/progress.routes.js, mounted at /api/v1/progress):
- GET /  → list all progress records for req.user.id
- PUT /:itemId  → body: { status }, upsert a Progress record scoped to req.user.id 
  and the given itemId (validate status is one of the three allowed values)
- GET /summary → compute and return { totalItems, completedItems, completionPercent, 
  inProgressItems } by cross-referencing the user's roadmap milestones count against 
  their Progress records. Compute this server-side, not in the frontend.

Step 4 — Frontend: on the Dashboard/roadmap view, render each topic with a status 
control (e.g. a 3-state toggle or dropdown: Not Started / In Progress / Completed), 
wired to PUT /api/v1/progress/:itemId with optimistic UI update. Add a summary 
section at the top showing completion percentage, fetched from GET /progress/summary, 
with a simple progress bar or ring. Include an empty state ("Generate your roadmap 
to start tracking progress") for users with no roadmap yet.
```

---

## FIX 12 — Account Deletion & Data Privacy (original SRS Feature 10)

```
Add account deletion with cascading cleanup. Your schema's existing cascade rules 
(User → Resume/Skill/Job/Roadmap/Progress, all onDelete: Cascade) mean deleting the 
User row will auto-remove all DB records — but the actual resume FILE in Supabase 
Storage must be deleted separately, since object storage isn't tracked by Postgres cascades.

Backend, new endpoint in auth.controller.js: DELETE /api/v1/auth/account
1. Require authentication (existing middleware).
2. Require the user's current password in the request body — re-verify it with 
   bcrypt.compare against the stored hash before proceeding (never skip this 
   confirmation step for a destructive action).
3. Before deleting the user record, fetch all their Resume rows and call 
   deleteFile(storageKey) from config/storage.js for each one, so no orphaned 
   files remain in the Supabase Storage bucket.
4. Delete the user: prisma.user.delete({ where: { id: req.user.id } }) — this 
   cascades to remove skills, jobs, roadmap, and progress records automatically.
5. Clear the auth cookie(s) in the response (same as logout).
6. Return 200 with a simple confirmation message.

Frontend: add a "Delete Account" option (this can live on a minimal settings 
page, or even just a link in the nav for now if you don't have time for a full 
profile page) that opens a confirmation dialog requiring the user to type their 
password before the delete request fires. After successful deletion, redirect 
to the landing page.

Test: create a throwaway test account, upload a resume, generate a roadmap, then 
delete the account. Confirm in Supabase's Table Editor that the user, skills, 
jobs, roadmap, and progress rows are all gone, AND confirm in Supabase Storage 
that the resume file is also gone, not just the DB record.
```

---

## Phase C (audit's original list) — do if time remains

## FIX 13 — Database Indexes (SEC-05)
```
In backend/prisma/schema.prisma, add @@index directives for: Job.status, 
Job.createdAt (consider a composite @@index([status, createdAt]) since your 
worker's poll query filters by status AND orders by createdAt together), 
Resume.userId (if not already present from earlier fixes), Skill.userId 
(if not already present), and RoleReference.isPopular. Run 
npx prisma migrate dev --name add_missing_indexes. This is a low-risk, 
purely additive migration — safe to run anytime.
```

## FIX 14 — Stalled Job Recovery (FEAT-06 / SEC-04)
```
In backend/src/services/worker.js, add a periodic sweep separate from the main 
poll loop: every 60 seconds, find jobs where status = 'processing' AND updatedAt 
is older than 5 minutes ago, and reset them to 'pending' (add a retryCount field 
to the Job model if you want a max-retry cap — increment it on each reset, and 
mark permanently 'failed' if retryCount exceeds e.g. 3). This handles the case 
where a worker process crashes mid-job and leaves it stuck forever. Start this 
sweep with its own setInterval in the JobWorker class's start() method, alongside 
the existing poll interval.
```

## FIX 15 — Dashboard Empty State (BUG-07)
```
Note: this significantly overlaps with Fix 9 (onboarding guard), which already 
redirects incomplete users away from Dashboard. After Fix 9 is in place, check 
whether this is still reachable at all (e.g. a user with skills+role but roadmap 
generation failed). If so, add a specific empty/error state component for that 
narrow case — "We couldn't generate your roadmap, try again" with a retry button 
— rather than a generic 0% Match display.
```

## FIX 16 — User Profile Management Page (FEAT-02)
```
Create a new /profile page and backend endpoints for basic account management:
GET /api/v1/auth/profile (full user details), PUT /api/v1/auth/profile (update 
email — re-check uniqueness), PUT /api/v1/auth/password (requires current 
password + new password, re-hash with bcrypt). Reuse the account-deletion 
confirmation pattern from Fix 12 for any destructive/sensitive change. Keep 
the frontend to one simple form-based page — this is polish, not a priority 
feature, so don't over-invest in UI here if time is short.
```

## FIX 17 — Data Export (original SRS Feature 9) — CUT CANDIDATE
```
Add GET /api/v1/roadmap/export?format=json returning the full roadmap + skills 
+ profile as JSON (trivial — just serialize existing data, no new logic needed). 
For PDF export, use a lightweight library like pdfkit or pdf-lib (NOT a headless 
browser/puppeteer — too heavy for your performance budget) to generate a simple 
formatted document server-side. Make this async if generation exceeds ~2 seconds. 
Frontend: an "Export" button on the Dashboard offering both format options.
If you're low on time, implement JSON export only and skip PDF — it's a much 
smaller task and still satisfies "export your data" as a demo-able feature.
```

## FIX 18 — Hardcoded Data → Database-Driven (FEAT-08) — CUT CANDIDATE
```
Move the hardcoded SKILLS_LIST array (in extractor.js) and CERTIFICATION_DATABASE 
(in roadmap.generator.js) into database tables (e.g. a new SkillCatalog and 
Certification model), seeded once via a script similar to seedRoles.js. This is 
a pure architecture-cleanliness improvement with no user-facing benefit — only 
worth doing if you have genuine spare time and want to demonstrate a more 
DB-driven design to judges. Skip entirely if time is tight.
```
