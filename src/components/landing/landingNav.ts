export const LANDING_NAV_LINKS = [
  { label: 'Módulos', href: '#modulos' },
  { label: 'Vista previa', href: '#vista-previa' },
  { label: 'Roles', href: '#roles' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Preguntas', href: '#preguntas' },
  { label: 'Contacto', href: '#contacto' },
] as const;

/** Links visibles en isla expandida media (lg–xl). */
export const LANDING_NAV_PRIORITY = LANDING_NAV_LINKS.slice(0, 3);

/** Links restantes para menú “Más” en lg–xl. */
export const LANDING_NAV_EXTRA = LANDING_NAV_LINKS.slice(3);

export function scrollToAnchor(href: string) {
  const id = href.replace('#', '');
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
