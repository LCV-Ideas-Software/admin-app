# Schema canônico do Astrólogo no BIGDATA_DB

Este documento define a fonte canônica do schema persistente usado pelo módulo
Astrólogo. A migration deve existir e ser aplicada antes que uma rota passe a
produzir ou exigir os dados correspondentes. Rotas administrativas não criam
tabelas nem colunas durante uma requisição.

## Configuração canônica da IA

A seleção feita em `admin-app/Astrólogo` possui um único contrato:

- tabela: `admin_module_configs`;
- `module_key`: `astrologo-config`;
- campo dentro de `config_json`: `modeloSintese`;
- formato: JSON válido, por exemplo `{"modeloSintese":"gemini-2.5-flash"}`;
- valor vazio: aplica o fallback definido pelo consumidor, sem renomear a chave.

`admin_config_store` e `modeloIA` não fazem parte desse contrato. A migration 015
semeia apenas a configuração vazia com `INSERT OR IGNORE`; assim, uma escolha já
salva pelo operador nunca é sobrescrita.

## Ordem obrigatória

1. Aplicar as migrations 001 a 014.
2. Em banco legado, confirmar que `astrologo_mapas.email` existe antes da
   migration 015. Essa foi a função do preflight v1; instalações novas devem
   materializar a coluna com `TEXT DEFAULT ''` quando ela estiver ausente.
3. Aplicar `015_bigdata_astrologo_schema_regularization.sql` uma única vez.
4. Aplicar `016_bigdata_astrologo_advanced_charts.sql` uma única vez.
5. Aplicar `017_astrologo_saved_map_claims.sql` e
   `018_astrologo_reentrant_ai_analysis.sql` uma única vez **ou** executar o
   reconciliador v3 do deploy, que materializa os mesmos contratos sem repetir
   o `ALTER TABLE` quando a coluna já existe nem substituir tabelas ou policies
   já canônicas:

   ```bash
   node scripts/reconcile-astrologo-schema.mjs --remote --database bigdata_db
   ```

6. Publicar o `admin-app` e confirmar o preflight. Somente depois publicar o
   `astrologo-app` que escreve ou exige `save_claim_hash` e os jobs reentrantes.

O reconciliador v1.0.0 consulta `PRAGMA table_info(astrologo_mapas)`. Ele adiciona a
coluna `email` somente quando ausente, confirma o resultado e falha fechado se a
tabela base não existir. A migration 015 adiciona `data_analise`, que estava
ausente no schema remoto verificado antes desta mudança.

O workflow de deploy executa o reconciliador v3 antes do Admin Motor. Ele não
reaplica cegamente as migrations 017 e 018: inspeciona o DDL, adiciona somente
colunas ausentes, executa o backfill idempotente, cria tabelas e índices apenas
quando ausentes, semeia policies com `INSERT OR IGNORE` e verifica novamente
todas as garantias. Coluna, tabela ou índice homônimo com definição incompatível
faz o deploy falhar fechado. As migrations 015 e 016 continuam sendo operações
explícitas e únicas.

## Migration 015

A migration 015 declara estruturas antes criadas sob demanda:

- `astrologo_user_data`;
- `astrologo_auth_tokens`;
- `admin_module_configs`;
- `ai_usage_logs`;
- `astrologo_mapas.data_analise`;
- índices de e-mail, autenticação, análise e telemetria.

O índice único de e-mail usa `lower(trim(email))`, refletindo a regra vigente de
um Arquivo Akáshico por endereço normalizado. Antes da primeira aplicação em um
banco preexistente, a consulta abaixo deve retornar zero linhas:

```sql
SELECT lower(trim(email)) AS normalized_email, COUNT(*) AS copies
FROM astrologo_user_data
GROUP BY lower(trim(email))
HAVING COUNT(*) > 1;
```

## Migration 016

Os novos resultados não são acrescentados ao contrato posicional `2.0.0`. Eles
usam entidades independentes e versionadas:

