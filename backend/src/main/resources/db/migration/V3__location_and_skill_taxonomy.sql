-- Kenya location taxonomy: COUNTY -> TOWN -> AREA in one self-referencing table.
CREATE TABLE IF NOT EXISTS locations (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    type            VARCHAR(16)  NOT NULL,
    parent_id       BIGINT       REFERENCES locations (id) ON DELETE CASCADE,
    county_id       BIGINT       REFERENCES locations (id) ON DELETE CASCADE,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    description     TEXT,
    seo_title       VARCHAR(255),
    seo_description TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    indexable       BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order      INTEGER      DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP
);

-- Counties and towns own a globally unique slug because they sit directly under
-- /artisans/{skill}/{location}. Areas only need to be unique within their parent,
-- since "Milimani" legitimately exists in more than one town.
CREATE UNIQUE INDEX IF NOT EXISTS uk_location_slug_non_area
    ON locations (slug) WHERE type <> 'AREA';
CREATE UNIQUE INDEX IF NOT EXISTS uk_location_parent_slug
    ON locations (parent_id, slug) WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_location_type_active ON locations (type, is_active);
CREATE INDEX IF NOT EXISTS idx_location_parent ON locations (parent_id);
CREATE INDEX IF NOT EXISTS idx_location_county ON locations (county_id);
CREATE INDEX IF NOT EXISTS idx_location_slug ON locations (slug);

-- Skill SEO metadata, keyed to the WorkerSkill.SkillType enum.
CREATE TABLE IF NOT EXISTS skill_metadata (
    id                       BIGSERIAL PRIMARY KEY,
    skill_type               VARCHAR(48)  NOT NULL UNIQUE,
    name                     VARCHAR(255) NOT NULL,
    plural_name              VARCHAR(255) NOT NULL,
    slug                     VARCHAR(255) NOT NULL UNIQUE,
    description              TEXT,
    category_id              BIGINT       REFERENCES categories (id) ON DELETE SET NULL,
    seo_title_template       VARCHAR(255),
    seo_description_template TEXT,
    is_active                BOOLEAN      NOT NULL DEFAULT TRUE,
    indexable                BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order               INTEGER      DEFAULT 0,
    created_at               TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skill_metadata_keywords (
    skill_metadata_id BIGINT       NOT NULL REFERENCES skill_metadata (id) ON DELETE CASCADE,
    keyword           VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_metadata_synonyms (
    skill_metadata_id BIGINT       NOT NULL REFERENCES skill_metadata (id) ON DELETE CASCADE,
    synonym           VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_metadata_swahili (
    skill_metadata_id BIGINT       NOT NULL REFERENCES skill_metadata (id) ON DELETE CASCADE,
    keyword           VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skill_metadata_slug ON skill_metadata (slug);
CREATE INDEX IF NOT EXISTS idx_skill_metadata_active ON skill_metadata (is_active);
CREATE INDEX IF NOT EXISTS idx_skill_metadata_keywords_parent ON skill_metadata_keywords (skill_metadata_id);
CREATE INDEX IF NOT EXISTS idx_skill_metadata_synonyms_parent ON skill_metadata_synonyms (skill_metadata_id);
CREATE INDEX IF NOT EXISTS idx_skill_metadata_swahili_parent ON skill_metadata_swahili (skill_metadata_id);
