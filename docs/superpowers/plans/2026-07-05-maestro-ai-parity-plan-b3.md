# Maestro AI Parity Plan B3 — Convergência Cumulativa, Seleção com Redraw e Turn Cap (executado)

> Registro do ship; fonte canônica: `maestro-app/src-tauri/src/session_orchestration.rs` (loop serial 619-1782; funções 2595-2671).

**Goal:** Substituir a convergência por recontagem de ciclos do web pela contabilidade canônica do desktop: aprovações estáveis cumulativas com finalização mid-round, seleção de reviewer com redraw e closure gating do redator de fechamento, turn cap global e contabilidade de round.

## Entregue

- **Funções puras** (sessions.ts, portas de 2595-2671, com testes unitários):
  - `hasAllIndependentApprovals(order, autor, stableApprovals)` — converge quando TODO agente não-autor da rotação está no set (sem threshold numérico).
  - `closingTurnHasRequiredPriorReviews(order, lead, validRoundAgents)` — o redator de fechamento (draft lead) só é escalável quando todos os outros peers completaram turno válido na rodada.
  - `selectSerialReviewerIndex(...)` — prefere o slot nominal elegível (≠autor, ∉stable, lead só com closure ready); senão redraw `seed % pending.length`; pending vazio → null (= convergido). Seed por iteração via `crypto.getRandomValues`.
- **Loop do runSession reescrito** (sem ciclos com recontagem):
  - Topo de cada iteração: cancelamento cooperativo → **checagem de convergência (finalização mid-round)** → turn cap → guard interino de rounds → seleção (evento de redraw quando o nominal é inelegível) → guard defensivo de auto-revisão (`blocked_self_review`, análogo de PAUSED_SELF_REVIEW_BLOCKED) → time guard.
  - **Set de aprovações estáveis**: insere em READY sem mudança substantiva (turno unrevised OU revisado-cosmético); limpa em mudança substantiva (nova versão exige rotação completa), violação de contrato/lock, rejeição do tier guard e turno não-READY sem mudança. `pending vazio` na seleção também converge.
  - **validRoundAgents** (insumo do closure gating): todo turno aceito conta, EXCETO ReadyRejected; limpo a cada wrap de rodada.
  - **Turn cap** (`max(roundTurnCount*4, roundTurnCount)`, conta TODA iteração incl. retries/redraws) → `blocked_cycle_limit` (análogo de PAUSED_EDITORIAL_CYCLE_LIMIT).
  - **Exaustão de retry no fim da rodada** → `blocked_round_incomplete` (análogo de PAUSED_ROUND_INCOMPLETE); fora do fim, pula o turno e segue.
  - **Gate final bibliográfico na convergência** → `blocked_final_audit` (análogo de PAUSED_FINAL_REFERENCE_AUDIT; estágios capacity/HTTP chegam no Plano D).
  - Retry key agora `${round}:${roundTurnIndex}:${reviewer}:${currentText}` (formato canônico).
- **Frontend**: labels pt-BR para os 4 statuses novos.
- **Alerta code-scanning #63** (js/incomplete-sanitization, high): `markdownTableExcerpt` escapa `\` antes de `|` — desvio cosmético consciente restrito ao excerto informativo do manifest (o desktop escapa só o pipe; sugestão de fix upstream registrada), com teste.

## Desvios interinos documentados

- Os análogos de pausa são statuses TERMINAIS no web até o Plano C entregar resume (`blocked_cycle_limit`, `blocked_round_incomplete`, `blocked_self_review`, `blocked_final_audit`).
- O `max_cycles` do operador permanece como bound externo de rounds (o desktop não tem cap de rounds); revisão dessa superfície no Plano C/E.
- `consecutive_reviewer_outage_rounds`/escalada de outage ficam para o Plano C (dependem do caminho de falhas operacionais).

## Testes

- 3 unitários novos (matrizes de convergência, closure gating e seleção/redraw com seed determinístico).
- Integrações atualizadas à semântica canônica: bans-inversion termina `blocked_round_incomplete` (circuito incompleto após exaustão do redator de fechamento); quality-ratchet termina `blocked_cycle_limit` com 8 seleções do mesmo reviewer pendente (lead nunca elegível sem circuito válido). Convergência mid-round coberta pelos testes existentes (single-reviewer READY converge sem chamar o lead).
- Suíte completa 155/155.
