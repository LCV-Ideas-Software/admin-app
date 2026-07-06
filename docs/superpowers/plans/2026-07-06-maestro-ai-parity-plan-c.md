# Maestro AI Parity Plan C — Lifecycle Retomável e Resiliência (executado)

> Blueprint de execução; fonte canônica: `provider_retry.rs` (integral), `session_orchestration.rs` (draft loop 436-591, turno operacional 1215-1310, escalada 1233-1276), `session_resume.rs:43-70`, `editorial_inputs.rs:205-215`, `session_commands.rs:210-347`, `session_artifacts.rs:47-159`, `session_persistence.rs:99-143`.

**Goal:** Sessões web deixam de morrer em falhas transitórias e limites: retry canônico de provider, falhas operacionais pulam o turno com escalada 3-strike, draft com fallback serial, custo/tempo pausam retomável, e a família `paused_*` ganha retomada real via novo endpoint.

## Semântica canônica adotada (com adaptações web documentadas)

1. **Retry de provider** (provider_retry.rs): máx 2 tentativas; rede → 1 retry com backoff 1500 ms; **somente HTTP 429 re-tenta** com espera = Retry-After (int segundos OU data RFC2822 → delta ≥ 0; default 30 s; cap 120 s); demais statuses seguem para classificação normal. Esperas canceláveis — web: sleep fatiado (5 s) checando cancel cooperativo no D1; `Cancelled` → runner retorna silencioso (análogo STOPPED_BY_USER).
2. **Falha operacional de turno** (1215-1310): erro de provider/rede/timeout NÃO mata a sessão — evento, `consecutiveOutages += 1`, `roundTurnIndex += 1`, wrap → `paused_round_incomplete`, `continue`; **stableApprovals é PRESERVADO** (só violações limpam); turno limpo zera o contador; `>= 3` → `paused_reviewer_outage` (threshold canônico). Incrementos também nas exaustões de retry corretivo (paridade 1353/1487/1625).
3. **Draft fallback** (436-591): ordem = initialAgent + demais ativos; por agente: check de tempo → guard de custo → chamada; `erro/vazio` → próximo agente (evento `session.draft.retry` análogo); custo → `paused_cost_limit`; tempo → `paused_time_limit`; todos falham → `paused_draft_unavailable`.
4. **Tempo** (session_resume.rs/editorial_inputs.rs): anchor = `created_at` no run inicial, `now` na retomada; exaustão = `remaining < 2 s`, checada antes do draft e de cada turno; timeout por chamada = `min(120 s, remaining)` (acoplamento deadline→abort da chamada).
5. **Custo por execução** (cost_scope canônico): o cap vale por execução do runner — web: `costBaseline = observed` no início do run; guards comparam `(observed − baseline) + projetado > cap`. Estouro → `paused_cost_limit` (era `blocked_cost` terminal).
6. **Retomada** (session_artifacts.rs:47-159 + session_commands.rs): terminal = somente convergência (texto final gravado); TUDO mais é retomável. Recuperação limitada (paridade): texto/autor; **stableApprovals/validRoundAgents/outages NÃO são recuperados** (recomeçam vazios) e a contabilidade de rounds reinicia (round-position não é persistido no schema web — coerente com o escopo por execução do turn cap). Web: `POST /api/maestro-ai/sessions/:id/resume` — status ∈ RESUMABLE_STATUSES e `final_text` nulo → status `queued`, error limpo, evento `resumed`, re-dispatch `waitUntil(runSession)`. Runner detecta retomada por `current_text` não-vazio + `current_author` presente (fresh com `initial_content` tem `current_author` nulo) → pula a fase de draft, re-audita os links da custódia e ancora o tempo em `now`.
7. **Cancel abortivo**: chamadas de provider passam a correr com `AbortController`, abortadas por um poller cooperativo (5 s) que detecta status terminal/cancelado no D1 — análogo web do CancellationToken.

## Mapa de statuses (contract surface completa)

- Renomeados para retomáveis: `blocked_cost`→`paused_cost_limit`, `blocked_time`→`paused_time_limit`, `blocked_cycle_limit`→`paused_cycle_limit`, `blocked_round_incomplete`→`paused_round_incomplete`, `blocked_final_audit`→`paused_final_audit`, `blocked_self_review`→`paused_self_review`.
- Novos: `paused_reviewer_outage`, `paused_draft_unavailable`.
- Retomáveis também: `blocked_cancelled` (STOPPED_BY_USER canônico é retomável), `blocked_max_cycles` (bound interino do operador), `blocked_link_audit` (retomar re-audita; timing muda no D), `error` (varrida do sweeper/falha catastrófica — retomável por decisão web: a retomada re-valida tudo).
- Terminal: `converged` apenas.
- Superfície varrida: statusLabel + botão Retomar no frontend; sweeper inalterado (só queued/running); cancel handler inalterado; RESUMABLE_STATUSES exportado para teste.

## Desvios web documentados

- Resume não recebe config nova (a UI não tem formulário de retomada): usa a config salva na row — o princípio canônico "request é fonte de verdade" fica para quando a UI de retomada existir (Plano F/UI).
- Retry 429: espera fatiada com check cooperativo (não há CancellationToken em Workers).
- Draft fallback não distingue `STOPPED_BY_USER` no meio do loop (o cancel cooperativo intercepta entre agentes).
- Gemini (SDK sem Response/AbortSignal): mantém timeout acoplado ao deadline, mas sem retry 429 e sem abort in-flight (os checks cooperativos em volta da chamada cobrem o cancel).
- O redator de fechamento da rotação permanece o `initial_agent` configurado mesmo quando o draft veio de um agente de fallback (paridade com a ordem de specs do desktop).
- A exaustão de retry corretivo alimenta a escalada de outage (paridade): a dinâmica do teste de closure gating do B3 mudou de 11 chamadas/turn-cap para 6 chamadas/`paused_reviewer_outage`.

## Tasks (TDD, red-first cada uma)

1. Puros: `parseRetryAfterHeader` (int/RFC2822/None) + `sessionTimeExhausted`/`remainingSessionMs` (<2 s; None = sem limite) + testes matriz.
2. `fetchProviderWithRetry` (429/network/backoff/cap/cancel-aware) + testes com fetch mock (429 com Retry-After int e data; rede 1 retry; 500 sem retry; cancel durante espera).
3. Custo baseline por execução + `paused_cost_limit` (draft e turno) + teste (resume não herda gasto anterior no guard).
4. Tempo: anchor fresh/resume + checks + timeout acoplado + `paused_time_limit` + testes.
5. Turno operacional: try/catch por turno, outage counter/reset, escalada `paused_reviewer_outage`, wrap `paused_round_incomplete`, stableApprovals preservado + testes (falha 1x → recupera; 3x consecutivas → pausa; aprovações sobrevivem à falha).
6. Draft fallback serial + `paused_draft_unavailable` + testes (initial falha → segundo assume; todos falham → pausa; teste antigo de draft vazio atualizado).
7. Resume endpoint + RESUMABLE_STATUSES + skip-draft na retomada + rota no index.ts + testes (retomada de paused_cost_limit conclui; converged retorna 409; retomada não recupera aprovações).
8. Cancel abortivo (AbortController + poller) + teste (cancel durante chamada aborta em <10 s simulado com timers fake? — usar mock de fetch pendente + cancel no D1).
9. Frontend: labels + botão Retomar (status retomável) chamando o endpoint.
10. Gates + bump v02.08.00 + CHANGELOG + cross-review (draft auto-contido) + ship.
