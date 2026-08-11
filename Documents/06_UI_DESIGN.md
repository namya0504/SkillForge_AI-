# UI/UX Design Goals — SkillForge AI

## 1. Design Principles
1. **Clarity over cleverness.** This is a tool students use while stressed about their career — every screen should reduce anxiety, not add cognitive load.
2. **Progress should feel visible and motivating.** Charts, checkmarks, and completion states are core to the product, not decoration.
3. **Never a blank/frozen screen.** Every async operation (parsing, generation) has a visible state.
4. **Mobile-first responsive**, since many students will access this on a phone.

## 2. Look & Feel Direction
Avoid the generic "purple gradient SaaS AI startup" look every hackathon AI demo has. Suggested direction:

- **Tone:** Calm, focused, "study desk" energy — not flashy sci-fi AI branding.
- **Color palette:** A grounded primary (deep teal or navy) + a warm accent (amber/coral) for progress/success states. Neutral off-white background rather than stark white, to reduce eye strain during study sessions.
  - Example palette: Primary `#0F4C5C` (deep teal), Accent `#F4A259` (warm amber), Success `#4C956C`, Background `#FAF7F2`, Text `#1B1B1F`
- **Typography:** One clean sans-serif for UI (e.g., Inter or system font stack), slightly larger base font size (16-18px) for readability during long study sessions. Avoid more than 2 font weights beyond regular/bold.
- **Iconography:** Simple line icons, consistent stroke width — avoid mixing icon styles (a common tell of a rushed hackathon UI).
- **Motion:** Minimal, purposeful — a progress bar filling, a checkmark animating on completion. No gratuitous animation.

## 3. Key Screens

### Landing Page
- One clear headline (what it does), one clear CTA ("Get your roadmap")
- No more than 3 supporting sections (how it works, example roadmap preview, trust/privacy note)

### Onboarding Flow (Upload → Confirm → Target Role)
- Single-column, step-indicator at top (Step 1 of 3 style) — reduces perceived complexity
- Resume upload: drag-and-drop zone + fallback file picker, immediate visual feedback on file selection
- Extracted skills confirmation screen: editable chips/tags, not a raw JSON dump — this is a common hackathon mistake (showing the AI's raw output instead of designing it)
- Target role: searchable dropdown with popular roles suggested first

### Dashboard (main screen)
- Left/top: roadmap as a vertical stepper or timeline — clearly shows sequence, not just a flat list
- Right/side panel: recommendations (projects/certs) and interview prep, tabbed
- Top: progress summary (completion %, a simple ring or bar chart)
- Each roadmap item: expandable card (topic → subtopics → resources → mark complete button)

### Progress/Analytics View
- Completion % ring or bar
- Skill growth over time (simple line chart — don't over-engineer with a dashboard-BI-tool look)
- Empty state for new users: encouraging message + CTA back to roadmap, not a blank chart

## 4. Accessibility Baseline
- Color contrast meeting WCAG AA minimum (test your palette, don't assume)
- All interactive elements keyboard-navigable
- Loading states use both a spinner AND text (not spinner-only, for screen readers)
- Form errors announced clearly, not just color-coded red

## 5. Judging-Specific UI Advice
Judges see many similar demos in a short time. Design choices that help you stand out fairly:
- Show the **structured skill-gap reasoning** visually (e.g., a simple "you have X, role needs Y, gap is Z" visual) — this makes your AI integration look deliberate rather than a black-box prompt-and-dump.
- Keep the demo account **pre-seeded** with a realistic example so judges see a populated dashboard immediately, not an empty state.
- Make loading states during the live demo look intentional (skeleton screens, not spinners on a blank page) — this alone reads as "production quality" versus "hackathon prototype."
