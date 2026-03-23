# Convenção de Prefixação por Contexto — `bigdata_db`

## Objetivo

Padronizar a unificação das bases D1 no banco único `bigdata_db` sem colisão de nomes, com rastreabilidade por domínio funcional.

## Regra obrigatória

Todo objeto lógico deve ser prefixado por contexto:

- Tabelas
- Índices
- Policies / configurações de rate limit
- Views (quando aplicável)

## Prefixos aprovados

- `astrologo_`
- `calculadora_`
- `mainsite_`
- `mtasts_`
- `adminhub_` (quando o módulo for incorporado)

> Se surgir novo domínio, adicionar prefixo antes de qualquer migration em produção.

## Padrões de nomenclatura

### Tabelas

Formato:

- `<prefixo><entidade>`

Exemplos:

- `astrologo_mapas`
- `calculadora_parametros`
- `mainsite_eventos`
- `mtasts_policies`

### Índices

Formato:

- `idx_<prefixo><entidade>_<campo>`

Exemplos:

- `idx_astrologo_mapas_created_at`
- `idx_calc_parametros_updated_at`
- `idx_mainsite_eventos_created_at`

### Policies / Rate limits

Formato recomendado de chave lógica:

- `<prefixo-sem-sufixo>/<rota>`

Exemplos:

- `astrologo/analisar`
- `astrologo/enviar-email`
- `calculadora/calcular`
- `mainsite/publicar`

## Modelo SQL de referência

```sql
-- Exemplo: domínio Astrologo
CREATE TABLE IF NOT EXISTS astrologo_mapas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  data_nascimento TEXT,
  analise_ia TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_astrologo_mapas_created_at
  ON astrologo_mapas(created_at DESC);

-- Exemplo: políticas de rate limit centralizadas com chave contextual
CREATE TABLE IF NOT EXISTS core_rate_limit_policies (
  route_key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  max_requests INTEGER NOT NULL,
  window_minutes INTEGER NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO core_rate_limit_policies
(route_key, enabled, max_requests, window_minutes)
VALUES
('astrologo/analisar', 1, 6, 15),
('astrologo/enviar-email', 1, 4, 60);
```

## Checklist de migração por módulo

- Confirmar prefixo do domínio.
- Renomear tabelas para o padrão de prefixo.
- Renomear índices para o padrão `idx_<prefixo>...`.
- Revisar queries de leitura/escrita no backend.
- Revisar seeds e policies.
- Homologar módulo no `admin-app` sem desligar legado.
- Somente após validação, concluir cutover.

## Artefatos de migration já criados

- Astrólogo (base para `bigdata_db`):
  - `db/migrations/001_bigdata_astrologo_prefixacao.sql`
- Calculadora Calculadora (base para `bigdata_db`):
  - `db/migrations/002_bigdata_calc_prefixacao.sql`
- MainSite (base para `bigdata_db`):
  - `db/migrations/003_bigdata_mainsite_prefixacao.sql`
- MTA-STS (base para `bigdata_db`):
  - `db/migrations/004_bigdata_mtasts_prefixacao.sql`
- Admin-app operacional (telemetria/sync runs):
  - `db/migrations/005_bigdata_adminapp_operational.sql`

## Observações operacionais

- Esta convenção é mandatória para a fase de consolidação em `bigdata_db`.
- Qualquer exceção deve ser documentada antes da execução da migration.
