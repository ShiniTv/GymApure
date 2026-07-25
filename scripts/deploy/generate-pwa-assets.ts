import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../../public');
const light = path.join(publicDir, 'logo-mark-light.jpg');
const dark = path.join(publicDir, 'logo-mark-dark.jpg');

async function icon(
  input: string,
  size: number,
  out: string,
  opts: { maskable?: boolean } = {}
): Promise<void> {
  const maskable = Boolean(opts.maskable);
  const pad = maskable ? Math.round(size * 0.1) : 0;
  const inner = size - pad * 2;
  const resized = await sharp(input)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 12, g: 12, b: 12, alpha: 1 },
    })
    .png()
    .toBuffer();
  if (!maskable) {
    await sharp(resized).resize(size, size).png().toFile(path.join(publicDir, out));
    return;
  }
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 12, g: 12, b: 12, alpha: 1 },
    },
  })
    .composite([{ input: resized, left: pad, top: pad }])
    .png()
    .toFile(path.join(publicDir, out));
}

async function shot(w: number, h: number, name: string, label: string): Promise<void> {
  const titleSize = Math.round(w * 0.06);
  const subSize = Math.round(w * 0.028);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0c0c0c"/>
          <stop offset="100%" stop-color="#0c98ff" stop-opacity="0.45"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="48%" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="${titleSize}" font-weight="700">GymApure</text>
      <text x="50%" y="58%" text-anchor="middle" fill="#a1a1aa" font-family="Arial,sans-serif" font-size="${subSize}">${label}</text>
    </svg>`
  );
  await sharp(svg).png().toFile(path.join(publicDir, name));
}

await icon(light, 192, 'icon-192.png');
await icon(light, 512, 'icon-512.png');
await icon(dark, 512, 'icon-512-maskable.png', { maskable: true });
await shot(1080, 1920, 'screenshot-narrow.png', 'Membresías · Rutinas · Acceso');
await shot(1920, 1080, 'screenshot-wide.png', 'Panel para tu gimnasio');

console.log(
  'generated',
  fs
    .readdirSync(publicDir)
    .filter((f) => f.endsWith('.png'))
    .join(', ')
);
