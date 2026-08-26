# Implementation Roadmap — Chat Feature (Base + Hybrid Grounding)
Combines 09_CHAT_FEATURE_PLAN.md's phases with the new routing/grounding layer.
**Phases 1-5 are the core, reliable feature. Phases 6-9 are a stretch layer —
do not start them until 1-5 are fully built and tested end-to-end.**

---

## ✅ Phases 1-5 — Base Chat (context-injection only)
Full detail in 09_CHAT_FEATURE_PLAN.md §11. Summary:

| Phase | Contents | Priority |
|---|---|---|
| 1 | DB models (ChatSession, ChatMessage, CertificationProgress), interests field, LLM provider adapter (Groq) | Must-have |
| 2 | Context builder, chat session endpoints, streaming message endpoint | Must-have |
| 3 | Chat widget UI, streaming render, transparency chip, starter prompts | Must-have |
| 4 | Rate limiting, token caps, security tests (data isolation, prompt injection) | Must-have |
| 5 | Certification tracking tie-in | Nice-to-have |

**Do not proceed past this line until Phases 1-4 pass their acceptance criteria 
(09_CHAT_FEATURE_PLAN.md §12).** A working, reliable personal-chat is a stronger 
demo than a half-working hybrid one.

---

## 🔶 Phase 6 — Intent Router (STRETCH)
- [ ] Implement classification step (FEATURE C1) — heuristic or lightweight LLM call
- [ ] Wire router as the entry point to the existing chat message endpoint: 
  route to the existing personal-path handler (Phase 2's logic, unchanged) on 
  `personal`, or the new grounded handler (Phase 7) on `general`/`hybrid`
- [ ] Confirm default-to-`personal` behavior on any classification failure
- [ ] Test: verify existing personal-chat behavior (Phases 1-5) is completely 
  unchanged for `personal`-classified messages — this phase should be purely 
  additive, never a regression risk to what already works

**Dependency:** requires Phases 1-4 complete and stable.

---

## 🔶 Phase 7 — Gemini Grounding Integration (STRETCH)
- [ ] Add `GEMINI_API_KEY` to env config
- [ ] Build Gemini provider adapter implementation with `google_search` tool enabled (FEATURE C3)
- [ ] Implement grounded-path timeout + honest failure messaging
- [ ] Test with a genuinely current-events question to confirm live grounding 
  actually works (not just that the API call succeeds — verify the content is 
  actually current, not the model's stale training knowledge)

**Dependency:** requires Phase 6 (router) to direct traffic here.

---

## 🔶 Phase 8 — Citation UI (STRETCH)
- [ ] Parse `url_citation` annotations + `groundingMetadata` from Gemini responses (FEATURE C4)
- [ ] Build inline citation rendering component
- [ ] Handle the zero-citation edge case gracefully

**Dependency:** requires Phase 7 producing real grounded responses to render citations from.

---

## 🔶 Phase 9 — Hybrid Mode & Guardrails (STRETCH)
- [ ] Combine context-injection + `google_search` tool in one Gemini call for 
  `hybrid`-classified messages (FEATURE C5)
- [ ] Implement grounded-path rate limiter, server-side enforced (FEATURE C6)
- [ ] Full end-to-end test: one `personal`, one `general`, one `hybrid` message 
  in the same session, confirming each takes the correct path with correct latency/citation behavior

**Dependency:** requires Phases 6-8 all working.

---

## Cut-Line Guidance (if time runs out)
If you're tight on time, cut in this order, stopping wherever you run out of time:
1. Phase 9 (hybrid mode) — cut first, `general` and `personal` alone are still a strong demo
2. Phase 8 (citation UI) — cut second; if cut, also cut Phase 7 (grounding without 
   visible citations undermines the whole "accuracy/trust" point of adding it)
3. Phases 6-7 together — cut last if needed; the base chat (Phases 1-5) alone is 
   already a genuine differentiator and fully satisfies your original personalization goal

**Never cut into Phases 1-5** to make room for the grounding layer — the base 
chat is the reliable core; the grounding layer is the polish on top.