- `astrologo_artifacts`: envelopes tipados para análise natal, `ChartSpec`,
  resultados de trânsito, sinastria e mapa de localidade;
- `astrologo_transit_runs`: instante, horizonte, perfil de orbes e motores;
- `astrologo_synastry_runs`: dois mapas canônicos e consentimento registrado;
- `astrologo_locality_runs`: projeção e resolução geométrica;
- `astrologo_ai_analyses`: análises especializadas, prompt, modelo e tokens;
- `astrologo_render_assets`: metadados de imagens, sem binário no D1;
- `astrologo_user_saved_items`: vínculos salvos pelo usuário com exatamente um
  alvo por registro.

Cada payload possui `schema_id`, `schema_version` e hash SHA-256. Estados
`ready` e `partial` exigem resultado persistido. JSONs de payload, motores e
diagnósticos são validados pelo D1. Resultados possuem vínculo explícito ao run
que os originou. As chaves estrangeiras usam cascata quando a remoção do sujeito
ou da fonte torna o derivado inválido, impedindo que payloads ou imagens de
sinastria sobrevivam isolados.

Sinastria v1 exige `primary_mapa_id` e `secondary_mapa_id`. Dados pessoais do
segundo sujeito não são substituídos por um hash. Um modo efêmero futuro exige
nova migration, contrato próprio e diagnóstico explícito.

O mapa técnico do segundo sujeito é dedicado quando não possui e-mail
proprietário (`NULL` ou vazio). Um trigger `BEFORE DELETE` remove esses mapas
secundários antes do cascade que apaga os runs ligados ao mapa primário; assim,
nome, data, hora, local e posições não ficam órfãos no D1. O trigger preserva um
mapa com e-mail proprietário e também um secundário ainda referenciado por
outro mapa primário ou que atue como sujeito primário de outro run.

O produtor finaliza um resultado derivado em três passos, preferencialmente no
mesmo batch D1: cria o run como `processing`, cria o artefato com o respectivo
`*_run_id` e somente então atualiza o run com `result_artifact_id` e estado
`ready` ou `partial`. Essa ordem satisfaz as FKs cíclicas de propriedade sem
expor um resultado pronto incompleto.

## Migration 017

A reidratação autenticada de mapas salvos introduz um contrato persistente novo:

- `astrologo_mapas.save_claim_hash`: SHA-256 hexadecimal minúsculo de 64
  caracteres ou `NULL`; o segredo em texto puro permanece no navegador que
  calculou o mapa e o hash é apagado quando o primeiro proprietário é associado;
- `idx_astrologo_mapas_unclaimed_save_claim`: índice parcial que contém somente
  claims ainda ativos (`save_claim_hash IS NOT NULL`);
- policy `astrologo/auth-read`: bucket inicial de 60 requisições por 15 minutos
  para `session-retrieve` e `session-map-artifacts`, separado do bucket
  `astrologo/auth` usado por operações mutáveis.

O backfill lê apenas associações já registradas em
`astrologo_user_data.dados_json.mapasSalvos`, normaliza e-mails com
`lower(trim(email))` e preenche `astrologo_mapas.email` somente quando o mesmo
mapa possui exatamente um proprietário distinto. Ele preserva qualquer e-mail
já gravado, deixa conflitos sem proprietário e ignora JSON malformado, listas de
formato inesperado e itens sem um `id` textual. Por isso o reconciliador pode
repeti-lo sem transferir propriedade nem depender de IDs recém-enviados pelo
navegador.

O seed de `astrologo/auth-read` usa `INSERT OR IGNORE`: 60/15 é o padrão de uma
instalação sem policy, enquanto limites já configurados pelo operador permanecem
intocados.

## Migration 018

A análise extensa deixa de depender de uma conexão HTTP única. A migration 018
persiste uma máquina de estados reentrante em duas entidades:

- `astrologo_ai_analysis_jobs`: autorização por `capability_hash`, mapa de origem,
  estado e fase, lease expirável, progresso, tokens, plano leve em JSON, prefixo
  fixo do prompt, resultado final, expiração e diagnóstico;
