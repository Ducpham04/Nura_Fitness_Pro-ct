# Product

## Register

product

## Users

FitChallenge serves two primary user groups.

Customer users are fitness-focused people who want AI-assisted training, meal planning, budget-aware nutrition, inventory support, progress tracking, challenges, and rewards. They use the product in short, repeated sessions: checking today's workout, starting pose analysis, reviewing meal plans, updating food inventory, and tracking progress. The user app should feel energetic, premium, and focused without becoming visually noisy.

Admin users operate the system behind the scenes. They manage users, challenges, training plans, foods, dishes, recipes, rewards, transactions, body data, and system statistics. Their context is operational: they scan tables, compare records, edit master data, and need clear feedback when CRUD actions succeed or fail. Admin screens must favor readability, density, and predictable workflows over brand spectacle.

## Product Purpose

FitChallenge is an AI-powered fitness and nutrition platform. It combines AI pose analysis, personalized training, Smart Meal Plan generation, ingredient inventory, body metrics, gamified challenges, and reward flows.

Success looks like:

- Customers can quickly understand what to do today, train safely, eat within budget, and see measurable progress.
- The AI feels explainable and useful, not mysterious or decorative.
- Admins can confidently maintain master data and monitor system health without digging through Swagger or database rows.
- Product surfaces remain fast, readable, and coherent across desktop and mobile.

## Brand Personality

Three words: precise, energetic, premium.

The customer-facing voice is motivational but not cheesy, technical but accessible, and confident without sounding inflated. The product should feel like a capable AI coach and nutrition assistant, not a generic fitness tracker.

The admin voice is calm, direct, and operational. It should help administrators make decisions quickly and avoid mistakes when editing production data.

## Anti-references

- No excessive cyberpunk, uncontrolled neon, heavy glow, or rainbow UI.
- No mock dashboards that pretend to be operational but do not use real data.
- No cramped layouts with narrow columns, inconsistent spacing, or dense text blocks that cannot breathe.
- No visual noise from too many font families, decorative borders, competing accents, or oversized rounded cards.
- No childish game-like cards, pill-shaped everything, or excessive glassmorphism.
- No stale enterprise UI: tables should be clean and scannable, with subtle hover and responsive feedback.
- No black absolute backgrounds as the only visual strategy. Dark surfaces must be tinted and layered.

## Design Principles

1. **Product utility before spectacle.** The app can feel premium and energetic, but every surface must make the user's next action clearer.
2. **Hybrid by role.** Customer app surfaces use sport-tech premium dark mode; admin surfaces use clean operational SaaS patterns.
3. **AI must be explainable.** Recommendations, scores, meal plans, and pose analysis should show enough context for users to trust them.
4. **Data should be scannable.** Tables, metrics, lists, and dashboards must prioritize hierarchy, alignment, and predictable actions.
5. **Neon is earned.** Lime accent is reserved for primary actions, progress highlights, and key success states. It must not dominate the surface.
6. **Responsive feedback matters.** Use subtle hover, focus, loading, empty, and error states so the product feels reliable.

## Accessibility & Inclusion

FitChallenge targets WCAG 2.1 AA as the baseline.

- Maintain strong contrast on dark user surfaces and light admin surfaces.
- Respect reduced motion preferences and avoid motion that affects layout.
- Keep touch targets at least 44px on mobile.
- Do not rely on color alone to communicate state.
- Preserve readable type sizes in dashboards, tables, forms, and workout HUDs.
- Ensure admin tables and forms remain keyboard navigable and screen-reader understandable.
