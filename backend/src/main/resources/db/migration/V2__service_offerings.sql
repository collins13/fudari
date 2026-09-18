-- Sub-service taxonomy (ServiceOffering) and its worker join table.
CREATE TABLE IF NOT EXISTS service_offerings (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    slug             VARCHAR(255) NOT NULL UNIQUE,
    skill_type       VARCHAR(48)  NOT NULL,
    description      TEXT,
    price_from_kes   INTEGER,
    price_to_kes     INTEGER,
    is_emergency     BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    indexable        BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order       INTEGER      DEFAULT 0,
    seo_title        VARCHAR(255),
    seo_description  TEXT,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_offering_synonyms (
    service_offering_id BIGINT       NOT NULL REFERENCES service_offerings (id) ON DELETE CASCADE,
    synonym             VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS worker_skill_services (
    worker_skill_id     BIGINT NOT NULL REFERENCES worker_skills (id) ON DELETE CASCADE,
    service_offering_id BIGINT NOT NULL REFERENCES service_offerings (id) ON DELETE CASCADE,
    PRIMARY KEY (worker_skill_id, service_offering_id)
);

CREATE INDEX IF NOT EXISTS idx_service_offerings_skill_active
    ON service_offerings (skill_type, is_active);
CREATE INDEX IF NOT EXISTS idx_service_offerings_slug ON service_offerings (slug);
CREATE INDEX IF NOT EXISTS idx_service_offering_synonyms_parent
    ON service_offering_synonyms (service_offering_id);
CREATE INDEX IF NOT EXISTS idx_worker_skill_services_offering
    ON worker_skill_services (service_offering_id);
