# Maestro AI Web ↔ maestro-app Parity Roadmap

**Decisão do operador (2026-07-05):** o maestro-app (Tauri/Rust) é a fonte de referência canônica; o módulo Maestro AI do admin-app (Worker/TS) é um port à web e deve espelhá-lo. Onde seguir o desktop literalmente for impossível na plataforma Workers ou danoso ao produto web, a exceção é sinalizada e depende de confirmação do operador.

**Base:** auditoria de paridade de 2026-07-05 (workflow `wf_b401bd60-9d2`, 31 agentes) — 28 divergências comportamentais confirmadas adversarialmente entre `admin-app/admin-motor/src/handlers/routes/maestro-ai/sessions.ts` e `maestro-app/src-tauri/src/*`; nenhuma das 12 dimensões livre de divergência. As 4 diferenças inerentes à plataforma (D1 vs arquivos locais, sweeper cron vs reparo on-exit, roteamento cli/api/hybrid, caps de custo isentos em CLI) **não** são escopo deste programa.

Cada plano é um ship independente: TDD red-first, gates completos (eslint + biome + prettier + markdownlint central + typecheck + vitest), cross-review ALL READY, bump de versão + CHANGELOG.

## Plano A — Contrato de I/O e normalização (este ship)

Divergências cobertas: parsing do `MAESTRO_STATUS` (linha exata, qualquer posição, sem strip de `<think>`), extração de tag duplicada (último par completo), normalização de mudança substantiva (`normalized_editorial_text`), tabela de aliases de agentes.
Arquivo: `2026-07-05-maestro-ai-parity-plan-a.md`.

## Plano B — Semântica de turno e convergência

- Convergência cumulativa por aprovações estáveis (`current_version_has_all_independent_approvals`, session_orchestration.rs:2595): set de aprovadores limpo em qualquer mudança substantiva/violação; finaliza quando todos os agentes ativos não-autores aprovaram a mesma versão.
- Inversão dos bans de outcome: aceitar READY+`<maestro_final_text>` como turno de revisão normal; tratar NOT_READY sem mudança como violação de contrato (acoplado ao retry corretivo abaixo).
- Retry corretivo: violação de contrato → reclassificar artefato como CONTRACT_VIOLATION → até 3 tentativas do mesmo reviewer com seção "Mandatory Corrective Retry" → turno pulado como falha operacional (não terminal).
- Anti-empobrecimento por tier (`editorial_quality_tier`/`quality_guard_blocks_revision`, session_orchestration.rs:2565-2593): dispara só quando tier do reviewer < tier do autor, before ≥ 400 chars e encolhimento > 15%; consequência = rejeitar a revisão e continuar.
- Validação estrutural do relatório de revisão (tags balanceadas, campo custody `revised`/`unchanged` com consistência cruzada, anti-eco de protocolo).
- **Stopgap:** `max_cycles` (1–5) permanece como limite externo até o Plano C entregar estados pausáveis/retomáveis — desktop não tem cap de rounds, tem cap de turnos com pausa retomável.

## Plano C — Lifecycle e resiliência

- Família de estados PAUSED_*/STOPPED/LIMIT retomáveis + rotina de resume no admin-motor; apenas convergência unânime é terminal.
- Retry de provider (2 tentativas, backoff 1500 ms, 429 honra Retry-After com default 30 s / cap 120 s, cancel-aware).
- 3 falhas operacionais consecutivas → pausa (não morte da sessão).
- Draft com fallback serial pelos agentes ativos restantes antes de pausar.
- Estouro de custo no draft → status dedicado retomável (equivalente a COST_LIMIT_REACHED), não `error` genérico.
- Cancelamento aborta chamada em voo via AbortController e resulta em estado retomável.
- Limite de tempo: checado antes do draft e de cada turno (remaining < 2 s), timeout por chamada acoplado ao tempo restante; override por sessão.

## Plano D — Link audit, gate bibliográfico e SSRF

- Auditoria HTTP só na finalização e em turnos READY-unchanged, atrás do gate em 3 estágios (bibliográfico → capacidade >30 URLs únicos hard-fail → HTTP); 3xx = ok; timeout 15 s; 5 hops; fallback HEAD→GET; sem retry por link.
- Portar o gate bibliográfico (inexistente no web).
- SSRF: faixas adicionais (100.64/10, 192.0.0/24, 192.0.2/24, 198.18/15, 198.51.100/24, 203.0.113/24, ≥224.0.0.0, ff00::/8, 2001:db8::/32) + pré-verificação de DNS via DoH. **Exceção de plataforma:** resolver acoplado à conexão (anti-rebinding fail-closed) não existe em Workers; aproximação via DoH pré-flight, resíduo documentado.
- Extração de URL alinhada (strip `.,;:` sem `!?`, 80 matches / ≤30 únicos).

## Plano E — Custo, tempo e defaults financeiros

- **Exceção proposta (confirmar):** manter o termo `request_usd_per_1k` no web (o desktop não o tem, mas removê-lo perde a contabilidade real do Perplexity).
- **Exceção proposta (confirmar):** manter DEFAULT_RATES semeadas no web (desktop exige configuração explícita).
- Intake com <2 agentes: desktop aceita e pausa após o draft; web rejeita pré-start sem custo. **Exceção proposta (confirmar):** manter a rejeição pré-start do web.

## Plano F — Superfície de providers e prompts

- Prompt de revisão alimentado com relatórios anteriores (cap 12.000 chars cada) em vez dos últimos 12 eventos; adicionar Evidence and Bibliographic Integrity Gate e regras de citação §-ID.
- Modelos default alinhados aos hints do desktop + resolução viva via /v1/models onde aplicável.
- Sequenciamento: portar `select_serial_reviewer_index` (incl. caminho de redraw).
- **Exceção proposta (confirmar):** manter DEFAULT_PROTOCOL semeado no web (desktop exige importação de protocolo ≥100 chars).
