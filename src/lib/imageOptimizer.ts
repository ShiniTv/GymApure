import sharp from 'sharp';

const AVATAR_WIDTH = 256;
const AVATAR_HEIGHT = 256;
const AVATAR_QUALITY = 80;

const PROOF_WIDTH = 1920;
const PROOF_QUALITY = 75;

export async function optimizeAvatar(
  input: Buffer
): Promise<{ buffer: Buffer; mime: string }> {
  const buffer = await sharp(input)
    .resize(AVATAR_WIDTH, AVATAR_HEIGHT, {
      fit: 'cover',
      position: 'center',
      withoutEnlargement: true,
    })
    .webp({ quality: AVATAR_QUALITY })
    .toBuffer();

  return { buffer, mime: 'image/webp' };
}

export async function optimizeProof(
  input: Buffer
): Promise<{ buffer: Buffer; mime: string }> {
  const metadata = await sharp(input).metadata();

  if (metadata.format === 'png' || metadata.format === 'webp') {
    const buffer = await sharp(input)
      .resize(PROOF_WIDTH, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: PROOF_QUALITY })
      .toBuffer();

    return { buffer, mime: 'image/webp' };
  }

  const buffer = await sharp(input)
    .resize(PROOF_WIDTH, undefined, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: PROOF_QUALITY, mozjpeg: true })
    .toBuffer();

  return { buffer, mime: 'image/jpeg' };
}
