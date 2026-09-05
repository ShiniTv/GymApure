# Contrato UI — GymApure

Fuente de verdad de tokens: `src/index.css`. Tipografía: `src/lib/typography.ts`. Primitivos: `src/components/ui/`.

El acento de marca en runtime es la paleta sky (`#0c98ff` vía `src/config/themes.ts`). `--color-brand` en `@theme` puede ser más oscuro en light por contraste AA; no inventar un segundo azul en call sites.

## Densidad

| Contexto                                    | Controles                                               | Notas                                                        |
| ------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| **Comfortable** (piso / formularios / CTAs) | `Button` `md` 44px / `lg` 48px                          | Member FAB, Reception counter, modales, workout pager, kiosk |
| **Readable chrome** (desktop nav / headers) | `.nav-link` 32px, sidebar `lg:w-56`, canvas `lg:p-ds-5` | Escala equilibrada — mismo ritmo título/KPI/chip             |
| **Compact** (toolbars / tablas)             | `IconButton` `sm` 32px, `Button` `sm`                   | Solo filas densas de datos — no CTAs de piso                 |

No mezclar CTA de piso con `size="sm"`.

## Botón

- Acciones de formulario, piso y modales: `Button` `size="md"` (44px) o `lg` (48px).
- Filas de tabla / chips de toolbar: `size="sm"` (`min-h-9`).
- No pasar `h-*` ni `min-h-*` en `className` de `Button` (el primitivo las ignora).
- Preferir `secondary` sobre `ghost` (alias deprecado).
- Footer de modal: CTAs `md`, alineados, sticky.
- Radio: `--radius-button` (8px).

## IconButton

- `sm` (32px) listas densas; `md` (36px) headers / close de overlay.
- Icono hijo `h-3.5` o `h-4`. No usar como CTA de piso (usar `Button`).

## Modal

| Prop  | Uso                        | Ancho Tailwind |
| ----- | -------------------------- | -------------- |
| `sm`  | Confirmación               | `max-w-sm`     |
| `md`  | Formulario 1 columna       | `max-w-md`     |
| `lg`  | Formulario 2 columnas      | `max-w-lg`     |
| `xl`  | Detalle / preview compacto | `max-w-xl`     |
| `2xl` | Detalle amplio             | `max-w-2xl`    |
| `3xl` | Formularios densos / altas | `max-w-3xl`    |

Sheet: acciones móviles y menú «Más». No modal centrado bajo 768px para esos casos.

## Tipografía

Usar `typography.*` (`pageTitle`, `heroName`, `floorTitle`, `immersiveTitle`, `sectionTitle`, `statLabel`, `statValue`, `statValueSm`, `chromeNav`, …). Prohibido `text-[Npx]` en UI (ejes SVG de charts: `chartTheme`, allowlist).

Escala Apple Operate equilibrada: page **20px** → card **15px** → body **15px** → chrome **13px** → meta **12px**.

Labels de form: `Label` / `typography.label`. Meta uppercase: `statLabel` / `labelCaps` solo cuando aporta.

`PageHeader` variantes: `operate` (default; oculta H1 en móvil solo si hay `subtitle`), `floor` (mostrador), `immersive` (workout / kiosk).

## KPI

- Toolbar / Operate grids: `StatTile` o `StatCard` minimal → `typography.statValueSm` (**18px**).
- Hero / dashboard grande: `typography.statValue` (**20px**).
- No inventar `text-lg`/`text-xl` ad hoc para números KPI.

## Caja

- Un nivel de `Card`. Padding canónico `sm`/`md`/`lg` (`p-ds-*`); no `md:p-4` / `!p-2.5` en `className`.
- Radio de card: `rounded-[var(--radius-card)]` (**10px**). Props `rounded="xl|2xl|3xl"` son alias legacy del mismo radio de card.
- No `rounded-2xl` en paneles Operate (allowlist: sheets, chat bubbles, pills).
- Inputs/alerts/accordion: `--radius-input` / `--radius-card`.
- Empty: `EmptyState`; `framed={false}` si ya hay panel.
- Canvas gutter: `px-ds-4` → `sm:p-ds-4` → `lg:p-ds-5` — no `px-3.5`.

## Shell móvil

- Island top: `--mobile-top-chrome` (~4.125rem).
- Bottom stack: `--*-nav-stack` = clearance 1rem + pill 3.5rem + pad 0.5rem (+ safe-area).
- Pill tabs: hit area `min-h-[var(--touch-min)]`; icon circle 36px; badge `text-small`.
- Clases pill: `.member-bottom-nav-pill` / alias `.app-bottom-nav-pill`.

## Gráfico

Alturas: mini 180px, panel 240px (`chartTheme`). Ejes `fontSize` 12, peso 500, colores `var(--color-brand|success|danger)`. Tooltip tokenizado. Sin glow ni `fontWeight={900}`.

## Motion

`animate-spin` solo en `Spinner` (y pull-to-refresh). Lucide estático. Overlays ~200ms. Respetar `prefers-reduced-motion`.

## Lint

`npm run lint:ui-contract` — `text-[Npx]`, `Button` height overrides, `rounded-2xl|3xl` fuera de allowlist, `Card` + padding escape.
