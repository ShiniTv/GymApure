import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  VIDEO_AUDIO_BITRATE,
  VIDEO_CRF,
  VIDEO_MAX_DURATION_SEC,
  VIDEO_MAX_OUTPUT_BYTES,
  VIDEO_MAX_WIDTH,
  VIDEO_POSTER_QUALITY,
  VIDEO_POSTER_WIDTH,
} from './videoConfig.ts';

const execFileAsync = promisify(execFile);

export class VideoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VideoValidationError';
  }
}

function ffmpegPath(): string {
  return process.env.FFMPEG_PATH?.trim() || 'ffmpeg';
}

function ffprobePath(): string {
  const custom = process.env.FFMPEG_PATH?.trim();
  if (custom) {
    return custom.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1');
  }
  return 'ffprobe';
}

export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync(ffmpegPath(), ['-version'], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

async function probeDurationSec(inputPath: string): Promise<number> {
  const { stdout } = await execFileAsync(
    ffprobePath(),
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', inputPath],
    { timeout: 30_000 }
  );
  const duration = parseFloat(stdout.trim());
  return Number.isFinite(duration) ? duration : 0;
}

function inputExtension(mime: string): string {
  if (mime === 'video/webm') return '.webm';
  if (mime === 'video/quicktime') return '.mov';
  return '.mp4';
}

export interface OptimizedExerciseVideo {
  buffer: Buffer;
  mime: string;
  poster: Buffer;
}

/**
 * Transcode exercise tutorial to H.264/AAC MP4 with faststart + WebP poster frame.
 * Requires FFmpeg/ffprobe on PATH (or FFMPEG_PATH in .env).
 */
export async function optimizeExerciseVideo(
  input: Buffer,
  inputMime: string
): Promise<OptimizedExerciseVideo> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gym-video-'));
  const inputPath = path.join(tmpDir, `input${inputExtension(inputMime)}`);
  const outputPath = path.join(tmpDir, 'output.mp4');
  const posterPath = path.join(tmpDir, 'poster.webp');

  try {
    await fs.writeFile(inputPath, input);

    const duration = await probeDurationSec(inputPath);
    if (duration > VIDEO_MAX_DURATION_SEC) {
      throw new VideoValidationError(
        `El video dura ${Math.ceil(duration)} s. Máximo permitido: ${VIDEO_MAX_DURATION_SEC} s.`
      );
    }

    const scaleFilter = `scale='min(${VIDEO_MAX_WIDTH},iw)':-2`;

    await execFileAsync(
      ffmpegPath(),
      [
        '-y',
        '-i',
        inputPath,
        '-vf',
        scaleFilter,
        '-c:v',
        'libx264',
        '-profile:v',
        'main',
        '-level',
        '4.0',
        '-crf',
        String(VIDEO_CRF),
        '-preset',
        'fast',
        '-c:a',
        'aac',
        '-b:a',
        VIDEO_AUDIO_BITRATE,
        '-movflags',
        '+faststart',
        '-t',
        String(VIDEO_MAX_DURATION_SEC),
        outputPath,
      ],
      { timeout: 300_000 }
    );

    const videoBuffer = await fs.readFile(outputPath);
    if (videoBuffer.length > VIDEO_MAX_OUTPUT_BYTES) {
      throw new VideoValidationError(
        `El video comprimido pesa ${(videoBuffer.length / (1024 * 1024)).toFixed(1)} MB. ` +
          `Máximo: ${(VIDEO_MAX_OUTPUT_BYTES / (1024 * 1024)).toFixed(0)} MB. Acorta el clip o reduce la resolución.`
      );
    }

    const posterSeek = duration > 2 ? '1' : '0';
    await execFileAsync(
      ffmpegPath(),
      [
        '-y',
        '-ss',
        posterSeek,
        '-i',
        inputPath,
        '-vframes',
        '1',
        '-vf',
        `scale=${VIDEO_POSTER_WIDTH}:-2`,
        '-c:v',
        'libwebp',
        '-quality',
        String(VIDEO_POSTER_QUALITY),
        posterPath,
      ],
      { timeout: 60_000 }
    );

    const poster = await fs.readFile(posterPath);
    return { buffer: videoBuffer, mime: 'video/mp4', poster };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
