---
target: frontend/src/pages/HomePage.tsx
total_score: 25
p0_count: 0
p1_count: 2
timestamp: 2026-07-06T03-11-41Z
slug: frontend-src-pages-homepage-tsx
---
Method: dual-agent (A: 019f3565-149f-7d83-bc8c-9b7c2f9a36b0 · B: 019f3565-2725-7422-9f32-8a7ed4a8f0e9)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Strong status widgets, but refresh/loading feedback is thin. |
| 2 | Match System / Real World | 3 | Vietnamese fitness language works; score/program progress need explanation. |
| 3 | User Control and Freedom | 3 | Clear CTAs and collapsible details; floating AI can distract. |
| 4 | Consistency and Standards | 2 | Homepage local palette and desktop nav theme behavior diverge. |
| 5 | Error Prevention | 2 | Warnings exist, but next-step specificity is limited. |
| 6 | Recognition Rather Than Recall | 3 | Workout/diet cards are clear; calendars require interpretation. |
| 7 | Flexibility and Efficiency | 3 | Good direct routes to workout/diet/logbook; no power-user path. |
| 8 | Aesthetic and Minimalist Design | 2 | Strong look, but hero, mascot, glass metrics, AI border, and cards compete. |
| 9 | Error Recovery | 2 | Error state has retry, but full reload is heavy and low-diagnostic. |
| 10 | Help and Documentation | 2 | Empty/first-run nudges exist; AI score/progress logic is opaque. |
| **Total** | | **25/40** | **Solid, but needs hierarchy and trust polish.** |

## Anti-Patterns Verdict

LLM assessment: The current dashboard mostly avoids fake-dashboard slop because it is wired to real dashboard, nutrition, training, body metric, achievement, and AI services. The weak spots are spectacle-coded AI elements: the floating 3D mascot and rotating conic AI Coach border feel more decorative than task-supportive.

Deterministic scan: `node .agents/skills/impeccable/scripts/detect.mjs --json frontend/src/pages/HomePage.tsx` returned `[]`. No detector rules triggered and no file locations were reported.

Visual overlays: No reliable user-visible overlay is available. Browser access to `/dashboard` redirected to `/login` without authenticated E2E credentials, so the evidence path used source, route behavior, detector output, and the design-review agent's mocked visual pass.

## Overall Impression

The homepage has a strong product spine: it exposes workout, diet, adherence, progress, and AI guidance from real data. The biggest opportunity is to shift from “report-first dashboard” to “today-first action surface” so the user immediately knows what to do next.

## What's Working

1. Real data wiring gives the page more credibility than a generic fitness dashboard.
2. The workout and nutrition cards combine progress, next step, and CTA in a useful compact pattern.
3. The collapsed weekly-detail section is a good progressive-disclosure choice for repeat use.

## Priority Issues

**[P1] Floating AI mascot can obscure dashboard content**

Why it matters: Decorative AI should not cover the actual report. When it overlaps metrics or progress, it weakens trust.

Fix: Dock it as a predictable assistant button, reserve layout space for it, or fold it into the AI Coach card on mobile.

Suggested command: `$impeccable quieter frontend/src/pages/HomePage.tsx`

**[P1] Light-mode hero contrast is fragile**

Why it matters: The hero depends on image and scrim readability. If light mode or image brightness reduces contrast, the most important copy becomes harder to read.

Fix: Keep hero text treatment invariant across themes, strengthen the dark scrim, or place report copy on a stable dark overlay region.

Suggested command: `$impeccable audit frontend/src/pages/HomePage.tsx`

**[P2] Too many simultaneous next actions**

Why it matters: Customer users come for short repeated sessions. The page currently asks them to parse report, AI nudge, workout, diet, warning, calendars, achievements, and details.

Fix: Promote one primary Today action, group secondary insights lower, and make the report hero smaller after the first successful week.

Suggested command: `$impeccable layout frontend/src/pages/HomePage.tsx`

**[P2] Theme system is inconsistent across shell and page**

Why it matters: Homepage uses a local palette while desktop navigation remains hard-coded dark, so light mode can feel accidental.

Fix: Move palette decisions into shared tokens or make Navigation theme-aware on desktop.

Suggested command: `$impeccable colorize frontend/src/pages/HomePage.tsx`

**[P3] Score/progress metrics need explainability**

Why it matters: “Điểm /100” and “Tiến độ chương trình” motivate only when users understand what drives them.

Fix: Add a lightweight “vì sao có điểm này?” affordance or inline breakdown from the existing score formula.

Suggested command: `$impeccable clarify frontend/src/pages/HomePage.tsx`

## Persona Red Flags

First-time customer: The page scores and evaluates them before they understand the meaning of score, weekly goals, adherence, and AI Coach.

Returning high-intent user: Wants the next workout or meal fast, but the oversized report hero and AI nudge delay the direct action path.

Accessibility-sensitive user: Motion and floating UI can distract; reduced motion exists globally, but color-heavy calendars and animated AI still carry a lot of meaning and attention.

## Minor Observations

The error state uses `window.location.reload()` instead of the existing `refresh()` path.

The skeleton uses very rounded blocks, a little softer than the tighter product vocabulary.

Calendar states such as future, untracked, rest, and missed days could be clearer.

## Questions to Consider

1. What if the homepage were not “report first” but “do today's next thing” first?
2. Does the AI mascot earn its screen space, or should AI become quieter and more explainable?
3. Should customer light mode be first-class, or should the customer app stay sport-tech dark while admin owns light mode?
4. What would make “Điểm /100” feel trustworthy instead of like judgment?
