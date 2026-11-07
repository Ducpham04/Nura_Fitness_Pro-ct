---
name: FitChallenge
description: AI fitness and nutrition product with sport-tech customer UI and clean operational admin UI.
colors:
  obsidian: "#050505"
  dark-bg: "#0A0A0C"
  charcoal: "#121216"
  surface: "#18181C"
  lime: "#CCFF00"
  lime-dark: "#99CC00"
  electric: "#007AFF"
  electric-dark: "#0055CC"
  success: "#30D158"
  warning: "#FF9500"
  danger: "#FF3B30"
  text-primary: "#F8F8F8"
  text-secondary: "#A0A0A0"
  text-muted: "#707070"
  admin-bg: "#F1F5F9"
  admin-surface: "#FFFFFF"
  admin-border: "#E2E8F0"
  admin-text: "#0F172A"
typography:
  display:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary-user:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.obsidian}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-primary-admin:
    backgroundColor: "#059669"
    textColor: "{colors.admin-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  card-user:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "24px"
  card-admin:
    backgroundColor: "{colors.admin-surface}"
    textColor: "{colors.admin-text}"
    rounded: "{rounded.md}"
    padding: "20px"
---

# Design System: FitChallenge

## 1. Overview

**Creative North Star: "Controlled Energy".**

FitChallenge uses a hybrid product system. Customer-facing screens should feel like a premium sport-tech cockpit: dark, focused, energetic, and responsive. Admin screens should feel like a modern operational console: clear, light, scannable, and restrained.

The system rejects uncontrolled neon, fake dashboards, cramped tables, over-rounded game UI, excessive glass effects, and stale enterprise screens. Visual energy is allowed only when it improves action, progress, or feedback.

**Key Characteristics:**

- Sport-tech customer UI with dark layered surfaces.
- Clean SaaS admin UI with light surfaces and dense data patterns.
- Lime accent used sparingly for key actions and progress.
- Inter for readable product text, Space Grotesk for confident headings.
- Subtle state feedback instead of decorative motion.

## 2. Colors

The palette is intentionally split by surface role: dark sport-tech for customers, light operational SaaS for admin.

### Primary

