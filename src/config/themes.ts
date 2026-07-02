export const THEME_STORAGE_KEY = 'theme';
export const PALETTE_STORAGE_KEY = 'gymapure-palette';
export const THEME_ONBOARDING_KEY = 'gymapure-theme-onboarding-done';

export const PALETTES = {
  monochrome: {
    id: 'monochrome',
    label: 'Monocromo',
    description: 'Blanco y negro, limpio y neutro',
    swatch: { light: '#18181b', dark: '#fafafa' },
    brand: { light: '#18181b', lightHover: '#27272a', dark: '#fafafa', darkHover: '#e4e4e7' },
    chartAccent: { light: '#18181b', dark: '#fafafa' },
  },
  ember: {
    id: 'ember',
    label: 'Ámbar',
    description: 'Naranja energético sobre fondos neutros',
    swatch: { light: '#f97316', dark: '#f97316' },
    brand: { light: '#f97316', lightHover: '#ea580c', dark: '#f97316', darkHover: '#fb923c' },
    chartAccent: { light: '#f97316', dark: '#f97316' },
  },
  ocean: {
    id: 'ocean',
    label: 'Océano',
    description: 'Azul verdoso calmado y profesional',
    swatch: { light: '#0891b2', dark: '#22d3ee' },
    brand: { light: '#0891b2', lightHover: '#0e7490', dark: '#22d3ee', darkHover: '#67e8f9' },
    chartAccent: { light: '#0891b2', dark: '#22d3ee' },
  },
  forest: {
    id: 'forest',
    label: 'Bosque',
    description: 'Verde sobrio y natural',
    swatch: { light: '#059669', dark: '#34d399' },
    brand: { light: '#059669', lightHover: '#047857', dark: '#34d399', darkHover: '#6ee7b7' },
    chartAccent: { light: '#059669', dark: '#34d399' },
  },
  indigo: {
    id: 'indigo',
    label: 'Índigo',
    description: 'Violeta-azul elegante y moderno',
    swatch: { light: '#4f46e5', dark: '#818cf8' },
    brand: { light: '#4f46e5', lightHover: '#4338ca', dark: '#818cf8', darkHover: '#a5b4fc' },
    chartAccent: { light: '#4f46e5', dark: '#818cf8' },
  },
  rose: {
    id: 'rose',
    label: 'Rosa',
    description: 'Cálido y moderno, distinto del naranja',
    swatch: { light: '#e11d48', dark: '#fb7185' },
    brand: { light: '#e11d48', lightHover: '#be123c', dark: '#fb7185', darkHover: '#fda4af' },
    chartAccent: { light: '#e11d48', dark: '#fb7185' },
  },
  slate: {
    id: 'slate',
    label: 'Pizarra',
    description: 'Azul-gris corporativo y sobrio',
    swatch: { light: '#475569', dark: '#94a3b8' },
    brand: { light: '#475569', lightHover: '#334155', dark: '#94a3b8', darkHover: '#cbd5e1' },
    chartAccent: { light: '#475569', dark: '#94a3b8' },
  },
  gold: {
    id: 'gold',
    label: 'Oro',
    description: 'Dorado premium, clásico de gym',
    swatch: { light: '#b45309', dark: '#fbbf24' },
    brand: { light: '#b45309', lightHover: '#92400e', dark: '#fbbf24', darkHover: '#fde047' },
    chartAccent: { light: '#b45309', dark: '#fbbf24' },
  },
} as const;

export type PaletteId = keyof typeof PALETTES;
export type Appearance = 'light' | 'dark';

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];
export const PALETTE_LIST = Object.values(PALETTES);
export const DEFAULT_PALETTE: PaletteId = 'ember';
export const DEFAULT_APPEARANCE: Appearance = 'dark';

export function getSystemAppearance(): Appearance {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function isPaletteId(value: string | null): value is PaletteId {
  return value !== null && value in PALETTES;
}

export function isAppearance(value: string | null): value is Appearance {
  return value === 'light' || value === 'dark';
}

export function getPaletteCssVars(appearance: Appearance, palette: PaletteId) {
  const entry = PALETTES[palette];
  const isDark = appearance === 'dark';
  return {
    brand: isDark ? entry.brand.dark : entry.brand.light,
    brandHover: isDark ? entry.brand.darkHover : entry.brand.lightHover,
    chartAccent: isDark ? entry.chartAccent.dark : entry.chartAccent.light,
  };
}

export function getThemeColorMeta(appearance: Appearance, palette: PaletteId): string {
  if (appearance === 'dark') return '#18181b';
  return PALETTES[palette].swatch.light;
}

export function applyThemeToDocument(theme: Appearance, palette: PaletteId) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.dataset.palette = palette;

  const vars = getPaletteCssVars(theme, palette);
  root.style.setProperty('--color-brand', vars.brand);
  root.style.setProperty('--color-brand-hover', vars.brandHover);
  root.style.setProperty('--chart-accent', vars.chartAccent);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', getThemeColorMeta(theme, palette));
  }
}
