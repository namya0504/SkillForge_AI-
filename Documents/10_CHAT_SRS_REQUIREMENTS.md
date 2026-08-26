# SkillForge AI — SRS Addendum: Hybrid Grounded Chat
Extends 01_SRS.md and 09_CHAT_FEATURE_PLAN.md. Read those first — this document 
covers ONLY the new intent-routing and web-grounding layer, not the base chat feature.

---

## 1. Purpose

09_CHAT_FEATURE_PLAN.md specifies a chat feature grounded in the user's own 
structured data (context-injection). This addendum adds a second, selectively-triggered 
path: web-grounded answers with source citations, for questions that context-injection 
cannot answer (current events, up-to-date certification info, general career trends).

**Core design principle carried over from the base plan:** the personal-data path 
(context-injection) remains the default for every message. Web-grounding is an 
additional capability invoked only when needed — not a replacement, not always-on.

---

## 2. Functional Requirements

### FR-C1: Intent Classification
The system shall classify each incoming chat message into one of three categories 
before generating a response:
- `personal` — answerable from the user's own stored data (skills, roadmap, progress)
- `general` — requires current external/web information the system doesn't store
- `hybrid` — requires both (e.g. "given my skills, is X certification worth it right now")

Classification must add minimal latency (target: under 300ms) — a lightweight 
heuristic or a small/fast model call, not a slow reasoning step.

### FR-C2: Personal Path (Context-Injection)
For `personal`-classified messages, the system shall respond exactly as specified 
in 09_CHAT_FEATURE_PLAN.md §6 — no web search, no added latency, no additional cost 
beyond the base LLM call.

### FR-C3: General/Hybrid Path (Web-Grounded)
For `general` or `hybrid`-classified messages, the system shall call the Gemini API 
with the `google_search` grounding tool enabled, allowing the model to decide 
whether and how many search queries to run, and to synthesize a response from 
live web results.

### FR-C4: Citation Display
Every web-grounded response shall display its sources to the user. The system 
shall use Gemini's returned `groundingMetadata` (search queries executed) and 
inline `url_citation` annotations (text-span-to-source-URL mapping) to render 
visible source links directly in the chat UI — not just log them internally.

### FR-C5: Hybrid Mode
For `hybrid`-classified messages, the system shall combine the user's injected 
personal context (FR-C2's data) with the `google_search` tool in a single Gemini 
call, so the model can reason over both the user's specific situation and 
current external facts together.

### FR-C6: Cost & Query Guardrails
The system shall cap the number of grounded (web-search) messages a user can 
send per hour/day, tracked separately from the general chat rate limit, since 
grounded calls carry per-query billing (confirmed: Gemini 3 bills per unique 
search query executed within a request, which can exceed one per message if 
the model issues multiple queries).

---

## 3. Non-Functional Requirements

### 3.1 Latency Budget
| Path | Target first-token latency | Notes |
|---|---|---|
| `personal` | < 1s | Unchanged from base plan — no search step |
| `general` / `hybrid` | < 4-5s acceptable | Search + synthesis takes longer; UI must show a distinct "searching the web..." loading state, not the same instant-stream indicator used for personal answers, so the user understands why it's slower |

### 3.2 Accuracy & Trust
- Every claim in a grounded response that originates from search results must 
  have a visible, clickable citation — never present web-derived facts as if 
  they were the model's own knowledge.
- If the `google_search` tool returns no useful results, the system shall say so 
  honestly ("I couldn't find current information on this") rather than falling 
  back to an uncited, potentially outdated answer.
- **Known limitation to document honestly (not hide):** Gemini's grounding is a 
  managed retrieval system — the application does not control which sources are 
  selected or how they're ranked. This is an acceptable tradeoff for hackathon 
  scope, but should be stated plainly in your README, not glossed over.

### 3.3 Cost Control
- Grounded-path requests must never be triggered for `personal`-classified 
  messages under any circumstance — this is the primary cost control, since the 
  personal path is free of search billing entirely.
- Server-side enforcement of FR-C6's caps, not client-side only (a client-side 
  cap can be bypassed by directly calling the API).

### 3.4 Security
All security requirements from 09_CHAT_FEATURE_PLAN.md §9 apply unchanged 
(data isolation, prompt injection defense, output sanitization). Additionally:
- The intent classifier itself must not be manipulable by prompt injection to 
  force expensive grounded calls on every message — validate/sanity-check the 
  classifier's output, don't blindly trust a model-generated classification 
  without a fallback default (default to `personal` on ambiguous/failed 
  classification, since that's the free, low-risk path).

---

## 4. Out of Scope (this addendum)
- User-controlled source filtering/domain restriction (Gemini's managed grounding 
  doesn't expose this level of control without moving to a custom search pipeline — 
  documented as a future option, not built now)
- Combining grounding with your own future vector RAG layer (would only become 
  relevant if you build the custom unstructured-content RAG described in 
  09_CHAT_FEATURE_PLAN.md §13 — not needed for this addendum)
