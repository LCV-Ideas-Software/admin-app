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
2. Executar o reconciliador versionado:

   ```bash
   node scripts/reconcile-astrologo-schema.mjs --remote --database bigdata_db
   ```

3. Aplicar `015_bigdata_astrologo_schema_regularization.sql` uma única vez.
4. Aplicar `016_bigdata_astrologo_advanced_charts.sql` uma única vez.
5. Verificar o schema antes de publicar qualquer produtor.

O reconciliador v1.0.0 consulta `PRAGMA table_info(astrologo_mapas)`. Ele adiciona a
coluna `email` somente quando ausente, confirma o resultado e falha fechado se a
tabela base não existir. A migration 015 adiciona `data_analise`, que estava
ausente no schema remoto verificado antes desta mudança.

O workflow de deploy também executa o reconciliador antes do Admin Motor. Isso
protege bancos novos e não repete o `ALTER TABLE` em bancos já regularizados.
As migrations 015 e 016 continuam sendo operações explícitas e únicas; o
workflow não as reaplica automaticamente.

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

## Consumo administrativo dos contratos v1

O `admin-app/Astrólogo` reidrata quatro contratos produzidos e persistidos pelo
`astrologo-app`; o admin nunca recalcula posições, aspectos, casas ou linhas:

| Resultado administrativo | `artifact_type` | `schema_id` | Versão |
| --- | --- | --- | --- |
| Análise natal | `natal_chart_analysis` | `urn:astrologo:natal-chart-analysis` | `1.0.0` |
| Trânsitos | `transit_result` | `urn:astrologo:transit-run` | `1.0.0` |
| Sinastria | `synastry_result` | `urn:astrologo:synastry-run` | `1.0.0` |
| Mapa planetário de localidade | `locality_map` | `urn:astrologo:locality-map` | `1.0.0` |

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

## Verificação

```sql
PRAGMA table_info(astrologo_mapas);
PRAGMA table_info(admin_module_configs);
PRAGMA foreign_key_list(astrologo_synastry_runs);
PRAGMA foreign_key_check;

SELECT module_key,
       json_type(config_json, '$.modeloSintese') AS modelo_sintese_type
FROM admin_module_configs
WHERE module_key = 'astrologo-config';
```

Na interface, rótulos permanecem em pt-BR e horários são exibidos em
`America/Sao_Paulo`. Nomes de tabelas, colunas, estados e contratos internos
permanecem em en_US.
