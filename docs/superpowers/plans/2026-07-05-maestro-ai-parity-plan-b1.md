# Maestro AI Parity Plan B1 — Contrato de Turno, Retry Corretivo e Tier Guard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portar para o módulo Maestro AI web a validação estrutural de saída de turno (`validate_serial_turn_output`), o ciclo de retry corretivo por CONTRACT_VIOLATION e o anti-empobrecimento por tier do maestro-app, substituindo `validateRevisionGuard`.

**Architecture:** Funções puras novas em `sessions.ts` (porta byte-exata dos helpers Rust) + integração no loop `runSession` mantendo o modelo de ciclos atual (convergência cumulativa é Plano B3; content lock é B2; auditoria HTTP na finalização é Plano D — aqui o gate de release usa só o bloqueador bibliográfico, subconjunto fiel).

**Tech Stack:** Cloudflare Worker (TypeScript), Vitest. Fonte canônica: `maestro-app/src-tauri/src/session_orchestration.rs` (linhas citadas por task).

## Global Constraints

- `MAX_CORRECTIVE_CONTRACT_RETRIES_PER_TURN = 3` (session_orchestration.rs:78).
- Threshold de escalada de outage: 3 rounds consecutivos (`ALL_ERROR_ESCALATION_THRESHOLD`, :370).
- Comparações de campo `eq_ignore_ascii_case` = comparação case-insensitive ASCII (portar como comparação de asciiLowercase de ambos os lados, nunca `toLowerCase()` Unicode).
- Sem statuses novos no B1 (decisão de implementação): exaustão de retry corretivo pula o turno sem voto; a contabilidade de round do desktop (`PAUSED_ROUND_INCOMPLETE`, escalada de outage) chega com o B3/C junto dos estados retomáveis.
- Semântica desktop decisiva: READY + `<maestro_final_text>` substantivo é turno de revisão NORMAL (avança a versão, sessions_orchestration.rs:1717-1721); READY-unchanged com bloqueador bibliográfico no texto corrente vira NOT_READY sem retry (ReadyRejected, :1418-1445, :1998-2007); NOT_READY-unchanged sem texto corretivo é CONTRACT_VIOLATION com retry (:2009-2029).
- TDD red-first; gates completos; cross-review ALL READY; bump minor + CHANGELOG.

---

### Task 1: micro-parser de campos do relatório (porta byte-exata)

**Files:**
- Modify: `admin-motor/src/handlers/routes/maestro-ai/sessions.ts` (novas funções puras após `isSubstantiveEditorialChange`)
- Test: `admin-motor/src/handlers/routes/maestro-ai/sessions.test.ts`

**Interfaces (Produces):**
- `reportDeclaresCustodyValue(report: string, value: string): boolean` (Rust :2291-2300 — JSON estrito primeiro via try JSON.parse objeto + campo `custody` string `trim().eq_ignore_ascii_case`; senão scan escalar)
- `reportDeclaresNonemptyChanges(report: string): boolean` (:2302-2304 → array field `changes`)
- Helpers privados: `charAtOffset` (:2384-2389), `advancePastUnclosedQuoteLine` (:2391-2395), `isFieldKeyStart` (:2397-2413), `isStructureStart` (:2415-2424), `parseQuotedToken` (:2426-2445, com escape `\\`), `isBareFieldBoundary` (:2447-2460), `isFieldNameCharacter` (:2462-2464 — alnum ASCII ou `_`), `arrayFieldHasContent` (:2466-2476 — `:` então `[` então não-`]`), `scalarFieldMatchesValue` (:2478-2495 — valor entre aspas duplas/simples/crase via parseQuotedToken OU token bare de `[A-Za-z0-9_-]`), `isScalarValueCharacter` (:2497-2499), `reportDeclaresScalarFieldValue` (:2349-2382), `reportDeclaresNonemptyArrayField` (:2310-2347).
- Nota de porta: offsets Rust são bytes UTF-8; em TS usar offsets UTF-16 — equivalente porque todos os delimitadores testados são ASCII e `charAtOffset` avança por code point (usar `codePointAt`/`String.fromCodePoint` com avanço de `String.fromCodePoint(cp).length`).

