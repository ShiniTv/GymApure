import { useEffect } from 'react';
import { BRAND } from '../../config/brand';

function setMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attribute}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useLandingMeta() {
  useEffect(() => {
    const origin = window.location.origin;
    const url = `${origin}${window.location.pathname}`;
    const imageUrl = `${origin}${BRAND.ogImage}`;

    document.title = BRAND.pageTitle;
    setMeta('description', BRAND.description);
    setMeta('og:title', BRAND.pageTitle, 'property');
    setMeta('og:description', BRAND.description, 'property');
    setMeta('og:type', 'website', 'property');
    setMeta('og:url', url, 'property');
    setMeta('og:image', imageUrl, 'property');
    setMeta('og:image:width', '1200', 'property');
    setMeta('og:image:height', '630', 'property');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', BRAND.pageTitle);
    setMeta('twitter:description', BRAND.description);
    setMeta('twitter:image', imageUrl);
  }, []);
}
