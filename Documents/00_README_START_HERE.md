# SkillForge AI — Doc Set Index

Read/feed these in this order. Each is self-contained enough to paste as its own prompt/context block into Antigravity (or any AI coding agent) or a human teammate's ticket.

1. **01_SRS.md** — full requirements spec. Give this to the agent FIRST as project-level context before any code generation, so it understands the whole scope, not just one feature.
2. **02_FEATURES.md** — 10 standalone feature blocks with acceptance criteria. Paste ONE feature at a time as a build prompt, in the order given in `03_TASKS.md`'s critical path.
3. **03_TASKS.md** — the actual build order + suggested team split. Follow the critical path: Phase 0 → 1 → 4 → 2 → 3 → 5, then parallelize.
4. **04_SECURITY.md** — non-negotiable checklist. Paste this alongside FEATURE 1 (Auth) and FEATURE 2 (Upload) prompts specifically, and run the full checklist in Phase 11.
5. **05_ARCHITECTURE.md** — stack choice, data model, and the async-worker pattern that satisfies the performance/CPU-load requirement. Give this to the agent before it writes any backend code so it doesn't put LLM calls inline in request handlers.
6. **06_UI_DESIGN.md** — visual direction. Give this to the agent before generating any frontend components so you don't end up with default-Bootstrap-purple-gradient look #4,381.

## How to actually use this with an AI coding agent (recommended flow)
1. Start a fresh session/context. Paste `01_SRS.md` + `05_ARCHITECTURE.md` together: "Here is the SRS and architecture for a project called SkillForge AI. Set up the project skeleton per Phase 0 and Phase 1 in the attached task list." (paste `03_TASKS.md` phase 0/1 too)
2. Once skeleton + auth work, move feature by feature: paste the specific `FEATURE N` block from `02_FEATURES.md` + relevant lines from `04_SECURITY.md` as you go.
3. Before frontend work on any given screen, paste the relevant section of `06_UI_DESIGN.md`.
4. Do the Phase 11 security pass and Phase 12 performance pass as their own dedicated sessions near the end — don't skip these because you're out of time; a working-but-insecure demo will get called out by judges who ask "so how do you stop me from seeing another student's resume?"

## Honest scope warning
With a beginner team and hackathon time constraints, the realistic MVP is Features 1-5 + a working dashboard (6-8). Features 9 (export) and full interview-prep depth (7) are the first things to cut if you're behind schedule — say so explicitly in your README as "future work" rather than shipping them half-broken. Judges respect an honest, well-scoped, fully-working MVP far more than an ambitious, broken one.
