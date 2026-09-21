-- Work photos for provider profiles, stored as a JSON array of base64 data URLs
-- on the user row (same approach as profile_image).
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_images TEXT;
