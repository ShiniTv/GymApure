-- Posters (WebP) are stored alongside exercise videos in the same bucket.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'image/webp', 'image/jpeg']
WHERE id = 'exercise-videos';
