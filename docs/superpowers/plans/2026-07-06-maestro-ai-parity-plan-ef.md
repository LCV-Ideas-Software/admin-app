# Maestro AI Parity Plans E/F — Exceções de Custo/Defaults + Prompts Restantes e Modelos

> Blueprint de execução; fonte canônica: `editorial_prompts.rs` (build_serial_revision_prompt 387-526, build_revision_history_block 327-363, is_operational_agent_result 365-384), `provider_runners.rs` (resolve_*_model 1184-1257, choose_preferred_model 1259-1269), `provider_deepseek.rs` (resolve_deepseek_model 513-550), `provider_grok.rs` (resolve_grok_model 266-306), `provider_perplexity.rs` (252-255).

## Plano E — exceções ADOTADAS (autorização standing do operador, 2026-07-06; sem mudança de código)

1. `request_usd_per_1k` mantido no web (o desktop não o tem; removê-lo perderia a contabilidade real do Perplexity).
2. `DEFAULT_RATES` semeadas mantidas no web (o desktop exige configuração explícita).
3. Rejeição pré-start com <2 agentes mantida no web (o desktop aceita e pausa após o draft; rejeitar antes evita custo de draft fadado à pausa).
4. (Do F) `DEFAULT_PROTOCOL` semeado mantido no web (o desktop exige importação de protocolo ≥100 chars).

## Plano F — semântica canônica adotada

1. **Prior-reports feed** (port de `build_revision_history_block`): a seção `## Prior Session Events` (últimos 12 eventos em JSON) é SUBSTITUÍDA por `## Prior Serial Revision Reports` — para cada turno serial anterior (ordem cronológica, SEM cap de quantidade nem cap total): header "### {name} / {role} / \`{status}\`" + linha "Artifact: \`{id}\`" + fence de código (text) com o `maestro_revision_report` do turno truncado a **12.000 chars Unicode**; turno sem report ganha o placeholder canônico "No complete maestro_revision_report block was returned by {name}. Treat this artifact as a contract failure, not as deliberative substance."; histórico vazio → "No prior revision reports are recorded for this serial cycle."; turnos operacionais (falha de provider/vazio) EXCLUÍDOS (paridade com `is_operational_agent_result`); o texto final do turno NUNCA entra (só o report). Web: lista em memória no runner (`serialReports`), alimentada em cada desfecho de turno (aceito, ReadyRejected, violação com attempted report, tier-guard) — análogo do `agents` Vec (append-only, oldest-first).
2. **Regra §-ID** (Language Contract, verbatim de editorial_prompts.rs:412): "The editorial protocol is authoritative input, not output. Read and obey it, but do not quote, summarize, restate, or reproduce protocol text in the artifact. Cite compact section IDs only, such as `§V.14` or `§11.7`."
3. **Gaps de prompt fechados** (build_serial_revision_prompt): bullets de justificação do Quality/Anti-Impoverishment Gate (442-448: exact passage + exact protocol requirement + why unsafe to preserve + "If you are unsure, preserve"); bullets do Role Contract sobre SELF_REVIEW_BLOCKED e closing redactor; flag/header `Closing redactor turn:` (o loop web já sabe quando o lead fecha via closure gating do B3 — passa `closingTurn` ao prompt); header `Round turn:`.
4. **Fix de drift**: grok `grok-4.20-multi-agent-0309` → `grok-4.20-multi-agent` (o sufixo -0309 não existe no desktop).
5. **Live model resolution** (port de resolve_*_model + choose_preferred_model): por chamada, GET no endpoint /models do provider; escolhe o PRIMEIRO candidato canônico presente na lista viva; senão o primeiro modelo listado; senão o fallback canônico. Candidatos/fallbacks verbatim: codex `gpt-5.5, gpt-5.4, gpt-5.3, gpt-5.2, gpt-5, gpt-4.1` / fb `gpt-5.4`; claude `claude-opus-4-7, claude-opus-4-1-20250805, claude-opus-4-20250514, claude-sonnet-4-20250514, claude-3-7-sonnet-latest` / fb `claude-opus-4-1-20250805`; gemini `gemini-3.1-pro-preview, gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-1.5-pro` / fb `gemini-2.5-pro`; deepseek `deepseek-v4-pro, deepseek-reasoner, deepseek-chat, deepseek-v4-flash` / fb `deepseek-reasoner`; grok `grok-4.20-multi-agent, grok-4-latest, grok-4.3, grok-4.20-reasoning, grok-4.20, grok-4-1-fast, grok-4` / fb `grok-4.20-multi-agent`; perplexity SEM live resolution (canônico) → configured/default direto. Precedência web: **modelo configurado pelo operador (models[agent]) → live candidates → primeiro da lista viva → DEFAULT_MODELS[agent]** (o configurado equivale ao env-override canônico do DeepSeek/Grok, estendido a todos por decisão web já vigente). Falha do GET /models → fallback silencioso ao DEFAULT_MODELS (paridade com o desktop, que cai no fallback constant).

## Desvios web documentados

- `Artifact:` referencia o ID do artifact D1 (o desktop usa o path do arquivo; Workers não têm filesystem).
- Cache por execução do resultado de /models por provider (o desktop resolve a cada chamada sem cache; em Workers cada GET conta no budget de subrequests — dentro de UMA execução a lista viva não muda de forma relevante).
- Sem `evidence_block` no final do prompt (o web não tem o subsistema de evidence imports do operador; fica para quando a UI existir).
- DEFAULT_MODELS do web permanece a tabela de defaults de settings (inclui `gpt-5.5`/`claude-opus-4-7` = topo dos candidates canônicos); o fallback final da live resolution usa os fallbacks canônicos por provider.
- Violações de contrato entram no feed com o attempted report (o desktop embute o que o artifact tiver; o web guarda o attempted_report no artifact de violação).

## Tasks (TDD, red-first cada uma)

1. `buildRevisionHistoryBlock(serialReports)` puro + matriz (formato/cap 12k chars Unicode/placeholder/vazio/ordem/exclusão operacional) e integração no buildRevisionPrompt (seção renomeada) + `serialReports` no runner.
2. Prompt: bullet §-ID + quality justification bullets + SELF_REVIEW_BLOCKED/closing-redactor bullets + headers `Round turn:`/`Closing redactor turn:` (+ passar closingTurn do loop) + testes de conteúdo.
3. Modelos: fix grok drift; `choosePreferredModel` + `resolveProviderModel` (candidates/fallbacks canônicos; cache por execução; perplexity sem live) + wiring no callProvider (configured → live → fallback) + testes (candidate presente; ausente → primeiro da lista; GET falha → fallback; configured vence; perplexity nunca chama /models).
4. Gates + bump v02.10.00 + CHANGELOG (E documentado como exceções adotadas) + cross-review + ship.
