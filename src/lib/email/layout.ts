import { BRAND, getBrandLogoSrc } from '../../config/brand.ts';
import { env } from '../../config/env.ts';

const BRAND_COLOR = '#18181b';
const MUTED = '#71717a';
const BORDER = '#e4e4e7';
const BG = '#f4f4f5';

export function getPublicAppOrigin(): string {
  const fromEnv = (env.PUBLIC_APP_URL ?? '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return 'http://localhost:3000';
}

export function appUrl(path = '/'): string {
  const origin = getPublicAppOrigin();
  if (!path || path === '/') return origin;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function logoAbsoluteUrl(): string {
  return `${getPublicAppOrigin()}${getBrandLogoSrc('dark')}`;
}

export function layoutHtml(content: string): string {
  const logoUrl = logoAbsoluteUrl();
  const brand = escapeForAttr(BRAND.name);
  const footerLine = `${BRAND.name} — ${BRAND.heroSubheadline}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${brand}</title>
  <style>
    body { margin:0; padding:0; background:${BG}; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
    .container { max-width:560px; margin:24px auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid ${BORDER}; }
    .header { background:${BRAND_COLOR}; padding:28px 32px; text-align:center; }
    .header img { display:inline-block; height:40px; width:auto; border:0; }
    .header h1 { color:#fafafa; margin:12px 0 0; font-size:18px; font-weight:700; letter-spacing:-0.02em; }
    .body { padding:32px; color:${BRAND_COLOR}; font-size:15px; line-height:1.6; }
    .body h2 { margin:0 0 12px; font-size:20px; font-weight:700; letter-spacing:-0.02em; color:${BRAND_COLOR}; }
    .body p { margin:0 0 14px; }
    .body p:last-child { margin-bottom:0; }
    .footer { padding:18px 32px; background:${BG}; text-align:center; font-size:12px; color:${MUTED}; line-height:1.5; }
    .btn { display:inline-block; padding:12px 28px; border-radius:8px; font-size:14px; font-weight:600;
           text-decoration:none; color:#fafafa; background:${BRAND_COLOR}; }
    .btn-wrap { text-align:center; margin:28px 0; }
    .muted { font-size:13px; color:${MUTED}; }
    .badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px; font-weight:600; }
    .badge-green { background:#dcfce7; color:#166534; }
    .badge-red { background:#fee2e2; color:#991b1b; }
    .badge-amber { background:#fef3c7; color:#92400e; }
    hr { border:none; border-top:1px solid ${BORDER}; margin:20px 0; }
    a { color:${BRAND_COLOR}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${escapeForAttr(logoUrl)}" alt="${brand}" width="40" height="40">
      <h1>${brand}</h1>
    </div>
    <div class="body">${content}</div>
    <div class="footer">${escapeForAttr(footerLine)}</div>
  </div>
</body>
</html>`;
}

export function layoutText(lines: string[]): string {
  const footer = `${BRAND.name} — ${BRAND.heroSubheadline}`;
  return [...lines.filter(Boolean), '', '—', footer].join('\n');
}

function escapeForAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function ctaButton(href: string, label: string): string {
  return `<p class="btn-wrap"><a class="btn" href="${escapeForAttr(href)}">${escapeForAttr(label)}</a></p>`;
}
