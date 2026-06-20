# Caribean Gym — Design System (Figma sync)

Source of truth in code: [`src/index.css`](../src/index.css), [`src/lib/typography.ts`](../src/lib/typography.ts), [`src/components/ui/`](../src/components/ui/).

Import these tokens when building or updating the Figma library.

## Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| brand | `#f97316` | `#f97316` | Primary CTA, accents |
| brand-hover | `#ea580c` | `#ea580c` | Hover states |
| check-out | `#2563eb` | `#3b82f6` | Kiosk check-out |
| surface | `#ffffff` | `#18181b` | Cards, panels |
| zinc-50…950 | Tailwind zinc | Tailwind zinc | Text, borders, backgrounds |

## Typography

| Style | Class / export | Spec |
|-------|----------------|------|
| Page title | `typography.pageTitle` | 30px bold, tight tracking |
| Page subtitle | `typography.pageSubtitle` | 14px medium zinc-500 |
| Section title | `typography.sectionTitle` | 14px semibold |
| Stat value | `typography.statValue` | 30px bold |
| Body | `typography.body` | 14px zinc-600 |

Fonts: **Inter** (UI), **JetBrains Mono** (timers, codes).

## Radius & touch

- Card: `1rem` (`rounded-2xl`)
- Input/button: `0.75rem`
- Min touch: `48px`, comfort: `52px`

## Components (map to Figma)

| Code | Variants |
|------|----------|
| `Button` | primary, secondary, ghost, danger; sm/md/lg |
| `Card` | padding none/sm/md; rounded xl/2xl/3xl |
| `Modal` | sm/md/lg |
| `Badge` | default, success, warning, danger |
| `StatCard` | icon + label + value |
| `FilterChips` | single/multi select pills |
| `EmptyState` | icon, title, description, action |
| `Table` | zebra rows, mobile stack |
| `Avatar` | sm/md/lg, image or initials |

## Key screens (production targets)

1. **Login / Register** — `AuthShell`, orange blur gradients, centered card
2. **Check-in kiosk** — full-screen, large input, scan animation
3. **Member dashboard** — mobile CTA fixed bottom, stat cards
4. **Active workout** — exercise focus carousel, rest timer overlay
5. **Reception** — cédula lookup, walk-in wizard tabs
6. **Members / Payments** — filter chips, data tables, modals

## Figma file

Create a design file named **Caribean Gym Design System** and paste variable values from this doc. Use `get_design_context` from the Figma MCP against each screen frame when implementing UI changes in code.
