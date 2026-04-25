import { type D1Database, logModuleOperationalEvent } from './operational';

export type HubModule = 'apphub' | 'adminhub';

export type HubCard = {
  name: string;
  description: string;
  url: string;
  icon: string;
  badge: string;
};

export type HubEnv = {
  BIGDATA_DB?: D1Database;
};

type HubTable = 'apphub_cards' | 'adminhub_cards';

type HubConfigRow = {
  name?: string;
  description?: string;
  url?: string;
  icon?: string | null;
  badge?: string | null;
  display_order?: number;
};

const HUB_CARDS_LIMITS = {
  maxCards: 100,
  nameMaxLength: 120,
  descriptionMaxLength: 600,
  urlMaxLength: 2048,
  iconMaxLength: 32,
  badgeMaxLength: 80,
} as const;

const APPHUB_DEFAULT_CARDS: HubCard[] = [
  {
    name: 'Reflexos da Alma',
    description: 'Publicações sobre temas científico-religio-filosóficos',
    url: 'https://www.lcv.rio.br',
    icon: '🧠',
    badge: 'Abrir Site',
  },
  {
    name: 'Mapa Astral',
    description: 'Cálculo de mapas baseados no Zodíaco Tropical e no Astronômico Realista.',
    url: 'https://mapa-astral.lcv.app.br',
    icon: '✨',
    badge: 'Abrir App',
  },
  {
    name: 'Oráculo Financeiro',
    description: 'Consolidação e projeção de métricas financeiras.',
    url: 'https://oraculo-financeiro.lcv.app.br',
    icon: '💰',
    badge: 'Abrir App',
  },
  {
    name: 'Calculadora Financeira',
    description: 'Simulador para operações financeiras.',
    url: 'https://calculadora.lcv.app.br/',
    icon: '🧮',
    badge: 'Abrir App',
  },
];

const ADMINHUB_DEFAULT_CARDS: HubCard[] = [
  {
    name: 'MTA-STS ADMIN',
    description: 'Ferramenta administrativa para geração e gestão de identificadores e políticas.',
    url: 'https://mtasts-admin.lcv.app.br',
    icon: '🔐',
    badge: 'Autenticar',
  },
  {
    name: 'Leitor TLS-RPT',
    description: 'Leitura e consolidação de relatórios TLS para análise operacional.',
    url: 'https://tls-rpt.lcv.app.br',
    icon: '📄',
    badge: 'Autenticar',
  },
  {
    name: 'MainSite Admin',
    description: 'Painel de gestão do site principal.',
    url: 'https://admin-site.lcv.rio.br',
    icon: '🏢',
    badge: 'Autenticar',
  },
  {
    name: 'Astrólogo Admin',
    description: 'Painel administrativo do ecossistema Astrólogo.',
    url: 'https://admin-astrologo.lcv.app.br',
    icon: '🌌',
    badge: 'Autenticar',
  },
  {
    name: 'Calculadora Financeira Admin',
    description: 'Painel administrativo da calculadora de câmbio com controle operacional.',
    url: 'https://admin.lcv.app.br',
    icon: '🏦',
    badge: 'Autenticar',
  },
];

export const toHubHeaders = () => ({
  'Content-Type': 'application/json',
});

const toTable = (module: HubModule): HubTable => (module === 'apphub' ? 'apphub_cards' : 'adminhub_cards');

const toDefaultCards = (module: HubModule) => (module === 'apphub' ? APPHUB_DEFAULT_CARDS : ADMINHUB_DEFAULT_CARDS);

const sanitizeCard = (raw: Partial<HubCard>): HubCard | null => {
  const name = String(raw.name ?? '').trim();
  const description = String(raw.description ?? '').trim();
  const url = String(raw.url ?? '').trim();
  const icon = String(raw.icon ?? '').trim();
  const badge = String(raw.badge ?? '').trim();

  if (!name || !description || !url) {
    return null;
  }

  return {
    name,
    description,
    url,
    icon,
    badge,
  };
};

const isValidHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const validateCards = (cards: HubCard[]) => {
  if (cards.length === 0) {
    throw new Error('Informe ao menos um card válido (name, description e url são obrigatórios).');
  }

  if (cards.length > HUB_CARDS_LIMITS.maxCards) {
    throw new Error(`Limite excedido: máximo de ${HUB_CARDS_LIMITS.maxCards} cards por módulo.`);
  }

  const seenNames = new Set<string>();
  const seenUrls = new Set<string>();

  for (const [index, card] of cards.entries()) {
    const position = index + 1;

    if (card.name.length > HUB_CARDS_LIMITS.nameMaxLength) {
      throw new Error(`Card #${position}: nome excede ${HUB_CARDS_LIMITS.nameMaxLength} caracteres.`);
    }

    if (card.description.length > HUB_CARDS_LIMITS.descriptionMaxLength) {
      throw new Error(`Card #${position}: descrição excede ${HUB_CARDS_LIMITS.descriptionMaxLength} caracteres.`);
    }

    if (card.url.length > HUB_CARDS_LIMITS.urlMaxLength) {
      throw new Error(`Card #${position}: URL excede ${HUB_CARDS_LIMITS.urlMaxLength} caracteres.`);
    }

    if (card.icon.length > HUB_CARDS_LIMITS.iconMaxLength) {
      throw new Error(`Card #${position}: ícone excede ${HUB_CARDS_LIMITS.iconMaxLength} caracteres.`);
    }

    if (card.badge.length > HUB_CARDS_LIMITS.badgeMaxLength) {
      throw new Error(`Card #${position}: badge excede ${HUB_CARDS_LIMITS.badgeMaxLength} caracteres.`);
    }

    if (!isValidHttpUrl(card.url)) {
      throw new Error(`Card #${position}: URL inválida. Use http:// ou https://.`);
    }

    const normalizedName = card.name.trim().toLowerCase();
    const normalizedUrl = card.url.trim().toLowerCase();

    if (seenNames.has(normalizedName)) {
      throw new Error(`Card #${position}: nome duplicado no payload.`);
    }

    if (seenUrls.has(normalizedUrl)) {
      throw new Error(`Card #${position}: URL duplicada no payload.`);
    }

    seenNames.add(normalizedName);
    seenUrls.add(normalizedUrl);
  }
};

