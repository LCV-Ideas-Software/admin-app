-- admin-app / bigdata_db
-- Migration 017: prova de propriedade para o primeiro salvamento de mapas.
-- Deve ser aplicada depois das migrations 015 e 016, antes do astrologo-app v02.22.00.

ALTER TABLE astrologo_mapas ADD COLUMN save_claim_hash TEXT CHECK (
    save_claim_hash IS NULL OR (
        length(save_claim_hash) = 64 AND
        save_claim_hash NOT GLOB '*[^0-9a-f]*'
    )
);

-- Associações históricas já persistidas no servidor são migradas somente
-- quando há exatamente um e-mail proprietário normalizado para o mapa. O
-- reconciliador do deploy pode repetir este bloco com segurança: ele nunca
-- substitui um proprietário já gravado e ignora JSON legado malformado.
WITH historical_ownership AS (
    SELECT
        json_extract(saved.value, '$.id') AS mapa_id,
        MIN(lower(trim(user_data.email))) AS owner_email,
        COUNT(DISTINCT lower(trim(user_data.email))) AS owner_count
    FROM astrologo_user_data AS user_data,
         json_each(
             CASE
                 WHEN json_valid(user_data.dados_json) THEN
                     CASE
                         WHEN json_type(user_data.dados_json, '$.mapasSalvos') = 'array'
                         THEN user_data.dados_json
                         ELSE '{"mapasSalvos":[]}'
                     END
                 ELSE '{"mapasSalvos":[]}'
             END,
             '$.mapasSalvos'
         ) AS saved
    WHERE CASE
              WHEN saved.type = 'object' THEN json_type(saved.value, '$.id') = 'text'
              ELSE 0
          END
      AND NULLIF(trim(user_data.email), '') IS NOT NULL
    GROUP BY json_extract(saved.value, '$.id')
)
UPDATE astrologo_mapas
SET email = (
    SELECT owner_email
    FROM historical_ownership
    WHERE historical_ownership.mapa_id = astrologo_mapas.id
      AND historical_ownership.owner_count = 1
)
WHERE NULLIF(trim(email), '') IS NULL
  AND id IN (
      SELECT mapa_id
      FROM historical_ownership
      WHERE owner_count = 1
  );

INSERT OR IGNORE INTO astrologo_rate_limit_policies (route, enabled, max_requests, window_minutes)
VALUES ('astrologo/auth-read', 1, 60, 15);

CREATE INDEX IF NOT EXISTS idx_astrologo_mapas_unclaimed_save_claim
ON astrologo_mapas(save_claim_hash)
WHERE save_claim_hash IS NOT NULL;
