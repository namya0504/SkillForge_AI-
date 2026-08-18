# SkillForge AI — Database Schema & Data Flow Documentation

> **Last Updated:** 2026-08-18  
> **Database:** PostgreSQL (Supabase)  
> **ORM:** Prisma 7.9.1  
> **Connection:** PgBouncer on port 6543 (runtime) / Direct on port 5432 (migrations)

---

## Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ RESUME : "has many"
    USER ||--o{ SKILL : "has many"
    USER ||--o{ JOB : "has many"
    USER ||--o| ROADMAP : "has one"
    USER }o--o| ROLE_REFERENCE : "targets"

    USER {
        uuid id PK
        string email UK
        string password_hash
        string target_role_id FK
        string custom_target_role
        datetime created_at
        datetime updated_at
    }

    ROLE_REFERENCE {
        uuid id PK
        string title UK
        string category
        boolean is_popular
        string description
        string required_skills "JSON array"
        datetime created_at
    }

    RESUME {
        uuid id PK
        string user_id FK
        string storage_key
        string original_name
        string mime_type
        int file_size
        string parsed_status "pending|completed|failed"
        string parsed_data "JSON object"
        datetime created_at
        datetime updated_at
    }

    SKILL {
        uuid id PK
        string user_id FK
        string skill_name
        string proficiency "Beginner|Intermediate|Advanced"
        string source "extracted|manual"
        datetime created_at
    }

    JOB {
        uuid id PK
        string user_id FK
        string type "resume_parse"
        string status "pending|processing|completed|failed"
        string payload "JSON object"
        string result "JSON object"
        string error_msg
        datetime created_at
        datetime completed_at
    }

    ROADMAP {
        uuid id PK
        string user_id FK_UK
        string target_role_title
        string gap_analysis "JSON object"
        string milestones "JSON array"
        string recommendations "JSON object"
        datetime created_at
        datetime updated_at
    }
```

---

## Table Definitions

### 1. `users`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, Default `uuid()` | Unique user identifier |
| `email` | String | Unique, Not Null | User's email address |
| `password_hash` | String | Not Null | bcrypt-hashed password (12 salt rounds) |
| `target_role_id` | String | FK → `roles_reference.id`, Nullable | Selected curated role |
| `custom_target_role` | String | Nullable | Free-text custom role |
| `created_at` | DateTime | Default `now()` | Account creation timestamp |
| `updated_at` | DateTime | Auto `@updatedAt` | Last update timestamp |

### 2. `roles_reference`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, Default `uuid()` | Unique role identifier |
| `title` | String | Unique, Not Null | Role title (e.g., "Full Stack Web Developer") |
| `category` | String | Not Null | Category (e.g., "Engineering", "Data") |
| `is_popular` | Boolean | Default `false` | Featured in popular chips UI |
| `description` | String | Nullable | Role description |
| `required_skills` | String | Not Null | JSON string of `[{name, proficiency}]` |
| `created_at` | DateTime | Default `now()` | Seed timestamp |

### 3. `resumes`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, Default `uuid()` | Unique resume identifier |
| `user_id` | String | FK → `users.id`, Not Null | Owner user |
| `storage_key` | String | Not Null | File path/key in storage |
| `original_name` | String | Not Null | Original upload filename |
| `mime_type` | String | Not Null | File MIME type |
| `file_size` | Int | Not Null | File size in bytes |
| `parsed_status` | String | Default `"pending"` | `pending` → `completed` / `failed` |
| `parsed_data` | String | Nullable | JSON string of extracted data |
| `created_at` | DateTime | Default `now()` | Upload timestamp |
| `updated_at` | DateTime | Auto `@updatedAt` | Last update |

### 4. `skills`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, Default `uuid()` | Unique skill identifier |
| `user_id` | String | FK → `users.id`, Not Null | Owner user |
| `skill_name` | String | Not Null | Skill name |
| `proficiency` | String | Default `"Beginner"` | `Beginner` / `Intermediate` / `Advanced` |
| `source` | String | Default `"manual"` | `extracted` (from resume) / `manual` |
| `created_at` | DateTime | Default `now()` | Creation timestamp |

**Composite Unique:** `@@unique([userId, skillName])`

### 5. `jobs`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, Default `uuid()` | Unique job identifier |
| `user_id` | String | FK → `users.id`, Not Null | Owner user |
| `type` | String | Not Null | Job type (`resume_parse`) |
| `status` | String | Default `"pending"` | `pending` → `processing` → `completed`/`failed` |
| `payload` | String | Nullable | JSON input data |
| `result` | String | Nullable | JSON output data |
| `error_msg` | String | Nullable | Error message on failure |
| `created_at` | DateTime | Default `now()` | Enqueue timestamp |
| `completed_at` | DateTime | Nullable | Completion timestamp |

### 6. `roadmaps`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, Default `uuid()` | Unique roadmap identifier |
| `user_id` | String | FK → `users.id`, Unique | Owner (one roadmap per user) |
| `target_role_title` | String | Not Null | Role name at generation time |
| `gap_analysis` | String | Not Null | JSON: `{matchedSkills, levelGaps, missingSkills}` |
| `milestones` | String | Not Null | JSON: `[{phase, title, duration, topics, targetSkills}]` |
| `recommendations` | String | Not Null | JSON: `{projects: [...], certifications: [...]}` |
| `created_at` | DateTime | Default `now()` | First generation |
| `updated_at` | DateTime | Auto `@updatedAt` | Last regeneration |

---

## Relationships Summary

| Relationship | Type | Cascade Rule |
|-------------|------|--------------|
| User → Resume | One-to-Many | Cascade Delete |
| User → Skill | One-to-Many | Cascade Delete |
| User → Job | One-to-Many | Cascade Delete |
| User → Roadmap | One-to-One | Cascade Delete |
| User → RoleReference | Many-to-One | SetNull on delete |

---

## Data Flow Diagrams

### Registration Flow
```
Client POST /auth/register {email, password}
  → Normalize email → Check uniqueness
  → bcrypt hash (12 rounds)
  → prisma.user.create()
  → generateToken(userId) → Set cookie
  → Return {user}
```

### Resume Processing Pipeline
```
Client POST /resume/upload (multipart/form-data)
  → Multer validates (5MB, pdf/docx)
  → fileValidator checks magic bytes
  → Save file to storage
  → prisma.resume.create(parsedStatus: 'pending')
  → prisma.job.create(type: 'resume_parse', status: 'pending')
  → Return {resumeId, jobId}

Worker polls every 2s:
  → findFirst(status: 'pending') → update(status: 'processing')
  → Read file from storage
  → parser.extractText(buffer, mimeType) → raw text
  → extractor.extractStructuredData(text) → {skills, education, experience}
  → Upsert skills into Skill table (source: 'extracted')
  → Update resume.parsedData, resume.parsedStatus = 'completed'
  → Update job.status = 'completed'
```

### Roadmap Generation Flow
```
Client POST /roadmap/generate
  → Fetch user with skills + targetRole
  → Compute Gap Analysis Matrix:
      For each requiredSkill in targetRole:
        - If user has skill at >= required level → matchedSkills
        - If user has skill at < required level → levelGaps
        - If user doesn't have skill → missingSkills
  → Generate milestones (LLM or rule engine fallback)
  → Generate project recommendations (traceable to gaps)
  → Generate certification recommendations (from curated DB)
  → prisma.roadmap.upsert()
  → Return {roadmap}
```

---

## Known Schema Issues

> [!WARNING]
> **JSON fields stored as String:** Fields like `parsedData`, `gapAnalysis`, `milestones`, `recommendations`, `requiredSkills`, `payload`, and `result` are typed as `String` in Prisma. They store stringified JSON. This blocks PostgreSQL's JSONB querying, indexing, and partial update capabilities. Consider migrating to Prisma's `Json` type.

> [!WARNING]
> **Missing indexes:** `jobs.status`, `jobs.createdAt`, `resumes.user_id`, `skills.user_id`, `roles_reference.is_popular` lack database indexes. Worker polling on `jobs` does full table scans.

> [!NOTE]
> **Missing user profile fields:** `User` table lacks `name`, `avatar_url`, `phone` fields that a career platform would typically need.