**Steps:** teste vermelho (matriz: JSON estrito `{"custody":"revised"}`, scalar `custody: revised`, quoted key `"custody": 'Revised'`, boundary falso `xcustody:`, campo em linha própria, campo após `{`, changes `[]` vazio vs `["x"]`, aspas não fechadas) → implementar → verde.

### Task 2: bloqueadores bibliográficos + echo + tags balanceadas

**Interfaces (Produces):**
- `asciiLowercase(text: string): string` (espelho de `asciiUppercase`, só A-Z)
- `containsPromptOrProtocolEcho(stdout: string): boolean` (:2501-2514 — asciiLowercase(stdout) contém qualquer um dos 7 markers verbatim)
- `requireBalancedTag(stdout: string, tag: string): string | null` (:2265-2277 — retorna mensagem de erro `missing {tag} block` / `incomplete {tag} block` ou null; 0/0 = missing; open===close = ok)
- `requireBalancedOptionalTag(stdout: string, tag: string): string | null` (:2279-2289 — 0/0 ok; open!==close = `incomplete {tag} block`)
- `asciiFoldedAlnum(ch: string): string | null` (:2209-2220 — a-z/0-9 identidade; áàãâä→a; éèêë→e; íìîï→i; óòõôö→o; úùûü→u; ç→c; resto null)
- `compactAsciiSignature(value: string): string` (:2139-2145 — `value.toLowerCase()` Unicode AQUI é o próprio Rust `to_lowercase()` — manter toLowerCase(), depois filter asciiFoldedAlnum)
- `asciiFoldedTokens(value: string): string[]` (:2193-2207)
- `isBibliographicLacunaMarker(raw: string, compact: string): boolean` (:2147-2169 — compact ∈ {sd,nd,sl,sn,slsn,sineloco,sinenomine,sinedata} ou contém sinedata/sineloco/sinenomine; ou pares de tokens (s,d)/(n,d)/(s,l)/(s,n); ou marcador de data incerta)
- `containsUncertainDateMarker(raw: string, tokens: string[]): boolean` (:2171-2191 — exige dígito ASCII; `?` ou `--`; ou janela de 4 tokens `entre <digits> e <digits>`)
- `containsFinalReleaseBlocker(text: string): boolean` (:2112-2137 — compact do texto todo contém `evidenciapendente`/`edicaoconsultadanaoidentificada`; ou varredura de trechos `[...]` com isBibliographicLacunaMarker/markers)
- `validateFinalReleaseCandidate(text: string): string | null` (:1990-1996 — mensagem exata `final candidate failed bibliographic integrity gate: unresolved evidence marker or bibliographic lacuna found`)

**Steps:** teste vermelho (`[EVIDENCIA_PENDENTE]`, `[s.d.]`, `[S. l.]`, `[entre 1990 e 1995]`, `[1990?]`, `[sine data]`, negativo `[2001]`, `[Fonte: IBGE 2020]`; echo com `## Required Output Contract` case-insensitive; tags duplicadas balanceadas ok, incompletas erro) → implementar → verde.

### Task 3: validateSerialTurnOutput

