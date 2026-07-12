-- admin-app / bigdata_db
-- Migration 016: contratos persistentes para mapa completo, trânsitos,
-- sinastria, mapa planetário de localidade, análises de IA e renderizações.
--
-- Pré-condição: migration 015 aplicada. Payloads são sempre identificados por
-- schema/version/hash; esta estrutura não cria um blob JSON sem contrato.

CREATE TABLE IF NOT EXISTS astrologo_artifacts (
    id TEXT PRIMARY KEY CHECK (
        length(id) BETWEEN 8 AND 128 AND id = trim(id) AND id NOT GLOB '*[^0-9A-Za-z:._-]*'
    ),
    mapa_id TEXT NOT NULL,
    transit_run_id TEXT,
    synastry_run_id TEXT,
    locality_run_id TEXT,
    artifact_type TEXT NOT NULL CHECK (artifact_type IN (
        'natal_chart_analysis',
        'chart_spec',
        'transit_result',
        'synastry_result',
        'locality_map'
    )),
    schema_id TEXT NOT NULL CHECK (length(schema_id) BETWEEN 8 AND 256 AND schema_id = trim(schema_id)),
    schema_version TEXT NOT NULL CHECK (length(schema_version) BETWEEN 1 AND 32 AND schema_version = trim(schema_version)),
    source_hash TEXT NOT NULL CHECK (
        length(source_hash) = 64 AND source_hash NOT GLOB '*[^0-9a-f]*'
    ),
    payload_json TEXT CHECK (payload_json IS NULL OR json_valid(payload_json)),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'ready', 'partial', 'failed', 'stale'
    )),
    diagnostic_json TEXT CHECK (diagnostic_json IS NULL OR json_valid(diagnostic_json)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (status NOT IN ('ready', 'partial') OR payload_json IS NOT NULL),
    CHECK (
        (transit_run_id IS NOT NULL) +
        (synastry_run_id IS NOT NULL) +
        (locality_run_id IS NOT NULL) <= 1
    ),
    CHECK (
        (artifact_type = 'transit_result' AND transit_run_id IS NOT NULL) OR
        (artifact_type = 'synastry_result' AND synastry_run_id IS NOT NULL) OR
        (artifact_type = 'locality_map' AND locality_run_id IS NOT NULL) OR
        (artifact_type IN ('natal_chart_analysis', 'chart_spec') AND
            transit_run_id IS NULL AND synastry_run_id IS NULL AND locality_run_id IS NULL)
    ),
    UNIQUE (mapa_id, artifact_type, schema_id, schema_version, source_hash),
    FOREIGN KEY (mapa_id) REFERENCES astrologo_mapas(id) ON DELETE CASCADE,
    FOREIGN KEY (transit_run_id) REFERENCES astrologo_transit_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (synastry_run_id) REFERENCES astrologo_synastry_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (locality_run_id) REFERENCES astrologo_locality_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS astrologo_transit_runs (
    id TEXT PRIMARY KEY CHECK (
        length(id) BETWEEN 8 AND 128 AND id = trim(id) AND id NOT GLOB '*[^0-9A-Za-z:._-]*'
    ),
    mapa_id TEXT NOT NULL,
    reference_instant_utc TEXT NOT NULL CHECK (datetime(reference_instant_utc) IS NOT NULL),
    presentation_timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo'
        CHECK (presentation_timezone = 'America/Sao_Paulo'),
    horizon_days INTEGER NOT NULL CHECK (horizon_days BETWEEN 0 AND 366),
    orb_profile_id TEXT NOT NULL CHECK (length(orb_profile_id) BETWEEN 3 AND 128),
    engine_versions_json TEXT NOT NULL CHECK (json_valid(engine_versions_json)),
    source_hash TEXT NOT NULL CHECK (
        length(source_hash) = 64 AND source_hash NOT GLOB '*[^0-9a-f]*'
    ),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'ready', 'partial', 'failed', 'stale'
    )),
    result_artifact_id TEXT,
    expires_at TEXT CHECK (expires_at IS NULL OR datetime(expires_at) IS NOT NULL),
    diagnostic_json TEXT CHECK (diagnostic_json IS NULL OR json_valid(diagnostic_json)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (status NOT IN ('ready', 'partial') OR result_artifact_id IS NOT NULL),
    UNIQUE (mapa_id, source_hash),
    FOREIGN KEY (mapa_id) REFERENCES astrologo_mapas(id) ON DELETE CASCADE,
    FOREIGN KEY (result_artifact_id) REFERENCES astrologo_artifacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS astrologo_synastry_runs (
    id TEXT PRIMARY KEY CHECK (
        length(id) BETWEEN 8 AND 128 AND id = trim(id) AND id NOT GLOB '*[^0-9A-Za-z:._-]*'
    ),
    primary_mapa_id TEXT NOT NULL,
    secondary_mapa_id TEXT NOT NULL,
    subject_a_hash TEXT NOT NULL CHECK (
        length(subject_a_hash) = 64 AND subject_a_hash NOT GLOB '*[^0-9a-f]*'
    ),
    subject_b_hash TEXT NOT NULL CHECK (
        length(subject_b_hash) = 64 AND subject_b_hash NOT GLOB '*[^0-9a-f]*'
    ),
    consent_recorded_at TEXT NOT NULL CHECK (datetime(consent_recorded_at) IS NOT NULL),
    orb_profile_id TEXT NOT NULL CHECK (length(orb_profile_id) BETWEEN 3 AND 128),
    source_hash TEXT NOT NULL CHECK (
        length(source_hash) = 64 AND source_hash NOT GLOB '*[^0-9a-f]*'
    ),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'ready', 'partial', 'failed', 'stale'
    )),
    result_artifact_id TEXT,
    diagnostic_json TEXT CHECK (diagnostic_json IS NULL OR json_valid(diagnostic_json)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (primary_mapa_id <> secondary_mapa_id),
    CHECK (status NOT IN ('ready', 'partial') OR result_artifact_id IS NOT NULL),
    UNIQUE (primary_mapa_id, secondary_mapa_id, source_hash),
    FOREIGN KEY (primary_mapa_id) REFERENCES astrologo_mapas(id) ON DELETE CASCADE,
    FOREIGN KEY (secondary_mapa_id) REFERENCES astrologo_mapas(id) ON DELETE CASCADE,
    FOREIGN KEY (result_artifact_id) REFERENCES astrologo_artifacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS astrologo_locality_runs (
    id TEXT PRIMARY KEY CHECK (
        length(id) BETWEEN 8 AND 128 AND id = trim(id) AND id NOT GLOB '*[^0-9A-Za-z:._-]*'
    ),
    mapa_id TEXT NOT NULL,
    projection_id TEXT NOT NULL CHECK (length(projection_id) BETWEEN 3 AND 128),
    geometry_version TEXT NOT NULL CHECK (length(geometry_version) BETWEEN 1 AND 32),
    resolution_degrees REAL NOT NULL CHECK (resolution_degrees > 0 AND resolution_degrees <= 10),
    source_hash TEXT NOT NULL CHECK (
        length(source_hash) = 64 AND source_hash NOT GLOB '*[^0-9a-f]*'
    ),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'ready', 'partial', 'failed', 'stale'
    )),
    result_artifact_id TEXT,
    diagnostic_json TEXT CHECK (diagnostic_json IS NULL OR json_valid(diagnostic_json)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (status NOT IN ('ready', 'partial') OR result_artifact_id IS NOT NULL),
    UNIQUE (mapa_id, source_hash),
    FOREIGN KEY (mapa_id) REFERENCES astrologo_mapas(id) ON DELETE CASCADE,
    FOREIGN KEY (result_artifact_id) REFERENCES astrologo_artifacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS astrologo_ai_analyses (
    id TEXT PRIMARY KEY CHECK (
        length(id) BETWEEN 8 AND 128 AND id = trim(id) AND id NOT GLOB '*[^0-9A-Za-z:._-]*'
    ),
    mapa_id TEXT NOT NULL,
    source_artifact_id TEXT,
    transit_run_id TEXT,
    synastry_run_id TEXT,
    locality_run_id TEXT,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN (
        'natal', 'aspects_houses', 'transits', 'synastry', 'locality', 'integrated'
    )),
    schema_id TEXT NOT NULL CHECK (length(schema_id) BETWEEN 8 AND 256),
    schema_version TEXT NOT NULL CHECK (length(schema_version) BETWEEN 1 AND 32),
    prompt_version TEXT NOT NULL CHECK (length(prompt_version) BETWEEN 1 AND 128),
    model TEXT NOT NULL CHECK (length(model) BETWEEN 1 AND 128),
    input_hash TEXT NOT NULL CHECK (
        length(input_hash) = 64 AND input_hash NOT GLOB '*[^0-9a-f]*'
    ),
    output_text TEXT,
    output_html TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'ready', 'partial', 'failed', 'stale'
    )),
    input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    diagnostic_json TEXT CHECK (diagnostic_json IS NULL OR json_valid(diagnostic_json)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (
        (transit_run_id IS NOT NULL) +
        (synastry_run_id IS NOT NULL) +
        (locality_run_id IS NOT NULL) <= 1
    ),
    CHECK (
        (analysis_type = 'transits' AND transit_run_id IS NOT NULL) OR
        (analysis_type = 'synastry' AND synastry_run_id IS NOT NULL) OR
        (analysis_type = 'locality' AND locality_run_id IS NOT NULL) OR
        (analysis_type IN ('natal', 'aspects_houses', 'integrated') AND
            transit_run_id IS NULL AND synastry_run_id IS NULL AND locality_run_id IS NULL)
    ),
    CHECK (status NOT IN ('ready', 'partial') OR output_text IS NOT NULL),
    FOREIGN KEY (mapa_id) REFERENCES astrologo_mapas(id) ON DELETE CASCADE,
    FOREIGN KEY (source_artifact_id) REFERENCES astrologo_artifacts(id) ON DELETE CASCADE,
    FOREIGN KEY (transit_run_id) REFERENCES astrologo_transit_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (synastry_run_id) REFERENCES astrologo_synastry_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (locality_run_id) REFERENCES astrologo_locality_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS astrologo_render_assets (
    id TEXT PRIMARY KEY CHECK (
        length(id) BETWEEN 8 AND 128 AND id = trim(id) AND id NOT GLOB '*[^0-9A-Za-z:._-]*'
    ),
    mapa_id TEXT NOT NULL,
    source_artifact_id TEXT,
    render_type TEXT NOT NULL CHECK (render_type IN (
        'natal_wheel', 'synastry_wheel', 'locality_map', 'aspect_matrix'
    )),
    renderer_id TEXT NOT NULL CHECK (length(renderer_id) BETWEEN 3 AND 128),
    renderer_version TEXT NOT NULL CHECK (length(renderer_version) BETWEEN 1 AND 32),
    storage_backend TEXT NOT NULL CHECK (storage_backend IN ('r2', 'external')),
    storage_key TEXT,
    content_type TEXT CHECK (content_type IS NULL OR content_type IN (
        'image/png', 'image/webp', 'image/avif', 'image/svg+xml'
    )),
    byte_size INTEGER CHECK (byte_size IS NULL OR byte_size >= 0),
    sha256 TEXT CHECK (
        sha256 IS NULL OR (length(sha256) = 64 AND sha256 NOT GLOB '*[^0-9a-f]*')
    ),
    width_px INTEGER CHECK (width_px IS NULL OR width_px > 0),
    height_px INTEGER CHECK (height_px IS NULL OR height_px > 0),
    alt_text_pt_br TEXT NOT NULL CHECK (length(trim(alt_text_pt_br)) > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'ready', 'partial', 'failed', 'stale'
    )),
    diagnostic_json TEXT CHECK (diagnostic_json IS NULL OR json_valid(diagnostic_json)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT CHECK (expires_at IS NULL OR datetime(expires_at) IS NOT NULL),
    CHECK (status NOT IN ('ready', 'partial') OR (
        storage_key IS NOT NULL AND content_type IS NOT NULL AND byte_size IS NOT NULL AND sha256 IS NOT NULL
    )),
    FOREIGN KEY (mapa_id) REFERENCES astrologo_mapas(id) ON DELETE CASCADE,
    FOREIGN KEY (source_artifact_id) REFERENCES astrologo_artifacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS astrologo_user_saved_items (
    id TEXT PRIMARY KEY CHECK (
        length(id) BETWEEN 8 AND 128 AND id = trim(id) AND id NOT GLOB '*[^0-9A-Za-z:._-]*'
    ),
    user_data_id TEXT NOT NULL,
    mapa_id TEXT,
    artifact_id TEXT,
    transit_run_id TEXT,
    synastry_run_id TEXT,
    locality_run_id TEXT,
    label TEXT CHECK (label IS NULL OR length(label) <= 160),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (
        (mapa_id IS NOT NULL) +
        (artifact_id IS NOT NULL) +
        (transit_run_id IS NOT NULL) +
        (synastry_run_id IS NOT NULL) +
        (locality_run_id IS NOT NULL) = 1
    ),
    FOREIGN KEY (user_data_id) REFERENCES astrologo_user_data(id) ON DELETE CASCADE,
    FOREIGN KEY (mapa_id) REFERENCES astrologo_mapas(id) ON DELETE CASCADE,
    FOREIGN KEY (artifact_id) REFERENCES astrologo_artifacts(id) ON DELETE CASCADE,
    FOREIGN KEY (transit_run_id) REFERENCES astrologo_transit_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (synastry_run_id) REFERENCES astrologo_synastry_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (locality_run_id) REFERENCES astrologo_locality_runs(id) ON DELETE CASCADE
);

-- O produtor de sinastria persiste o segundo sujeito em um mapa técnico sem
-- e-mail proprietário. A FK remove o run quando o mapa primário é apagado,
-- mas não alcança esse segundo mapa; o trigger elimina a PII dedicada antes
-- que o cascade torne impossível identificar sua origem. Um secundário ainda
-- referenciado por outro mapa primário é preservado.
CREATE TRIGGER IF NOT EXISTS trg_astrologo_delete_dedicated_synastry_secondaries
BEFORE DELETE ON astrologo_mapas
FOR EACH ROW
BEGIN
    DELETE FROM astrologo_mapas
    WHERE id IN (
        SELECT synastry_run.secondary_mapa_id
        FROM astrologo_synastry_runs AS synastry_run
        WHERE synastry_run.primary_mapa_id = OLD.id
    )
      AND id <> OLD.id
      AND NULLIF(trim(email), '') IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM astrologo_synastry_runs AS retained_run
          WHERE (
              retained_run.secondary_mapa_id = astrologo_mapas.id
              AND retained_run.primary_mapa_id <> OLD.id
          )
             OR retained_run.primary_mapa_id = astrologo_mapas.id
      );
END;

CREATE INDEX IF NOT EXISTS idx_astrologo_artifacts_mapa_type_status_created
ON astrologo_artifacts(mapa_id, artifact_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_astrologo_artifacts_transit_run
ON astrologo_artifacts(transit_run_id);
CREATE INDEX IF NOT EXISTS idx_astrologo_artifacts_synastry_run
ON astrologo_artifacts(synastry_run_id);
CREATE INDEX IF NOT EXISTS idx_astrologo_artifacts_locality_run
ON astrologo_artifacts(locality_run_id);
CREATE INDEX IF NOT EXISTS idx_astrologo_artifacts_status_updated
ON astrologo_artifacts(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_astrologo_transit_runs_mapa_status_reference
ON astrologo_transit_runs(mapa_id, status, reference_instant_utc DESC);
CREATE INDEX IF NOT EXISTS idx_astrologo_transit_runs_artifact
ON astrologo_transit_runs(result_artifact_id);
CREATE INDEX IF NOT EXISTS idx_astrologo_transit_runs_status_updated
ON astrologo_transit_runs(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_astrologo_synastry_runs_primary_status_created
ON astrologo_synastry_runs(primary_mapa_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_astrologo_synastry_runs_secondary_status_created
ON astrologo_synastry_runs(secondary_mapa_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_astrologo_synastry_runs_artifact
ON astrologo_synastry_runs(result_artifact_id);
CREATE INDEX IF NOT EXISTS idx_astrologo_synastry_runs_status_updated
ON astrologo_synastry_runs(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_astrologo_locality_runs_mapa_status_created
ON astrologo_locality_runs(mapa_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_astrologo_locality_runs_artifact
ON astrologo_locality_runs(result_artifact_id);
CREATE INDEX IF NOT EXISTS idx_astrologo_locality_runs_status_updated
ON astrologo_locality_runs(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_astrologo_ai_analyses_mapa_type_status_created
ON astrologo_ai_analyses(mapa_id, analysis_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_astrologo_ai_analyses_source_artifact
ON astrologo_ai_analyses(source_artifact_id);
CREATE INDEX IF NOT EXISTS idx_astrologo_ai_analyses_transit_run
ON astrologo_ai_analyses(transit_run_id);
CREATE INDEX IF NOT EXISTS idx_astrologo_ai_analyses_synastry_run
ON astrologo_ai_analyses(synastry_run_id);
CREATE INDEX IF NOT EXISTS idx_astrologo_ai_analyses_locality_run
ON astrologo_ai_analyses(locality_run_id);
CREATE INDEX IF NOT EXISTS idx_astrologo_ai_analyses_status_updated
ON astrologo_ai_analyses(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_astrologo_render_assets_mapa_type_status_created
ON astrologo_render_assets(mapa_id, render_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_astrologo_render_assets_source_artifact
ON astrologo_render_assets(source_artifact_id);
CREATE INDEX IF NOT EXISTS idx_astrologo_render_assets_status_updated
ON astrologo_render_assets(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_astrologo_user_saved_items_user_created
ON astrologo_user_saved_items(user_data_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_astrologo_saved_user_mapa
ON astrologo_user_saved_items(user_data_id, mapa_id) WHERE mapa_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_astrologo_saved_user_artifact
ON astrologo_user_saved_items(user_data_id, artifact_id) WHERE artifact_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_astrologo_saved_user_transit
ON astrologo_user_saved_items(user_data_id, transit_run_id) WHERE transit_run_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_astrologo_saved_user_synastry
ON astrologo_user_saved_items(user_data_id, synastry_run_id) WHERE synastry_run_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_astrologo_saved_user_locality
ON astrologo_user_saved_items(user_data_id, locality_run_id) WHERE locality_run_id IS NOT NULL;
