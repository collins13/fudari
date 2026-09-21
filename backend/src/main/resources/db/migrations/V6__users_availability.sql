ALTER TABLE users
    ADD COLUMN IF NOT EXISTS available_now BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS availability_updated_at TIMESTAMP;

-- Search filters on this for the "Available now" facet.
CREATE INDEX IF NOT EXISTS idx_users_available_now
    ON users (available_now)
    WHERE available_now = TRUE;