- **Controlled Lime** (#CCFF00): Primary customer CTA, active progress, high-value success moments. Use on less than 10 percent of a screen.
- **Operational Emerald** (#059669): Primary admin action color. Use instead of neon lime on admin screens to reduce eye strain.

### Secondary

- **Electric Blue** (#007AFF): AI hints, secondary highlights, analysis states, and informational accents.
- **Lime Dark** (#99CC00): Hover or pressed state for lime buttons when contrast remains strong.

### Tertiary

- **Success Green** (#30D158): Completed states and positive validation.
- **Warning Orange** (#FF9500): Budget risk, low stock, caution, and non-blocking warnings.
- **Danger Red** (#FF3B30): Destructive actions and critical errors.

### Neutral

- **Obsidian** (#050505): Deep customer app backdrop. Avoid absolute black as a design shortcut.
- **Dark Background** (#0A0A0C): Main dark page background.
- **Charcoal** (#121216): Customer cards and shell surfaces.
- **Surface Graphite** (#18181C): Raised customer panels.
- **Admin Mist** (#F1F5F9): Admin page background.
- **Admin Paper** (#FFFFFF): Admin panels, tables, and forms.
- **Admin Border** (#E2E8F0): Admin dividers and field borders.
- **Text Primary** (#F8F8F8): Main text on dark surfaces.
- **Admin Text** (#0F172A): Main text on admin surfaces.

### Named Rules

**The 60-30-10 Rule.** Customer UI should read as roughly 60 percent dark background, 30 percent neutral content, and 10 percent lime/electric accent.

**The Admin Calm Rule.** Admin screens do not use neon lime as the dominant action color. Use emerald, slate, and white surfaces.

## 3. Typography

**Display Font:** Space Grotesk, sans-serif  
**Body Font:** Inter, sans-serif  
**Label Font:** Inter, sans-serif

**Character:** Space Grotesk gives the product its sport-tech confidence. Inter keeps tables, forms, and dense dashboards readable.

### Hierarchy

- **Display** (700, 32px, 1.1): Page titles, major dashboard numbers, workout state headings.
- **Headline** (700, 24px, 1.2): Section headers and modal titles.
- **Title** (700, 18px, 1.3): Card titles, table section titles, compact panel headings.
- **Body** (400, 14px, 1.5): Main content, table cells, descriptions, form helper text.
- **Label** (700, 12px, 0.12em, uppercase only when useful): Field labels, status captions, metric labels.

### Named Rules

**The Two-Font Rule.** Do not introduce a third font family without an explicit design-system update.

**The Dashboard Density Rule.** Admin tables and forms use smaller type with strong alignment. Customer dashboards may use larger type for motivation and progress.

## 4. Elevation

Customer surfaces use tonal layering, soft borders, and restrained glass effects. Admin surfaces use mostly flat white cards, subtle borders, and low shadows for separation. Shadows should support hierarchy, not create spectacle.

### Shadow Vocabulary

- **Customer Hover Lift** (`0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(204, 255, 0, 0.12)`): Rarely for important interactive dark cards.
- **Admin Card Shadow** (`0 1px 2px rgba(15, 23, 42, 0.06)`): Default admin panel/table separation.
- **Admin Modal Shadow** (`0 24px 64px rgba(15, 23, 42, 0.22)`): Dialogs and focused workflows.

### Named Rules

**The Flat-First Admin Rule.** Admin pages are flat by default. Use borders and spacing before shadows.

**The Glass Restraint Rule.** Glassmorphism is allowed only on customer app surfaces where depth helps focus. Do not use decorative blur across admin tables.

## 5. Components

### Buttons

- **Shape:** Customer buttons can use rounded-full or 24px radius when they are primary sport-tech actions. Admin buttons use 8px radius.
- **Customer Primary:** Lime background, obsidian text, Space Grotesk or bold Inter, clear hover feedback.
- **Admin Primary:** Emerald background, white text, compact 10px by 16px padding, no glow.
- **Secondary:** Neutral border and subtle background change on hover.
- **Destructive:** Red text or red-tinted background, never lime.

### Chips

- **Customer Style:** Dark translucent background, subtle border, lime/electric only for active or success states.
- **Admin Style:** Slate or emerald-tinted backgrounds, compact height, clear text labels.

### Cards / Containers

- **Customer Cards:** Dark charcoal/surface backgrounds, 16px to 24px radius, subtle border, optional glass.
- **Admin Cards:** White background, 12px radius, slate border, compact padding, low shadow.
- **No Nested Cards:** Do not put full card surfaces inside other full cards unless it is a modal or repeated item list.

### Inputs / Fields

- **Customer Inputs:** Dark translucent fields, white text, lime focus border only when active.
- **Admin Inputs:** White fields, slate border, emerald focus ring, compact vertical rhythm.
- **Errors:** Red text plus message. Do not rely on border color alone.

### Navigation

- **Customer Navigation:** Dark shell with clear active route and limited accent use.
- **Admin Navigation:** Dark or neutral sidebar, high readability, module labels in plain language, no marketing copy.
- **Route Guard Clarity:** Admin and customer flows should not redirect through onboarding incorrectly.

### Tables

- **Admin Tables:** White surface, slate dividers, compact row height, sticky or clear headers when possible, right-aligned actions.
- **Hover:** Light slate row hover only.
- **Actions:** Icon buttons with accessible titles. Destructive actions must be visually distinct.

### Modals

- **Admin Modals:** White, compact, form-first, clear title, cancel and save actions aligned right.
- **Customer Modals:** Dark, focused, immersive only when the task benefits from it.

## 6. Do's and Don'ts

### Do

- Use lime sparingly for the most important customer actions.
- Keep admin screens light, scannable, and operational.
- Use real API data in dashboards and tables.
- Provide loading, empty, error, and success states for CRUD flows.
- Keep table columns aligned and action buttons predictable.
- Prefer progressive disclosure over cramming every field into one screen.

### Don't

- Do not make every screen neon, glowing, or cyberpunk.
- Do not use mock data in admin production workflows.
- Do not use more than two primary font families.
- Do not over-round cards into game-like pills.
- Do not use decorative borders that compete with content.
- Do not create cramped admin pages with inconsistent spacing.
- Do not rely on AI-like generic SaaS card grids.
