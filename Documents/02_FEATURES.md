# Feature Specification — SkillForge AI
Copy-paste each feature block individually as a ticket/prompt for implementation.

---

## FEATURE 1: User Authentication

**Description:** Users can register, log in, and log out securely. Sessions persist across page reloads.

**Requirements:**
- Email + password registration with email format validation and password strength check (min 8 chars, 1 number)
- Passwords hashed with bcrypt (cost factor ≥ 10) before storage — never log or store plaintext
- Login issues a short-lived JWT (or secure HTTP-only session cookie) — do NOT store tokens in localStorage (XSS risk); use HTTP-only cookies
- Logout invalidates the session/token
- "Forgot password" flow (can be simplified to a reset-link email for MVP)
- Rate limit login attempts (e.g., 5 attempts / 15 min per IP+email) to prevent brute force

**Acceptance Criteria:**
- [ ] Cannot register with a duplicate email
- [ ] Cannot log in with wrong password (generic error message — do not reveal whether email exists)
- [ ] Session persists after refresh
- [ ] Protected routes redirect unauthenticated users to login
- [ ] Password never appears in logs, network responses, or DB in plaintext

---

## FEATURE 2: Resume Upload & Parsing

**Description:** User uploads a PDF/DOCX resume; system extracts raw text then structures it via NLP/LLM into skills, education, experience, certifications.

**Requirements:**
- File type validation (PDF/DOCX only) and size cap (5MB) enforced both client-side and server-side (never trust client-side-only validation)
- Extraction pipeline: (1) extract raw text (e.g., via a PDF/DOCX parsing library) → (2) send structured extraction prompt to LLM requesting JSON output → (3) validate JSON schema before saving
- Run as an **async background job**, not inline in the HTTP request — return a job ID immediately, poll or use websocket/SSE for completion status
- Store the parsed structured data in DB; store the original file in object storage (not local disk), encrypted at rest
- Handle parsing failure gracefully (corrupted file, scanned/image-only PDF) with a clear error and manual-entry fallback

**Acceptance Criteria:**
- [ ] Non-PDF/DOCX files rejected with clear error
- [ ] Files >5MB rejected before upload completes
- [ ] Upload does not block the UI — progress/status shown
- [ ] LLM output validated against a schema; malformed responses trigger a retry (max 2 retries) before falling back to manual entry
- [ ] Original file is never processed inline on the request thread — always via the job queue

---

## FEATURE 3: Skill Profile Management

**Description:** User can view all extracted + manually added skills, edit proficiency, delete incorrect entries.

**Requirements:**
- Editable skill list UI (add/remove/edit) with proficiency selector (Beginner/Intermediate/Advanced)
- Changes saved via API with optimistic UI update + rollback on failure
- Skills stored as normalized records (skill_name, proficiency, source: "extracted" | "manual"), not a free-text blob — needed for later matching/recommendation logic

**Acceptance Criteria:**
- [ ] Adding/removing a skill updates instantly in UI and persists after refresh
- [ ] Duplicate skill names are prevented/merged (case-insensitive)
- [ ] Proficiency changes are reflected in subsequent roadmap regeneration

---

## FEATURE 4: Target Role / Interest Selection

**Description:** User selects or types a target role to anchor all downstream recommendations.

**Requirements:**
- Autocomplete dropdown of common roles (seeded list, e.g. 20-30 roles) + free-text option for anything not listed
- Selected role stored on user profile; changing it should prompt "regenerate roadmap?" rather than silently going stale

**Acceptance Criteria:**
- [ ] Role selection is required before roadmap generation is triggered
- [ ] Changing role after a roadmap exists gives the user an explicit choice to regenerate

---

## FEATURE 5: Personalized Roadmap Generation

**Description:** Core AI feature — generates an ordered roadmap from current skills → target role.

**Requirements:**
- Backend constructs a structured prompt containing: user's current skills+proficiency, target role, and a **curated reference dataset** of skills-per-role (do not rely purely on the LLM's own knowledge — ship a small curated JSON of role→required-skills to ground the output; this is also your "not just a GPT wrapper" differentiator)
- LLM asked to output structured JSON: ordered list of {topic, subtopics[], estimated_hours, resource_links[], milestone_project}
- Response streamed to frontend (token streaming or incremental JSON) so user sees progress within ~2s rather than waiting the full 12s
- Roadmap saved to DB, versioned (so regenerating doesn't destroy progress on the old one without confirmation)
- Cache identical (skills-hash + role) requests for 1 hour to reduce redundant LLM calls

**Acceptance Criteria:**
- [ ] Roadmap output is valid structured data, not a raw text blob dumped into the UI
- [ ] Generation shows a loading/progress state, never a frozen screen
- [ ] Regenerating does not silently delete prior progress tracking
- [ ] If LLM call fails/times out (20s), user sees a retry option, not a crash

---

## FEATURE 6: Project & Certification Recommendations

**Description:** For each major skill gap, recommend 1-2 concrete projects and relevant certifications.

**Requirements:**
- Derived from the same gap-analysis data used in Feature 5 (do not re-run a separate expensive LLM call from scratch — reuse context)
- Each recommendation includes: title, 1-2 line rationale ("why this helps"), difficulty tag, and (for certs) whether it's free/paid

**Acceptance Criteria:**
- [ ] Every recommendation is traceable to a specific skill gap (not generic filler)
- [ ] No duplicate recommendations across regenerations for the same profile+role

---

## FEATURE 7: Interview Preparation Resources

**Description:** Generates role-specific technical + behavioral interview questions with answer outlines.

**Requirements:**
- Minimum 10 technical + 5 behavioral questions per role
- Answer outlines (bullet points), not full scripted answers — encourages active prep over memorization
- Cacheable per role (interview questions for "Backend Developer" don't need to be regenerated per user — only the emphasis/weighting might change based on their skill gaps)

**Acceptance Criteria:**
- [ ] Questions are relevant to the selected role (spot-check against role keyword)
- [ ] Cached role-level question sets reduce duplicate LLM spend

---

## FEATURE 8: Progress Tracking Dashboard

**Description:** Visual dashboard showing roadmap completion status and skill growth.

**Requirements:**
- Status toggle per roadmap item: Not Started / In Progress / Completed
- Dashboard charts: overall completion %, time-based skill growth (simple line/bar chart), category breakdown
- All chart data computed server-side from stored progress records — no client-side recomputation of source-of-truth data

**Acceptance Criteria:**
- [ ] Status changes persist and immediately reflect in chart
- [ ] Dashboard loads under 2s even with a fully populated roadmap
- [ ] Charts have empty states for new users (no data yet)

---

## FEATURE 9: Data Export

**Description:** Export roadmap + profile as PDF or JSON.

**Requirements:**
- PDF export uses a lightweight server-side generator (avoid heavy headless-browser rendering if possible, for CPU reasons — prefer a direct PDF-generation library)
- JSON export is the full structured roadmap (useful for judges to inspect data quality)

**Acceptance Criteria:**
- [ ] Export completes without freezing the UI (async if >2s)
- [ ] Exported PDF is readable and correctly formatted

---

## FEATURE 10: Session & Data Privacy Controls

**Description:** Account deletion removes all user data.

**Requirements:**
- "Delete my account" requires password re-confirmation
- Deletion cascades: profile, resume file (object storage), roadmap, progress records — verify no orphaned records remain
- Deletion is logged (audit trail) without retaining PII in the log itself

**Acceptance Criteria:**
- [ ] After deletion, no API call can retrieve any of that user's data
- [ ] Resume file is actually removed from storage, not just DB-flagged
