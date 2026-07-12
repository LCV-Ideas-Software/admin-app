import { resolveAdminActorFromRequest } from '../../../../../functions/api/_lib/admin-actor';
import { type Context as BaseContext, type Env, toHeaders } from '../../../../../functions/api/_lib/astrologo-admin';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace } from '../../../../../functions/api/_lib/request-trace';

// Middleware do runtime Pages pode injetar `data.env`; o tipo compartilhado não declara `data`.
type Context = BaseContext & { data?: { env?: Env } };

type AstrologoMapa = {
  id?: string;
  nome?: string;
  data_nascimento?: string | null;
  hora_nascimento?: string | null;
  local_nascimento?: string | null;
  dados_astronomica?: string | null;
  dados_tropical?: string | null;
  dados_globais?: string | null;
  dados_posicionais_v2?: string | null;
  analise_ia?: string | null;
  created_at?: string | null;
};

type ArtifactRow = {
  id: string;
  schema_id: string;
  schema_version: string;
  source_hash: string;
  payload_json: string;
  diagnostic_json: string | null;
  created_at: string;
  updated_at: string;
  primary_calculation_id?: string | null;
  secondary_calculation_id?: string | null;
  primary_subject_name?: string | null;
  secondary_subject_name?: string | null;
};

type AnalysisJobRow = {
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  phase: 'planning' | 'analyzing' | 'reducing' | 'synthesizing' | 'completed' | 'failed';
  completed_steps: number;
  total_steps: number;
  input_tokens: number;
  output_tokens: number;
  error_code: string | null;
  has_error_detail: number;
  created_at_utc: string;
  updated_at_utc: string;
  completed_at_utc: string | null;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: toHeaders(),
  });

const resolveDb = (context: Context) => (context.data?.env ?? context.env).BIGDATA_DB;
const resolveOperationalSource = () => 'bigdata_db' as const;

const artifactMetadata = (artifact: ArtifactRow | null) =>
  artifact
    ? {
        id: artifact.id,
        schemaId: artifact.schema_id,
        schemaVersion: artifact.schema_version,
        sourceHash: artifact.source_hash,
        diagnosticJson: artifact.diagnostic_json,
        createdAt: artifact.created_at,
        updatedAt: artifact.updated_at,
      }
    : null;

const ANALYSIS_JOB_STATUSES = new Set(['queued', 'running', 'completed', 'failed', 'cancelled']);
const ANALYSIS_JOB_PHASES = new Set(['planning', 'analyzing', 'reducing', 'synthesizing', 'completed', 'failed']);

const analysisJobMetadata = (job: AnalysisJobRow | null) => {
  if (
    !job ||
    !ANALYSIS_JOB_STATUSES.has(job.status) ||
    !ANALYSIS_JOB_PHASES.has(job.phase) ||
    typeof job.created_at_utc !== 'string' ||
    typeof job.updated_at_utc !== 'string'
  ) {
    return null;
  }
  const errorCode =
    typeof job.error_code === 'string' && /^[A-Z0-9_.:-]{1,80}$/i.test(job.error_code) ? job.error_code : null;
  return {
    status: job.status,
    phase: job.phase,
    progress: {
      completed: Math.max(0, Number(job.completed_steps) || 0),
      total: Math.max(0, Number(job.total_steps) || 0),
    },
    tokens: {
      input: Math.max(0, Number(job.input_tokens) || 0),
      output: Math.max(0, Number(job.output_tokens) || 0),
    },
    error:
      errorCode || Number(job.has_error_detail) === 1
        ? {
            code: errorCode,
            detail: Number(job.has_error_detail) === 1 ? 'Detalhes técnicos registrados no servidor.' : null,
          }
        : null,
    createdAtUtc: job.created_at_utc,
    updatedAtUtc: job.updated_at_utc,
    completedAtUtc: job.completed_at_utc,
  };
};

