-- Structured location on users. Hibernate ddl-auto also adds these when the entity
-- changes; IF NOT EXISTS keeps both paths idempotent.
ALTER TABLE users ADD COLUMN IF NOT EXISTS county VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS town VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS area VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS service_radius_km INTEGER DEFAULT 15;

-- Provider discovery paths. Every SEO landing page filters on
-- (role, is_active, is_approved) plus a location column.
CREATE INDEX IF NOT EXISTS idx_users_role_active_approved
    ON users (role, is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_users_county_active
    ON users (county, is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_users_town_active
    ON users (town, is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_users_area_active
    ON users (area, is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_users_vetting_level ON users (vetting_level);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);

-- Skill -> provider lookups drive every /artisans/{skill}/... page.
CREATE INDEX IF NOT EXISTS idx_worker_skills_skill_type ON worker_skills (skill_type);
CREATE INDEX IF NOT EXISTS idx_worker_skills_user_id ON worker_skills (user_id);
CREATE INDEX IF NOT EXISTS idx_worker_skills_skill_user ON worker_skills (skill_type, user_id);
