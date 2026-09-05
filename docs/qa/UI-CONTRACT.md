# Contrato UI — GymApure

Fuente de verdad de tokens: `src/index.css`. Tipografía: `src/lib/typography.ts`. Primitivos: `src/components/ui/`.

El acento de marca en runtime es la paleta sky (`#0c98ff` vía `src/config/themes.ts`). `--color-brand` en `@theme` puede ser más oscuro en light por contraste AA; no inventar un segundo azul en call sites.

## Botón

- Acciones de formulario, piso y modales: `Button` `size="md"` (44px) o `lg` (48px).
- Filas de tabla / chips de toolbar: `size="sm"` (`min-h-9`).
- No pasar `h-*` ni `min-h-*` en `className` de `Button` (el primitivo las ignora).
- Preferir `secondary` sobre `ghost` (alias deprecado).
- Footer de modal: CTAs `md`, alineados, sticky.

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

Usar `typography.*`, `text-small`, `text-sm`, `text-h1`/`text-h2`. Prohibido `text-[Npx]` en UI (ejes SVG de charts: `chartTheme`, allowlist).

Labels de form: `Label` / `typography.label`. Meta uppercase: `statLabel` / `labelCaps`.

## Caja

- Un nivel de `Card`. Padding canónico `sm`/`md`/`lg` (`p-ds-*`); no `md:p-4` / `!p-2.5`.
- Radio de card: `rounded-[var(--radius-card)]` (8px). No `rounded-2xl` en paneles Operate.
- Empty: `EmptyState`; `framed={false}` si ya hay panel.

## Gráfico

Alturas: mini 180px, panel 240px (`chartTheme`). Ejes `fontSize` 12, peso 500, colores `var(--color-brand|success|danger)`. Tooltip tokenizado. Sin glow ni `fontWeight={900}`.

## Motion

`animate-spin` solo en `Spinner` (y pull-to-refresh). Lucide estático. Overlays ~200ms. Respetar `prefers-reduced-motion`.
