# Maestro AI Parity Plan D — Release Link Audit e SSRF Profundo

> Blueprint de execução; fonte canônica: `link_audit.rs` (integral), `session_orchestration.rs` (gate 2222-2263, macro 675-719, call sites 803/874/1574/1769, ready/not-ready-unchanged 2003-2016, blocker bibliográfico 2112-2220).

**Goal:** O audit de links sai dos turnos e passa a ser o estágio 2-3 do release audit canônico na finalização (bibliográfico → capacity → HTTP), com regras HTTP canônicas (15 s, 5 hops, HEAD→GET, 3xx-ok, 429=falha, warn fora de 100-599) e SSRF profundo (faixas completas RFC + DoH pre-flight).

## Semântica canônica adotada

1. **Onde audita** (canônico): o audit completo (capacity + HTTP) roda SOMENTE em tentativas de finalização: (a) convergência; (b) turno **READY-unchanged** (é tentativa de release → falha vira ReadyRejected); (c) turno **NOT_READY-unchanged** (falha vira a razão do contract error → retry corretivo). Turno revisado: SÓ gate bibliográfico (inalterado). **Os audits web de draft/resume/revisão são REMOVIDOS** (o desktop não os tem; um link quebrado deixa de matar a sessão no meio e passa a pausar a finalização). `blocked_link_audit` vira status legado (permanece em RESUMABLE_STATUSES e no statusLabel).
2. **Gate unificado 3 estágios** (`final_release_audit_failure`, curto-circuito): 1) bibliográfico (`containsFinalReleaseBlocker`); 2) capacity: únicos > 30 → gate `link_audit_capacity`; 3) HTTP: `failed > 0` → gate `link_audit`. Todos pausam como `paused_final_audit` (análogo de PAUSED_FINAL_REFERENCE_AUDIT), com contexto estruturado (gate, urls_found, checked, ok, failed, rows) no evento e no error.
3. **Extração canônica**: regex `https?://[^\s<>"')\]]+` (stop-set SEM `}`), trim de cauda só `.,;:`, dedup da string limpa, scan cap 80 matches, candidates cap 30, **ordem lexicográfica** (BTreeSet). Candidates bloqueados/inválidos NÃO são descartados: viram rows `blocked` (contam em failed). IPv6 bracketed corta no `]` → "URL invalida" → row blocked (mesmo desfecho de pausa do desktop).
4. **Capacity**: `count_unique_url_candidates` conta TODOS os únicos (incl. bloqueados), para em 31; `> 30` → pausa antes de qualquer fetch.
5. **HTTP canônico**: timeout 15 s por request; User-Agent `Maestro Editorial AI/{APP_VERSION}`; redirects seguidos até 5 hops re-validando CADA hop (léxico + DoH); HEAD primeiro, GET fallback em 405/403 OU erro de transporte do HEAD; SEM retry. Tones: 2xx/3xx=`ok`; 4xx (incl. **429**)/5xx=`error`; erro de transporte no GET=`error`; SSRF/inválida=`blocked`; 1xx e fora de 100-599 (ex.: 999)=`warn` (nem ok nem failed). `failed = error+blocked`; `failed > 0` pausa. Rows sanitizadas (url 240 / status 160 / invalidity 180 / tone 16).
6. **SSRF profundo**: v4 += 100.64.0.0/10 (CGNAT), 192.0.0.0/24, 192.0.2.0/24, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24, ≥224.0.0.0 (multicast+reservado+broadcast); v6 += ff00::/8 (multicast), 2001:db8::/32 (documentação); mantidos loopback/unspecified/RFC1918/link-local/ULA/v4-mapped. Hostnames: += `localhost.localdomain`. **DoH pre-flight**: resolver A+AAAA via `https://cloudflare-dns.com/dns-query` (application/dns-json); QUALQUER IP resolvido em faixa bloqueada → `blocked`; erro/timeout de DoH → não bloqueia (fail-open, paridade com o pre-flight canônico). Aplicado ao alvo inicial e a cada hop de redirect.

## Desvios web documentados

- **Sem resolver connection-bound**: Workers `fetch` não expõe/pina IPs resolvidos; a 2ª camada anti-rebinding do desktop (`PublicOnlyResolver`) é arquiteturalmente impossível — a defesa web é léxica + DoH pre-flight por hop (janela de rebinding residual documentada).
- **Probing paralelo** (`Promise.all`) em vez de sequencial: 30 URLs × 15 s sequencial estoura o budget do Worker; rows apresentadas em ordem lexicográfica (paridade de output).
- **Cache por execução** do release audit keyed no texto de custódia: o desktop re-roda o audit HTTP a cada turno unchanged; em Workers isso multiplicaria subrequests além do limite da plataforma — dentro de UMA execução, a mesma custódia unchanged reusa o resultado.
- **Web bloqueia MAIS hostnames** que o desktop (hardening consciente mantido): `*.internal` e bare single-label — o desktop confia no resolver do sistema para esses; em Workers são sempre internos.
- Shape das rows mantém `{url, ok, status?, error?}` do front + campo novo `tone`; `ok = tone==='ok'`.

## Tasks (TDD, red-first cada uma)

1. Extração canônica: `extractUrlCandidates` ({url, rejection}) + `countUniqueUrlCandidates` + matriz (stop-set, trim, dedup, sorted, caps 80/30, bracketed-IPv6 → inválida).
2. SSRF: faixas novas v4/v6 + `localhost.localdomain` + matriz; DoH pre-flight `hostResolvesToBlockedIp` (mock dns-json: A privado bloqueia; AAAA ULA bloqueia; erro DoH não bloqueia; sem fetch do alvo quando bloqueado).
3. `probePublicUrl` + `runLinkAudit`: tones (2xx/3xx ok; 404/429/500 error; 999 warn; GET transport error), HEAD→GET (405/403/Err), 5 hops re-validados, UA, 15 s, agregado ok/failed/warn + rows sorted.
4. `finalReleaseAuditFailure` 3 estágios curto-circuito + contexto estruturado.
5. Wiring: remover audits de draft/resume/revisão (e `currentLinkAudit`); gate completo na convergência; READY-unchanged → ReadyRejected via audit completo; NOT_READY-unchanged → contract error via audit; cache por execução.
6. Testes runner reescritos: 404 na custódia → ReadyRejected loop → `paused_cycle_limit` (nunca blocked_link_audit); convergência limpa com fetch 200; capacity 31 URLs → paused_final_audit gate capacity; 999 não pausa; internal-host → row blocked sem fetch.
7. Gates + bump v02.09.00 + CHANGELOG + cross-review (draft auto-contido; evidência front-loaded) + ship.
