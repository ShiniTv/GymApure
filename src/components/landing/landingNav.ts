export const LANDING_NAV_LINKS = [
  { label: 'Módulos', href: '#modulos' },
  { label: 'Vista previa', href: '#vista-previa' },
  { label: 'Roles', href: '#roles' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Preguntas', href: '#preguntas' },
  { label: 'Contacto', href: '#contacto' },
] as const;

export function scrollToAnchor(href: string) {
  const id = href.replace('#', '');
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