const mapRowToCard = (row: HubConfigRow) =>
  sanitizeCard({
    name: row.name,
    description: row.description,
    url: row.url,
    icon: row.icon ?? '',
    badge: row.badge ?? '',
  });

export const ensureHubTables = async (db: D1Database) => {
  await db
    .prepare(`
    CREATE TABLE IF NOT EXISTS apphub_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_order INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      badge TEXT,
      updated_at INTEGER NOT NULL,
      updated_by TEXT
    )
  `)
    .run();

  await db
    .prepare('CREATE INDEX IF NOT EXISTS idx_apphub_cards_display_order ON apphub_cards(display_order ASC)')
    .run();

  await db
    .prepare(`
    CREATE TABLE IF NOT EXISTS adminhub_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_order INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      badge TEXT,
      updated_at INTEGER NOT NULL,
      updated_by TEXT
    )
  `)
    .run();

  await db
    .prepare('CREATE INDEX IF NOT EXISTS idx_adminhub_cards_display_order ON adminhub_cards(display_order ASC)')
    .run();
};

const loadCardsFromDb = async (db: D1Database, module: HubModule) => {
  await ensureHubTables(db);
  const table = toTable(module);

  const rows = await db
    .prepare(`
    SELECT name, description, url, icon, badge, display_order
    FROM ${table}
    ORDER BY display_order ASC, id ASC
  `)
    .all<HubConfigRow>();

  return (rows.results ?? []).map((row) => mapRowToCard(row)).filter((item): item is HubCard => item !== null);
};

export const saveCardsToDb = async (db: D1Database, module: HubModule, cards: HubCard[], adminActor?: string) => {
  await ensureHubTables(db);
  const table = toTable(module);
  await db.prepare(`DELETE FROM ${table}`).run();

  let inserted = 0;
  const updatedAt = Date.now();

  for (const [index, card] of cards.entries()) {
    await db
      .prepare(`
      INSERT INTO ${table} (display_order, name, description, url, icon, badge, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(index, card.name, card.description, card.url, card.icon, card.badge, updatedAt, adminActor ?? null)
      .run();
    inserted += 1;
  }

  return inserted;
};

export const resolveHubConfig = async (env: HubEnv, module: HubModule) => {
  const db = env.BIGDATA_DB;
  const defaultCards = toDefaultCards(module);

  if (db) {
    const existingCards = await loadCardsFromDb(db, module);
    if (existingCards.length > 0) {
      return {
        source: 'bigdata_db' as const,
        cards: existingCards,
        warnings: [] as string[],
      };
    }

    await saveCardsToDb(db, module, defaultCards, 'bootstrap@admin-app');
    return {
      source: 'bootstrap-default' as const,
      cards: defaultCards,
      warnings: ['BIGDATA_DB sem registros; bootstrap local aplicado sem chamadas entre domínios.'],
    };
  }

  return {
    source: 'bootstrap-default' as const,
    cards: defaultCards,
    warnings: ['BIGDATA_DB indisponível; retornando defaults locais sem chamadas a apps via URL pública.'],
  };
};

export const parseCardsFromBody = (body: unknown) => {
  const payload = body as { cards?: Partial<HubCard>[] };
  const items = Array.isArray(payload?.cards) ? payload.cards : [];
  const cards = items.map((item) => sanitizeCard(item)).filter((item): item is HubCard => item !== null);

  validateCards(cards);

  return cards;
};

export const logHubEvent = async (
  db: D1Database | undefined,
  input: {
    module: HubModule;
    action: string;
    source: 'bigdata_db' | 'bootstrap-default';
    ok: boolean;
    fallbackUsed: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  },
) => {
  if (!db) {
    return;
  }

  await logModuleOperationalEvent(db, {
    module: input.module,
    source: input.source,
    ok: input.ok,
    fallbackUsed: input.fallbackUsed,
    errorMessage: input.errorMessage,
    metadata: {
      action: input.action,
      ...(input.metadata ?? {}),
    },
  });
};
