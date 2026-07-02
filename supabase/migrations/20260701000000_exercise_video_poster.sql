-- Poster/thumbnail for inline exercise video player (generated on upload via FFmpeg).
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_poster_url TEXT;
