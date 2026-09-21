-- Adds approval workflow + admin onboarding columns to users.
-- Idempotent: safe to run on databases that already have some/all of the columns.

ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by_admin_id BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_admin_id BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_document_image TEXT;

-- Backfill approval_status for existing rows based on legacy is_approved flag.
UPDATE users
SET approval_status = CASE
        WHEN role = 'WORKER' AND COALESCE(is_approved, FALSE) = TRUE THEN 'APPROVED'
        WHEN role = 'WORKER' THEN 'PENDING'
        ELSE 'APPROVED'
    END
WHERE approval_status IS NULL;

-- Unique constraint on national_id (only enforced where present).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'uk_users_national_id'
    ) THEN
        CREATE UNIQUE INDEX uk_users_national_id
            ON users (national_id)
            WHERE national_id IS NOT NULL;
    END IF;
END $$;
