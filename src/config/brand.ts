export const BRAND = {
  name: 'GymApure',
  nameParts: { primary: 'Gym', accent: 'Apure' },
  tagline: 'gestión de membresías, rutinas y control de acceso',
  description:
    'GymApure — plataforma para gimnasios: membresías, control de acceso, recepción y reportes en un solo panel.',
  pageTitle: 'GymApure — Gestión integral para gimnasios',
  heroHeadline: 'Gestiona tu gimnasio sin Excel ni WhatsApp',
  heroSubheadline: 'Membresías, acceso, recepción y reportes en un solo panel.',
  ogImage: '/og-image.svg',
  /** Full-bleed atmosphere for auth split panel (lg+). */
  authAtmosphere: '/auth-atmosphere.jpg',
  logo: {
    light: '/logo-mark-light.jpg',
    dark: '/logo-mark-dark.jpg',
  },
} as const;

export type BrandLogoMode = keyof typeof BRAND.logo;

export function getBrandLogoSrc(mode: BrandLogoMode): string {
  return BRAND.logo[mode];
}