export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request);
  const db = resolveDb(context);
  const source = resolveOperationalSource();

  if (!db) {
    return json({ ok: false, error: 'Nenhum binding D1 disponível (BIGDATA_DB).', ...trace }, 503);
  }

  try {
    const body = (await context.request.json()) as Record<string, unknown>;
    const adminActor = resolveAdminActorFromRequest(context.request, body);
    const id = String(body.id ?? '').trim();

    if (!id) {
      return json({ ok: false, error: 'ID inválido.', ...trace }, 400);
    }

    const mapa = await db
      .prepare(
        `
      SELECT
        id,
        nome,
        data_nascimento,
        hora_nascimento,
        local_nascimento,
        dados_astronomica,
        dados_tropical,
        dados_globais,
        dados_posicionais_v2,
        analise_ia,
        created_at
      FROM astrologo_mapas
      WHERE id = ?
      LIMIT 1
    `,
      )
      .bind(id)
      .first<AstrologoMapa>();

    if (!mapa) {
      return json({ ok: false, error: 'Mapa não encontrado.', ...trace }, 404);
    }

    let natalArtifact: ArtifactRow | null = null;
    let transitArtifact: ArtifactRow | null = null;
    let synastryArtifact: ArtifactRow | null = null;
    let localityArtifact: ArtifactRow | null = null;
    let analysisJob: AnalysisJobRow | null = null;
    try {
      natalArtifact = await db
        .prepare(
          `
        SELECT
          id,
          schema_id,
          schema_version,
          source_hash,
          payload_json,
          diagnostic_json,
          created_at,
          updated_at
        FROM astrologo_artifacts AS artifact
        WHERE artifact.mapa_id = ?
          AND artifact.artifact_type = 'natal_chart_analysis'
          AND artifact.schema_id = 'urn:astrologo:natal-chart-analysis'
          AND artifact.schema_version = '1.0.0'
          AND artifact.status = 'ready'
        ORDER BY datetime(artifact.updated_at) DESC, datetime(artifact.created_at) DESC, artifact.id DESC
        LIMIT 1
      `,
        )
        .bind(id)
        .first<ArtifactRow>();
    } catch {
      // Compatibilidade com bancos legados ainda sem a migration de artefatos.
    }

    try {
      transitArtifact = await db
        .prepare(
          `
        SELECT
          artifact.id,
          artifact.schema_id,
          artifact.schema_version,
          artifact.source_hash,
          artifact.payload_json,
          artifact.diagnostic_json,
          artifact.created_at,
          artifact.updated_at
        FROM astrologo_artifacts AS artifact
        INNER JOIN astrologo_transit_runs AS transit_run
          ON transit_run.id = artifact.transit_run_id
         AND transit_run.mapa_id = artifact.mapa_id
         AND transit_run.status = 'ready'
         AND transit_run.result_artifact_id = artifact.id
        WHERE transit_run.mapa_id = ?
          AND artifact.artifact_type = ?
          AND artifact.schema_id = 'urn:astrologo:transit-run'
          AND artifact.schema_version = '1.0.0'
          AND artifact.status = 'ready'
        ORDER BY datetime(transit_run.reference_instant_utc) DESC,
                 datetime(artifact.updated_at) DESC,
                 artifact.id DESC
        LIMIT 1
      `,
        )
        .bind(id, 'transit_result')
        .first<ArtifactRow>();
    } catch {
      // Compatibilidade com bancos legados ainda sem as tabelas de trânsitos.
    }

    try {
      synastryArtifact = await db
        .prepare(
          `
        SELECT
          artifact.id,
          artifact.schema_id,
          artifact.schema_version,
          artifact.source_hash,
          artifact.payload_json,
          artifact.diagnostic_json,
          artifact.created_at,
          artifact.updated_at,
          synastry_run.primary_mapa_id AS primary_calculation_id,
          synastry_run.secondary_mapa_id AS secondary_calculation_id,
          primary_map.nome AS primary_subject_name,
          secondary_map.nome AS secondary_subject_name
        FROM astrologo_artifacts AS artifact
        INNER JOIN astrologo_synastry_runs AS synastry_run
          ON synastry_run.id = artifact.synastry_run_id
         AND synastry_run.status = 'ready'
         AND synastry_run.result_artifact_id = artifact.id
         AND artifact.mapa_id = synastry_run.primary_mapa_id
        INNER JOIN astrologo_mapas AS primary_map ON primary_map.id = synastry_run.primary_mapa_id
        INNER JOIN astrologo_mapas AS secondary_map ON secondary_map.id = synastry_run.secondary_mapa_id
        WHERE ? IN (synastry_run.primary_mapa_id, synastry_run.secondary_mapa_id)
          AND artifact.artifact_type = ?
          AND artifact.schema_id = 'urn:astrologo:synastry-run'
          AND artifact.schema_version = '1.0.0'
          AND artifact.status = 'ready'
        ORDER BY datetime(artifact.created_at) DESC,
                 datetime(artifact.updated_at) DESC,
                 artifact.id DESC
        LIMIT 1
      `,
        )
        .bind(id, 'synastry_result')
        .first<ArtifactRow>();
    } catch {
      // Compatibilidade com bancos legados ainda sem as tabelas de sinastria.
    }

    try {
      localityArtifact = await db
        .prepare(
          `
        SELECT
          artifact.id,
          artifact.schema_id,
          artifact.schema_version,
          artifact.source_hash,
          artifact.payload_json,
          artifact.diagnostic_json,
          artifact.created_at,
          artifact.updated_at
        FROM astrologo_artifacts AS artifact
        INNER JOIN astrologo_locality_runs AS locality_run
          ON locality_run.id = artifact.locality_run_id
         AND locality_run.mapa_id = artifact.mapa_id
         AND locality_run.status = 'ready'
         AND locality_run.result_artifact_id = artifact.id
        WHERE locality_run.mapa_id = ?
          AND artifact.artifact_type = ?
          AND artifact.schema_id = 'urn:astrologo:locality-map'
          AND artifact.schema_version = '1.0.0'
          AND artifact.status = 'ready'
        ORDER BY datetime(artifact.created_at) DESC,
                 datetime(artifact.updated_at) DESC,
                 artifact.id DESC
        LIMIT 1
      `,
        )
        .bind(id, 'locality_map')
        .first<ArtifactRow>();
    } catch {
      // Compatibilidade com bancos legados ainda sem as tabelas de localidade.
    }

    try {
      analysisJob = await db
        .prepare(
          `
        SELECT
          status,
          phase,
          completed_steps,
          total_steps,
          input_tokens,
          output_tokens,
          error_code,
          CASE WHEN error_detail IS NULL THEN 0 ELSE 1 END AS has_error_detail,
          strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS created_at_utc,
          strftime('%Y-%m-%dT%H:%M:%SZ', updated_at) AS updated_at_utc,
          CASE
            WHEN completed_at IS NULL THEN NULL
            ELSE strftime('%Y-%m-%dT%H:%M:%SZ', completed_at)
          END AS completed_at_utc
        FROM astrologo_ai_analysis_jobs
        WHERE mapa_id = ?
        ORDER BY datetime(created_at) DESC, rowid DESC
        LIMIT 1
      `,
        )
        .bind(id)
        .first<AnalysisJobRow>();
    } catch {
      // Compatibilidade com bancos legados ainda sem a migration 018.
    }

    const hydratedMapa = {
      ...mapa,
      natal_chart_analysis_v1: natalArtifact?.payload_json ?? null,
      natal_chart_analysis_artifact: artifactMetadata(natalArtifact),
      transit_run_v1: transitArtifact?.payload_json ?? null,
      transit_run_artifact: artifactMetadata(transitArtifact),
      synastry_run_v1: synastryArtifact?.payload_json ?? null,
      synastry_run_artifact: artifactMetadata(synastryArtifact),
      synastry_subjects: synastryArtifact
        ? {
            A: synastryArtifact.primary_subject_name ?? 'Pessoa A',
            B: synastryArtifact.secondary_subject_name ?? 'Pessoa B',
            primaryCalculationId: synastryArtifact.primary_calculation_id,
            secondaryCalculationId: synastryArtifact.secondary_calculation_id,
          }
        : null,
      locality_map_v1: localityArtifact?.payload_json ?? null,
      locality_map_artifact: artifactMetadata(localityArtifact),
      ai_analysis_job: analysisJobMetadata(analysisJob),
    };

    const operationalDb = (context.data?.env ?? context.env).BIGDATA_DB;
    if (operationalDb) {
      try {
        await logModuleOperationalEvent(operationalDb, {
          module: 'astrologo',
          source,
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'read-mapa',
            mapaId: id,
            adminActor,
          },
        });
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({
      ok: true,
      mapa: hydratedMapa,
      admin_actor: adminActor,
      ...trace,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao ler mapa do Astrólogo';

    const operationalDb = (context.data?.env ?? context.env).BIGDATA_DB;
    if (operationalDb) {
      try {
        await logModuleOperationalEvent(operationalDb, {
          module: 'astrologo',
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: 'read-mapa' },
        });
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: false, error: message, ...trace }, 500);
  }
}
