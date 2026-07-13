/** Max raw upload before transcoding (multer + pre-ffmpeg). */
export const VIDEO_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Max compressed output stored in Storage / disk. */
export const VIDEO_MAX_OUTPUT_BYTES = 15 * 1024 * 1024;

/** Tutorial clips should stay short for fast load on mobile. */
export const VIDEO_MAX_DURATION_SEC = 60;

export const VIDEO_MAX_WIDTH = 1280;
export const VIDEO_POSTER_WIDTH = 640;
export const VIDEO_CRF = 26;
export const VIDEO_AUDIO_BITRATE = '96k';
export const VIDEO_POSTER_QUALITY = 80;