**Interfaces (Produces):** `validateSerialTurnOutput(rawText: string, status: string, report: string | null, finalText: string | null): string | null` retornando a PRIMEIRA mensagem de erro na ordem exata do Rust (:1926-1978):
1. status ∉ {READY, NOT_READY} → `invalid serial status: {status}`
2. echo → `output appears to reproduce prompt/protocol scaffolding`
3. requireBalancedTag(raw, 'maestro_revision_report')
4. requireBalancedOptionalTag(raw, 'maestro_final_text')
5. report ausente → `missing complete maestro_revision_report block`; vazio → `empty maestro_revision_report block`
6. custody revised E unchanged → `ambiguous custody declaration in maestro_revision_report`
7. finalText presente: vazio → `empty maestro_final_text block`; sem custody revised → `maestro_final_text requires custody revised in the report`; validateFinalReleaseCandidate(finalText)
8. finalText ausente + custody revised → `revised custody requires a complete maestro_final_text block`
9. finalText ausente + sem custody unchanged → `{status} without maestro_final_text must explicitly declare custody unchanged`
10. finalText ausente + custody unchanged + changes não-vazio → `correctable changes require custody revised and a complete maestro_final_text block`

### Task 4: integração no runSession — retry corretivo + tier guard + ReadyRejected

**Modifica o corpo do turno de revisão em `runSession`:**
- Constantes: `MAX_CORRECTIVE_CONTRACT_RETRIES_PER_TURN = 3`; retry key = `` `${cycle}:${turnIndex}:${reviewer}:${currentText}` `` (Map<string, number>; Rust :2103-2110).
- Wrapper `while` no turno: em CONTRACT_VIOLATION (validateSerialTurnOutput erro), gravar artefato blocked com nota `Reclassificado para CONTRACT_VIOLATION: {reason}` (Rust :2534-2538), incrementar retry; se count ≤ 3 → repetir o MESMO reviewer com o prompt acrescido da seção exata (Rust :1061-1067):

```text
## Mandatory Corrective Retry

This is corrective retry {n}/{max} for this same reviewer turn.
Your previous answer failed the required output contract or identified a blocker without revising the article.
You MUST resolve every correctable blocker in this turn by producing `custody: "revised"` and a complete `<maestro_final_text>`.
Unresolved evidence markers or bibliographic lacunae in the current text are correctable defects: if supplied evidence does not verify them, remove or rewrite the unsupported claim/reference in the article and explain the quarantine in the report. Do not preserve `[EVIDENCIA_PENDENTE]`, bracketed lacunae, or unverifiable reference placeholders in `<maestro_final_text>`.
Only request operator evidence for a decision that cannot be made by deleting, narrowing, or quarantining the unsupported claim without harming the article.
```

- Exaustão (count > 3): pular o turno sem voto (continue no for de reviewers); a convergência do ciclo falha e a sessão segue até `blocked_max_cycles` se não convergir — a contabilidade integral de round/outage do desktop chega com B3/C.
- Turno unrevised (sem finalText): (a) READY + `containsFinalReleaseBlocker(currentText)` → ReadyRejected: status vira NOT_READY (sem retry, sem voto ready; artefato reclassificado com a reason do gate); (b) NOT_READY → CONTRACT_VIOLATION retry com reason exata `NOT_READY unchanged is not a valid serial-review outcome: the reviewer must either return READY unchanged when no blocker remains, or return a revised complete text that resolves the concrete blocker.` (Rust :2019) — ou, se o texto corrente tem bloqueador bibliográfico, a reason do gate (Rust :2015-2017).
- Tier guard substitui o trecho de shrink do validateRevisionGuard: portar `editorialQualityTier` (:2565-2572) e `qualityGuardBlocksRevision` (:2574-2593 — substantive && tier(reviewer) < tier(autor) && before ≥ 400 chars && after*100 < before*85); quando bloquear → rejeitar a revisão (texto/custódia inalterados), gravar evento/artefato blocked SEM reclassificação, `continue` (Rust :1677-1711).
- `validateRevisionGuard` é removido (substituído por Tasks 3+4); READY+revisado passa a ser aceito como turno normal.

### Task 5: gates + ship

- Suíte completa + typecheck + eslint + biome + prettier public + markdownlint.
- Bump `APP_VERSION` minor + CHANGELOG.
- Cross-review ALL READY; branch `feat/maestro-ai-parity-plan-b1` → PR → automerge → GHA verde.
