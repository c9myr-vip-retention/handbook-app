# Design rules: C9MYR VIP Retention Handbook

The look and behaviour every screen follows. Read this before any UI change. If a change needs a rule that is not here, add the rule here in the same commit.

Source of truth for values: the tokens at the top of `src/styles.css`. This file explains them; it does not replace them.

## 1. Brief

- **What it is:** the department's SOPs, policies and culture, read on shift. Most visits are "find the rule, read it, go back to work".
- **Who reads it:** CS agents and seniors on desktop and phone; admins who edit.
- **Feel:** calm, clear, professional. Light by default, dark on request.
- **Brand:** the gold spade mark and the slogan "Winning Together! Growing Forever!", shared with the VIP Tracker console.

## 2. Principles

1. **Content first.** Chrome stays quiet so the SOP text carries the page.
2. **One accent.** Blue is the only colour for links, buttons and the current place. Gold is a brand touch, never a control.
3. **Structure means something.** Numbers only on real sequences (SOP steps, the 5 Pillars as the culture's own numbering). Borders, chips and labels only where they carry information.
4. **Works on a phone at the desk.** Every page must read at 390 px wide with no sideways page scroll.
5. **Everyone can use it.** Keyboard, screen reader and low vision are not extras (see section 10).
6. **Never invent content.** Anything marked `[CONFIRM ...]`, UNCONFIRMED or CONFLICT shows as an orange callout, never as fact.

## 3. Colour

Use tokens only; never hard-code a colour in a component. Every token has a light and a dark value, and text tokens pass WCAG AA on their surfaces.

| Token | Use |
|---|---|
| `--bg`, `--surface`, `--surface-2` | Page, cards and panels, subtle fills (table headers, chips) |
| `--border`, `--border-strong` | Dividers; control outlines |
| `--text`, `--muted`, `--faint` | Body text; secondary text; captions and metadata |
| `--accent`, `--accent-hover`, `--accent-soft` | Links, primary buttons, active nav, focus ring; soft fill for the active item |
| `--gold`, `--gold-tx`, `--gold-soft` | Logo, slogan, TC brand chips. Not for buttons or links |
| `--good`, `--planned`, `--external`, `--restricted`, `--pending` (+ `-soft`) | Status chips and callouts: rule, warning/unconfirmed, Lark link, admins only, coming soon |
| `--ch-*` | Flow chart shapes (see section 8) |
| `--edge` | Scroll shadow at a table edge |

Rules:
- **The accent stays blue** (decided 30 Sep 2026). Do not introduce a second accent.
- Something blue must be clickable, and something clickable must look it. Non-interactive chips are grey or gold.
- A new colour means a new token in both themes, with its contrast checked.

## 4. Type

- **Font:** Inter, one family. Weights 400 to 700 (650 for SOP headings; 800 only for the login wordmark).
- **Scale:** only these seven sizes, as tokens. Print uses pt and is separate.

| Token | Size | Role |
|---|---|---|
| `--fs-xs` | 12 px | Captions, metadata, table headers, small chips |
| `--fs-sm` | 13.5 px | Secondary text, nav, small buttons, tables, side panel |
| `--fs-md` | 15 px | Body text, buttons, section labels on home |
| `--fs-lg` | 17 px | SOP section headings (h2), lead text, inputs on phones |
| `--fs-xl` | 22 px | Card titles (sign-in states) |
| `--fs-2xl` | 28 px | Page title (h1); home title on phones |
| `--fs-3xl` | 34 px | Home title |

Rules:
- Never add a size outside the scale. If nothing fits, the design is wrong, not the scale.
- **No all-caps labels** and no letter-spaced eyebrow text. Labels are sentence-case headings. (The "C9MYR" wordmark is the only uppercase text, because it is the brand name.)
- Sentence case everywhere: headings, buttons, labels ("Standard operating procedure", "Page tools").
- Line length: 80 characters or fewer for reading text. Long paragraphs get a `max-width` in `ch`.
- Inline code may scale with its text (`.88em`).

## 5. Space, shape, depth

- **Spacing steps:** 4, 8, 12, 16, 24, 32 px. New work uses these. (Older CSS still has in-between values; move them onto the steps when you touch them.)
- **Radius:** `--r` 10 px for cards, tables, panels; `--r-sm` 7 px for buttons, inputs, callouts; 999 px for chips. The home hero uses 16 px as the one large surface.
- **Shadow:** `--shadow-sm` on hover and inputs; `--shadow` on floating things only (drawers, dialogs, sign-in card). Cards at rest are flat with a border.

## 6. Layout

| Width | Layout |
|---|---|
| over 1180 px | Sidebar (272 px), content (up to 960 px), Page tools panel (260 px) |
| 1180 px and under | Page tools becomes a drawer from the right, opened from the top-bar button |
| 880 px and under | Sidebar becomes a drawer from the left, opened from the menu button; page title leaves the top bar |
| 640 px and under | Phone: search behind an icon, wide tables as cards, single-column tiles, 44 px top-bar buttons |

- The top bar is sticky and holds: menu (narrow), back, page title, search, name and role, Approvals (admins), Page tools, theme, sign out.
- Content is left-aligned. Only the sign-in card is centred.

## 7. Components

- **Buttons:** primary (blue fill) for the one main action; ghost (outline) for the rest. Label says exactly what happens ("Save changes", "Sign in with Google"), and the result uses the same word.
- **Links in text and breadcrumbs:** blue, underline on hover, at least 24 px tall.
- **Chips:** status (`.chip.*`), version (`.chip.ver`), brand (`.brandchip`, TC in gold), role (`.rolechip`). Chips never act as buttons.
- **Callouts:** green rule, amber warning/unconfirmed, blue info. Title in bold, one short paragraph.
- **Tables:** header row on `--surface-2`, 12 px header text. Tables with 5 or more columns become one card per row on phones (step tables title each card "1. Step name"). Any table that still overflows shows edge shadows and is keyboard-scrollable. Bare URLs break anywhere so they never widen a table.
- **Section headings with Edit:** the Edit button sits beside the heading, never inside it, and has its own label ("Edit section Procedure").
- **Tiles (Daily essentials):** title plus section name, no numbers.
- **Side panel (Page tools):** On this page, small flow chart (hidden while the full chart is on screen), Related SOPs, What changed. No inner scrollbar.
- **Empty and error states:** say what happened and what to do next, in plain words. No apologies.
- **Quiz pages:** the intro is a briefing on the left (title, what is in the quiz, the reference) with one start panel on the right (time limit, facts, the main button, rules); the start panel is the only boxed element. While a quiz runs: question navigator on the left, question in the middle, reference on the right, none boxed. Below 1024 px the start panel follows the title.

## 8. Flow charts

- Written as ```` ```chart ```` text blocks, drawn by `src/Chart.jsx`, edited in the chart drawer. Never Mermaid, never screenshots.
- Shapes: teal rounded terminals, blue steps, amber decision diamonds, orange escalate, red stop. Short one-line labels.
- The main line sits in the middle of the frame; side branches converge back with right angles.
- Fit order: left to right, then top down centred, then top down tight, then shrunk to 70%, then scroll starting on the main line.
- Printed charts stay whole, up to 120 mm tall.

## 9. Words

- Plain, short, active. Name things by what staff know ("Page tools", "What changed"), not by how the system works.
- Sentence case, no filler, no exclamation marks except the slogan.
- **No em dashes** anywhere (house style).
- Role titles in content (ATL, Supervisor, Department Head), not names.

## 10. Accessibility floor

Every change must keep all of these true:

- Text contrast meets WCAG AA in light and dark.
- Visible focus ring on every control (`:focus-visible`, 2 px accent).
- Tap targets at least 24 px; 44 px for the phone top bar.
- Drawers and dialogs: focus moves in on open and returns to the opener on close; Escape closes.
- One h1 per page; headings in order; section headings contain only their text.
- Scrollable regions are keyboard-focusable and labelled.
- `prefers-reduced-motion` turns off animation and transitions.
- No sideways page scroll at 390 px.

## 11. Motion

- One short page entrance (`rise`, 0.18 s). Drawers slide (0.2 s). Hover changes colour, or adds `--shadow-sm` on tiles.
- No scroll-triggered effects, no motion that is not a response to the reader.

## 12. Print

- Always light, A4, controlled-copy notice at the top ("Printed copy of V..., date. It may be out of date...").
- Sidebar, top bar, side panel, buttons and breadcrumbs are hidden.
- Tables print as tables (never cards); charts stay whole up to 120 mm.

## 13. Before you ship a UI change

1. Uses tokens only (colour, type size); no new values outside the scales.
2. Checked at 1366 px and 390 px, light and dark, and print preview if the page prints.
3. Keyboard pass: Tab reaches it, focus is visible, Escape closes what opened.
4. `npm run build` passes (includes the public-content check).
5. Deploy, then confirm the live bundle hash changed before re-testing.

## Open design work

- **Editor** (audit item 14): page heading, a real table editor instead of `|` text, Save and Cancel always visible.
- Spacing values still to move onto the 4/8/12/16/24/32 steps.

---
Version 1.0, 30 Sep 2026. Built from the UI/UX audit of 30 Sep 2026.
