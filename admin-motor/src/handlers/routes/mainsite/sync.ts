import type { D1Database } from '../../../../../functions/api/_lib/operational';
import { finishSyncRun, logModuleOperationalEvent, startSyncRun } from '../../../../../functions/api/_lib/operational';

type Env = {
  BIGDATA_DB?: D1Database;
};

type Context = {
  request: Request;
  env: Env;
};

type CountRow = { total?: number };

type SettingRow = {
  id?: string;
  payload?: string;
};

const toHeaders = () => ({
  'Content-Type': 'application/json',
});

const DEFAULT_SETTINGS: Array<{ id: string; payload: Record<string, unknown> }> = [
  {
    id: 'mainsite/appearance',
    payload: {
      allowAutoMode: true,
      light: { bgColor: '#ffffff', bgImage: '', fontColor: '#333333', titleColor: '#111111' },
      dark: { bgColor: '#131314', bgImage: '', fontColor: '#E3E3E3', titleColor: '#8AB4F8' },
      shared: { fontSize: '1.15rem', titleFontSize: '1.8rem', fontFamily: 'sans-serif' },
    },
  },
  {
    id: 'mainsite/rotation',
    payload: { enabled: false, interval: 60, last_rotated_at: 0 },
  },
  {
    id: 'mainsite/ratelimit',
    payload: {
      chatbot: { enabled: false, maxRequests: 5, windowMinutes: 1 },
      email: { enabled: false, maxRequests: 3, windowMinutes: 15 },
    },
  },
  {
    id: 'mainsite/disclaimers',
    payload: {
      enabled: true,
      items: [{ id: 'default', title: 'Aviso', text: 'Texto de exemplo.', buttonText: 'Concordo' }],
    },
  },
];

const isValidJson = (raw: string | undefined) => {
  if (!raw?.trim()) {
    return false;
  }
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
};

export async function onRequestPost(context: Context) {
  const env = context.env;

  if (!env.BIGDATA_DB) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'BIGDATA_DB não configurado no runtime.',
      }),
      {
        status: 503,
        headers: toHeaders(),
      },
    );
  }

  const startedAt = Date.now();
  const syncRunId = await startSyncRun(env.BIGDATA_DB, {
    module: 'mainsite',
    status: 'running',
    startedAt,
    metadata: {},
  });

  try {
    const [postsCountRow, settingsRowsRaw] = await Promise.all([
      env.BIGDATA_DB.prepare('SELECT COUNT(1) AS total FROM mainsite_posts').first<CountRow>(),
      env.BIGDATA_DB.prepare('SELECT id, payload FROM mainsite_settings').all<SettingRow>(),
    ]);

    const settingsRows = settingsRowsRaw.results ?? [];
    const settingsMap = new Map(settingsRows.map((row) => [String(row.id ?? ''), row]));

    let settingsInserted = 0;
    let settingsFixed = 0;

    for (const entry of DEFAULT_SETTINGS) {
      const current = settingsMap.get(entry.id);

      if (!current) {
        await env.BIGDATA_DB.prepare(`
          INSERT INTO mainsite_settings (id, payload, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `)
          .bind(entry.id, JSON.stringify(entry.payload))
          .run();
        settingsInserted += 1;
        continue;
      }

      if (!isValidJson(current.payload)) {
        await env.BIGDATA_DB.prepare(`
          UPDATE mainsite_settings
          SET payload = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
          .bind(JSON.stringify(entry.payload), entry.id)
          .run();
        settingsFixed += 1;
      }
    }

    const recordsRead = Number(postsCountRow?.total ?? 0) + settingsRows.length;

    const recordsUpserted = settingsInserted + settingsFixed;

    await finishSyncRun(env.BIGDATA_DB, {
      id: syncRunId,
      status: 'success',
      finishedAt: Date.now(),
      recordsRead,
      recordsUpserted,
    });

    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'mainsite',
      source: 'bigdata_db',
      fallbackUsed: false,
      ok: true,
      metadata: {
        action: 'sync',
        pulledFrom: 'bigdata_db',
        postsLidos: Number(postsCountRow?.total ?? 0),
        financeirosLidos: 0,
        settingsLidos: settingsRows.length,
        settingsInseridos: settingsInserted,
        settingsCorrigidos: settingsFixed,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        syncRunId,
        recordsRead,
        recordsUpserted,
        posts: {
          lidos: Number(postsCountRow?.total ?? 0),
        },
        financialLogs: {
          lidos: 0,
        },
        settings: {
          lidos: settingsRows.length,
          inseridos: settingsInserted,
          corrigidos: settingsFixed,
        },
        startedAt,
        finishedAt: Date.now(),
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada no sync do MainSite';

    await finishSyncRun(env.BIGDATA_DB, {
      id: syncRunId,
      status: 'error',
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message,
    });

    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'mainsite',
      source: 'bigdata_db',
      fallbackUsed: false,
      ok: false,
      errorMessage: message,
      metadata: {
        action: 'sync',
        pulledFrom: 'bigdata_db',
      },
    });

    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
        syncRunId,
      }),
      {
        status: 500,
        headers: toHeaders(),
      },
    );
  }
}