- `astrologo_ai_analysis_steps`: unidades ordenadas pertencentes ao job, com tipo,
  estado, tentativas, lease, payload, resultado e tokens próprios.

`capability_hash` é o SHA-256 hexadecimal minúsculo da capability entregue ao
cliente. O bearer em texto puro não entra no D1. O índice é único, de modo que
uma capability identifica no máximo um job. `mapa_id` referencia
`astrologo_mapas(id)` e usa `ON DELETE CASCADE`; a chave composta
`(job_id, step_key)` e a FK com cascade impedem etapas órfãs. A ordem também é
única dentro do job. Um índice único parcial sobre `mapa_id`, restrito aos
estados `queued` e `running`, impede duas execuções ativas simultâneas para o
mesmo mapa sem bloquear o histórico de jobs terminais.

Estados canônicos do job:

- `status`: `queued`, `running`, `completed`, `failed` ou `cancelled`;
- `phase`: `planning`, `analyzing`, `reducing`, `synthesizing`, `completed` ou
  `failed`.

Estados das etapas são `pending`, `running`, `completed` e `failed`; os tipos são
`direct`, `fragment`, `reduction` e `synthesis`. `plan_json` registra modelo,
limites, plano leve e modo escolhidos no início do job. `fixed_prompt_prefix`
preserva separadamente a instrução integral que deve acompanhar cada chamada,
sem duplicá-la nos payloads das etapas.

Cada chamada a `astrologo/analisar-etapa` adquire no máximo uma etapa elegível,
realiza no máximo uma chamada Gemini, persiste o resultado e devolve o estado
atual. Se a conexão, o navegador, o Worker ou o provedor cair, outro request pode
retomar um lease expirado. Uma etapa `completed` nunca volta a ser elegível. A
policy inicial da rota é 240 requisições por 60 minutos e usa `INSERT OR IGNORE`,
preservando limites ajustados pelo operador.

Índices canônicos dão suporte à autorização por capability, listagem por mapa e
estado, limpeza por expiração e seleção determinística da próxima etapa:

- `idx_astrologo_ai_analysis_jobs_capability_hash`;
- `idx_astrologo_ai_analysis_jobs_active_mapa` (único e parcial para `queued` e
  `running`);
- `idx_astrologo_ai_analysis_jobs_mapa_status`;
- `idx_astrologo_ai_analysis_jobs_expires_at`;
- `idx_astrologo_ai_analysis_steps_job_ordinal`;
- `idx_astrologo_ai_analysis_steps_job_status_ordinal`.

No detalhe do Arquivo Akáshico, o admin consulta somente a execução mais recente
do mapa e projeta `status`, `phase`, progresso, tokens, erro e timestamps. A UI
traduz estados e fases para pt-BR e converte instantes UTC para
`America/Sao_Paulo`. A consulta SQL deliberadamente não seleciona
`capability_hash`, `plan_json`, `fixed_prompt_prefix`, payloads ou resultados das
etapas. O código de erro é limitado a um identificador curto; a presença de
detalhes técnicos gera somente uma mensagem fixa, sem devolver o texto bruto.
Campos sensíveis nunca integram a resposta administrativa nem o HTML.

O preflight v3 compara também todas as colunas consumidas pelo repositório. Nos
jobs isso inclui erros e conclusão; nas etapas inclui ordem com `CHECK >= 0`,
erros, início e conclusão, além de estado, tentativas, leases, JSONs e tokens. Um
objeto homônimo incompleto não é aceito como canônico. O índice parcial ativo é
verificado por nome, unicidade, coluna e predicado exato.

## Consumo administrativo dos contratos v1

O `admin-app/Astrólogo` reidrata quatro contratos produzidos e persistidos pelo
`astrologo-app`; o admin nunca recalcula posições, aspectos, casas ou linhas:

