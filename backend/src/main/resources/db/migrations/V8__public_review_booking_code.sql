ALTER TABLE public_reviews
    ADD COLUMN IF NOT EXISTS booking_code VARCHAR(20);

-- One review per booking; anonymous reviews stay unverified and excluded from the rating.
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_reviews_booking_code
    ON public_reviews (booking_code)
    WHERE booking_code IS NOT NULL;

-- Existing reviews predate booking verification, so they must not count towards ratings.
UPDATE public_reviews SET is_verified = FALSE WHERE booking_code IS NULL;
