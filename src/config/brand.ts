export const BRAND = {
  name: 'GymApure',
  nameParts: { primary: 'Gym', accent: 'Apure' },
  tagline: 'gestión de membresías, rutinas y control de acceso',
  description: 'GymApure — gestión de membresías, rutinas y control de acceso.',
  logo: {
    light: '/logo-mark-light.jpg',
    dark: '/logo-mark-dark.jpg',
  },
} as const;

export type BrandLogoMode = keyof typeof BRAND.logo;

export function getBrandLogoSrc(mode: BrandLogoMode): string {
  return BRAND.logo[mode];
}
