# Security Specification — SkillForge AI

This document exists because "we'll add security later" is how student hackathon projects leak resumes and API keys. Treat this as non-optional, not a stretch goal.

---

## 1. Threat Model (what we're actually defending against)

| Threat | Why it matters here | Mitigation |
|---|---|---|
| Resume data leaking to another user | Resumes contain PII (name, phone, address, work history) | Strict per-user query scoping; no client-supplied user_id trusted for data access |
| API key exposure (LLM provider) | Leaked key = billing abuse on your account | Server-side only, env var, never in frontend bundle or git history |
| Brute-force login | Account takeover | Rate limiting + bcrypt hashing (slow by design) |
| Malicious file upload | RCE, storage abuse, XSS via crafted file | Strict MIME/type validation server-side, size caps, no execution of uploaded content |
| Prompt injection via resume content | A malicious resume could try to manipulate the LLM's output/instructions | Treat resume text as untrusted data, not instructions; use system-prompt separation; validate LLM output against a strict schema before trusting/rendering it |
| XSS from user-editable fields (skills, notes) | Stored XSS via skill names etc. | Sanitize/escape all user input on render; use a framework that auto-escapes (React does by default — don't use `dangerouslySetInnerHTML` on user content) |
| Session hijacking | Stolen token = account access | HTTP-only, Secure, SameSite cookies; short expiry + refresh |
| Data retained after account deletion | Privacy violation, GDPR-style concerns even for a demo | Cascade delete verified with a test |

---

## 2. Authentication & Session Security
- Passwords: bcrypt or argon2, cost factor tuned so hashing takes ~100-250ms (balance security vs. server load)
- Never log passwords, tokens, or full resume text
- Session tokens: HTTP-only, `Secure`, `SameSite=Strict` cookies — not localStorage
- Token expiry: short-lived access token (e.g., 15-30 min) + refresh token pattern if time allows; for hackathon MVP, a single reasonably-short-lived session token is acceptable if documented as a known simplification
- Generic error messages on login failure (don't reveal "email not found" vs "wrong password" separately)

## 3. Authorization & Data Isolation
- Every DB query that touches user data MUST filter by the authenticated user's ID derived from the verified session/token — never from a request body/query param the client controls
- Write an explicit test: "User A cannot fetch User B's roadmap by guessing/incrementing an ID"

## 4. File Upload Security
- Validate file type by actual content inspection (magic bytes), not just file extension
- Enforce size limit server-side (5MB) regardless of client-side check
- Store uploaded files in object storage outside the web root, never directly executable
- Generate a random storage key/filename — never trust or reuse the user-supplied filename directly on disk
- Virus/malware scanning is a stretch goal (mention as future work if not implemented) — at minimum, never execute or `eval` uploaded content

## 5. LLM Integration Security
- Resume/user content is passed to the LLM as **data**, clearly delimited from system instructions (e.g., using structured message roles, not string-concatenating user text into the instruction itself)
- Always validate/parse the LLM's JSON output against an expected schema before storing or rendering it — treat LLM output as untrusted too
- Set request timeouts (~20s) and handle failures without exposing internal error details/stack traces to the client
- API key stored in backend environment variables / secrets manager only; confirm it never appears in any frontend network request (check browser dev tools Network tab as a manual test)

## 6. Transport & Infra Security
- HTTPS enforced everywhere (most free-tier hosts do this by default — verify it's not silently falling back to HTTP)
- CORS configured to allow only your actual frontend origin, not `*`
- Security headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (most frameworks have a one-line helper for this — use it, don't hand-roll)

## 7. Rate Limiting
- Auth endpoints: ~5 requests / 15 min per IP+email
- Resume upload / roadmap generation endpoints: rate-limited per user (e.g., 10/hour) to prevent LLM cost abuse and CPU exhaustion from repeated triggering

## 8. Privacy & Data Retention
- Account deletion cascades across: user record, skills, resume file (object storage), roadmap versions, progress records
- Do not retain resume files longer than necessary — for a hackathon demo, document your retention choice explicitly in the README (e.g., "resumes deleted automatically after 30 days" or "on account deletion only")
- Do not log full resume text or full LLM prompts containing PII in plaintext application logs

## 9. Pre-Submission Security Checklist
- [ ] No secrets in git history (`git log -p | grep -i api_key` style check)
- [ ] `.env` in `.gitignore`, `.env.example` committed instead
- [ ] Manual test: try accessing another user's data by ID manipulation — confirm it's blocked
- [ ] Manual test: upload a non-PDF/DOCX renamed with a `.pdf` extension — confirm it's rejected
- [ ] Manual test: check Network tab in browser — confirm no LLM API key visible in any frontend-originated request
- [ ] Confirm HTTPS on the deployed URL
- [ ] Confirm rate limiting triggers correctly on repeated rapid requests
