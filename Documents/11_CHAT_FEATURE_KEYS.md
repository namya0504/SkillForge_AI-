# Feature Specification — Hybrid Grounded Chat
Copy-paste each feature block individually as an Antigravity prompt/ticket.
Build in order: C1 → C2 (already in 09_CHAT_FEATURE_PLAN.md) → C3 → C4 → C5 → C6.

---

## FEATURE C1: Intent Classification Router

**Description:** Before generating any chat response, classify the message as 
`personal`, `general`, or `hybrid` to decide which path handles it.

**Requirements:**
- Implement as a fast, cheap step — either a lightweight LLM call with a tiny, 
  constrained prompt ("Classify this question as personal/general/hybrid. 
  Respond with ONE word only.") using your fastest/cheapest provider (Groq), 
  or a keyword-heuristic fallback if you want zero extra API latency
- On any classification failure or ambiguous result, default to `personal` — 
  never default to the more expensive grounded path on uncertainty
- Log the classification decision alongside each message for later debugging/tuning

**Acceptance Criteria:**
- [ ] "Why is Figma my top gap?" classifies as `personal`
- [ ] "What's the latest AWS certification path?" classifies as `general`
- [ ] "Given my skills, is the AWS cert still worth it in 2026?" classifies as `hybrid`
- [ ] A garbled/ambiguous message defaults to `personal`, not `general`
- [ ] Classification adds under 300ms to total response time

---

## FEATURE C2: Personal Path (reference only — build per 09_CHAT_FEATURE_PLAN.md)

Already fully specified in 09_CHAT_FEATURE_PLAN.md §§4-7. No new work here beyond 
wiring it as the `personal` branch's handler once the router (C1) exists.

---

## FEATURE C3: Web-Grounded Path via Gemini

**Description:** For `general`/`hybrid` messages, call Gemini with the 
`google_search` grounding tool enabled and return a cited, current-information response.

**Requirements:**
- Add a Gemini provider implementation to your existing LLM adapter (see 
  09_CHAT_FEATURE_PLAN.md §5) — same `streamCompletion` interface shape, but 
  internally passes `tools: [{ google_search: {} }]` in the Gemini request
- Requires a separate `GEMINI_API_KEY` env var (Gemini and Groq are different 
  providers with different keys — don't assume they share credentials)
- Capture `groundingMetadata` (search queries executed) and inline `url_citation` 
  annotations from the response — these are returned alongside the text, not 
  something you compute yourself
- Set a reasonable timeout (this path is inherently slower — budget ~8-10s before 
  timing out, vs your existing 20s cap on other LLM calls, but tuned tighter 
  since users expect search to be snappy, not as slow as full roadmap generation)
- On timeout or grounding failure, fall back to a clear message ("I couldn't 
  search for current information right now") — never silently fall back to an 
  ungrounded, potentially stale answer without telling the user the citation 
  step failed

**Acceptance Criteria:**
- [ ] A `general` question returns a response with at least one visible citation 
  when Gemini's grounding successfully finds results
- [ ] A grounding failure/timeout shows an honest error state, not a silent 
  fallback to uncited content
- [ ] The `personal` path is completely unaffected by this feature (no shared 
  failure mode — a Gemini outage should never break personal-data chat)

---

## FEATURE C4: Inline Citation Rendering

**Description:** Display source citations in the chat UI, using the text-span 
annotations Gemini returns, so users can verify claims.

**Requirements:**
- Parse `url_citation` annotations (each with `start_index`/`end_index` mapping 
  to a span of the response text) and render them as inline clickable superscript 
  markers or a footnote-style source list below the message — pick whichever is 
  simpler to implement well over trying both
- Each citation must link to the actual source URL, opening in a new tab
- If Gemini returns `groundingMetadata` with search queries but no per-span 
  citations for a given response, fall back to showing a simple "Sources:" list 
  at the end of the message rather than leaving citations completely absent

**Acceptance Criteria:**
- [ ] Citations are visibly distinguishable from the response text (not buried/invisible)
- [ ] Clicking a citation opens the actual cited source
- [ ] A response with zero citations (rare, but possible if grounding found 
  nothing) doesn't show broken/empty citation UI — hide the citation area entirely
  in that case, and note in the response text that no sources were found (per FR-C3)

---

## FEATURE C5: Hybrid Mode

**Description:** For `hybrid`-classified messages, combine the user's personal 
context AND live web grounding in a single response.

**Requirements:**
- Build the personal context object exactly as in 09_CHAT_FEATURE_PLAN.md §6 
  (`buildUserContext()`)
- Pass it into the Gemini call's system/context alongside the `google_search` 
  tool enablement, so the model reasons over both simultaneously in one request 
  (not two separate calls stitched together — that would double latency and cost 
  for no benefit)
- Citations still apply here exactly as in C4 — a hybrid response should cite 
  its web-derived claims while personal-data claims (from context injection) 
  remain uncited, since they're the user's own stored data, not external sources

**Acceptance Criteria:**
- [ ] "Given my current skills, is X certification worth it right now?" produces 
  a response referencing BOTH the user's actual skill list AND current, cited 
  information about the certification
- [ ] Total latency for hybrid mode stays comparable to the general path (single 
  combined call, not two sequential calls)

---

## FEATURE C6: Cost & Query Guardrails

**Description:** Prevent runaway search-query costs from the grounded path.

**Requirements:**
- Separate rate limiter specifically for `general`/`hybrid` messages (e.g. 10 
  grounded messages / hour per user), distinct from your base chat rate limit 
  from 09_CHAT_FEATURE_PLAN.md §9
- Enforce server-side, checked before the Gemini call is made — never after
- When a user hits the grounded-path limit, they should still be able to use 
  the free `personal` path without interruption — the limits are independent, 
  not a shared pool

**Acceptance Criteria:**
- [ ] Exceeding the grounded-path limit blocks further `general`/`hybrid` 
  messages with a clear message, while `personal` messages continue working normally
- [ ] The limit check happens before any Gemini API call is made (verify by 
  checking your API usage/logs don't show calls past the limit)