| Resultado administrativo      | `artifact_type`        | `schema_id`                          | Versão  |
| ----------------------------- | ---------------------- | ------------------------------------ | ------- |
| Análise natal                 | `natal_chart_analysis` | `urn:astrologo:natal-chart-analysis` | `1.0.0` |
| Trânsitos                     | `transit_result`       | `urn:astrologo:transit-run`          | `1.0.0` |
| Sinastria                     | `synastry_result`      | `urn:astrologo:synastry-run`         | `1.0.0` |
| Mapa planetário de localidade | `locality_map`         | `urn:astrologo:locality-map`         | `1.0.0` |

A análise natal é elegível somente como artefato `ready` associado ao mapa
consultado. Para trânsitos, sinastria e localidade, a leitura é fail-closed e
exige simultaneamente:

- run e artefato em estado `ready`;
- FK específica do artefato apontando para o run que o produziu;
- `result_artifact_id` do run apontando de volta para o mesmo artefato;
- coerência entre o mapa do artefato e o mapa ou os sujeitos do run;
- tipo, `schema_id`, `schema_version` e estrutura integral do payload esperados.

Na sinastria, a consulta pode partir do mapa primário ou secundário, mas o
artefato continua pertencendo ao mapa primário e os nomes dos dois sujeitos são
obtidos dos respectivos registros canônicos. Payload legado, ausente, malformado
ou incoerente é identificado como indisponível ou inválido; não é promovido nem
silenciosamente reinterpretado como contrato atual.

Os quatro resultados seguem para a mesma cadeia de apresentação: detalhe do
Arquivo Akáshico, relatório textual/HTML e e-mail. A camada visível usa pt-BR e
`America/Sao_Paulo`. No mapa de localidade, a geometria Natural Earth 1:110m é
empacotada e renderizada localmente; o módulo gráfico é carregado sob demanda,
sem tiles ou transmissão de dados natais a um provedor cartográfico.

## Compatibilidade com a análise extensa reentrante

Os jobs da migration 018 são infraestrutura transitória e durável de execução;
não substituem `astrologo_ai_analyses`, que continua sendo o envelope canônico
dos resultados especializados. Fragmentos, reduções e leases permanecem nas
tabelas de job até a expiração. Somente após cobertura integral e síntese válida
o produtor grava o resultado final sanitizado no contrato já consumido pelo
Arquivo Akáshico.

Uma falha intermediária conserva o progresso retomável e não substitui uma
análise completa anterior. O admin continua exibindo apenas resultados finais
canônicos, nunca payloads de prompt nem notas parciais. A autorização pública por
capability e proprietário pertence aos endpoints do `astrologo-app`; a fronteira
administrativa não aceita esse bearer como substituto do Cloudflare Access.

## Verificação

```sql
PRAGMA table_info(astrologo_mapas);
PRAGMA index_list(astrologo_mapas);
PRAGMA table_info(admin_module_configs);
PRAGMA foreign_key_list(astrologo_synastry_runs);
PRAGMA table_info(astrologo_ai_analysis_jobs);
PRAGMA table_info(astrologo_ai_analysis_steps);
PRAGMA foreign_key_list(astrologo_ai_analysis_jobs);
PRAGMA foreign_key_list(astrologo_ai_analysis_steps);
PRAGMA index_list(astrologo_ai_analysis_jobs);
PRAGMA index_list(astrologo_ai_analysis_steps);
PRAGMA foreign_key_check;

SELECT name, sql
FROM sqlite_master
WHERE type = 'index'
  AND name = 'idx_astrologo_ai_analysis_jobs_active_mapa';

SELECT module_key,
       json_type(config_json, '$.modeloSintese') AS modelo_sintese_type
FROM admin_module_configs
WHERE module_key = 'astrologo-config';

SELECT route, enabled, max_requests, window_minutes
FROM astrologo_rate_limit_policies
WHERE route IN ('astrologo/auth-read', 'astrologo/analisar-etapa')
ORDER BY route;
```

Na interface, rótulos permanecem em pt-BR e horários são exibidos em
`America/Sao_Paulo`. Nomes de tabelas, colunas, estados e contratos internos
permanecem em en_US.
