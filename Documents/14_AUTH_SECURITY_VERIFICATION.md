# Auth & Security Verification Guide & Audit Report

Status: ✅ Verified & Hardened

---

## 1. Password & Registration Security

- [✅] **Duplicate email rejected**: Handled with unique constraint on `users.email` and clean `409 Conflict` response.
- [✅] **Password never stored in plaintext**: Hashed with `bcryptjs` using **12 salt rounds** before writing to PostgreSQL.
- [✅] **Password never returned by the API**: Stripped from all user objects (`id`, `email`, `isEmailVerified`, `createdAt`).
- [✅] **Password never logged**: Request bodies sanitized, passwords never printed to console logs.
- [✅] **Dynamic OTP Email Verification**: 6-digit cryptographic verification code sent via Nodemailer with 10-minute expiry and 60-second UI resend cooldown.

---

## 2. Login, Session & Cookie Security

- [✅] **Generic error on failed login**: Returns `"Invalid email or password"` for both missing emails and incorrect passwords to prevent user enumeration.
- [✅] **Cross-Origin Cookie Configuration**:
  - `HttpOnly: true` (prevents XSS token exfiltration)
  - `Secure: true` (strictly HTTPS in production)
  - `SameSite: 'None'` (permits cross-origin auth between Vercel and Render)
  - `maxAge: 7 * 24 * 60 * 60 * 1000` (7 days)
- [✅] **Silent Refresh Token Flow**: Access tokens (15m) paired with rotating refresh tokens (7d) via `/api/v1/auth/refresh`.
- [✅] **Clean Logout**: Removes both `token` and `refreshToken` cookies across all paths.

---

## 3. Data Isolation & Authorization (IDOR Defense)

- [✅] **Strict User Scoping**: All Prisma queries for skills, resumes, roadmaps, progress, and chat sessions are filtered strictly by `req.user.id` from the verified JWT.
- [✅] **Zero Client-Supplied User IDs**: No endpoint trusts client-supplied `userId` from `req.body` or `req.query`.
- [✅] **Session Ownership Checks**: Chat session reads, writes, and deletions cross-check `where: { id: sessionId, userId: req.user.id }`.

---

## 4. CORS & Network Security

- [✅] **Strict Origin Whitelist**: Checked in `security.js` against exact production Vercel domains (`https://skill-forge-ai-rose.vercel.app`, `https://skillforge-ai.vercel.app`) and local development origins.
- [✅] **Credentials Allowed**: `credentials: true` for HttpOnly cookie exchange.
- [✅] **Security Headers**: Helmet active with `xContentTypeOptions: true` (`nosniff`) and `xFrameOptions: 'deny'` (clickjacking prevention).

---

## 5. Rate Limiting

- [✅] **Auth Rate Limiter**: 10 attempts per 15 minutes on `/auth/login` and `/auth/register`.
- [✅] **General API Rate Limiter**: 100 requests per 15 minutes.
- [✅] **Chat Rate Limiter**: 40 messages per 15 minutes.

---

## 6. File Upload Security

- [✅] **Magic-Byte MIME Validation**: `fileValidator.js` validates file magic numbers (`%PDF-` for PDF, `PK\x03\x04` for DOCX) rather than trusting file extensions.
- [✅] **File Size Cap**: Strict 5MB limit enforced via Multer and file validator.
- [✅] **Path Traversal Protection**: All stored files use random UUID keys (`crypto.randomUUID()`) — original client filenames are never used as storage paths.

---

## 7. Account Deletion & GDPR Privacy

- [✅] **Full Database Cascade**: Cascades deletion across `skills`, `roadmaps`, `jobs`, `resumes`, `progress`, `chat_sessions`, and `certification_progress`.
- [✅] **Password Re-Authentication Required**: User must enter their current password to confirm account deletion.
