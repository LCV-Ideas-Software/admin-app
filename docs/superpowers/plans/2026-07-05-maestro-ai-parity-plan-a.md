# Maestro AI Parity Plan A — Contrato de I/O e Normalização

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o parsing de status, a extração de tags, a detecção de mudança substantiva e os aliases de agente do Maestro AI web espelharem byte-a-byte a semântica canônica do maestro-app.

**Architecture:** Todas as mudanças vivem em `admin-motor/src/handlers/routes/maestro-ai/sessions.ts` (funções puras já existentes são substituídas pela semântica do desktop) e seus testes em `sessions.test.ts`. Nenhuma mudança de lifecycle, retry ou convergência (Planos B/C).

**Tech Stack:** Cloudflare Worker (TypeScript), Vitest.

## Global Constraints

- Fonte canônica: `maestro-app/src-tauri/src/editorial_io.rs:283-326` (parsers), `session_orchestration.rs:2551-2572` (normalização/tiers), `session_controls.rs:76-87` (aliases).
- TDD: cada task escreve o teste antes, roda vermelho, implementa, roda verde.
- Gates antes do ship: `npm run lint`, `npx biome check .`, `npm run typecheck:admin-motor`, `npx vitest run --config vitest.admin-motor.config.ts`, markdownlint central no CHANGELOG, cross-review ALL READY.
- Bump: v02.03.01 → v02.04.00 (mudança de comportamento) + CHANGELOG.

---

### Task 1: extractStatus — linha exata, qualquer posição, sem strip de think

**Files:**
- Modify: `admin-motor/src/handlers/routes/maestro-ai/sessions.ts:851-855`
- Test: `admin-motor/src/handlers/routes/maestro-ai/sessions.test.ts`

**Interfaces:**
- Produces: `extractStatus(text: string): 'READY' | 'NOT_READY'` — varre cada linha; `line.trim().toUpperCase()` deve ser exatamente `MAESTRO_STATUS: READY` ou `MAESTRO_STATUS: NOT_READY` (um espaço após os dois-pontos); primeira linha que casar decide; ausente → `NOT_READY`. Exportar em `maestroAiTestHooks`.

- [ ] **Step 1: teste vermelho** (usa `maestroAiTestHooks.extractStatus`)

```ts
describe('Maestro AI status/tag parsing parity', () => {
  it('extractStatus matches desktop exact-line semantics', () => {
    const { extractStatus } = maestroAiTestHooks;
    expect(extractStatus('intro line\nMAESTRO_STATUS: READY\nrest')).toBe('READY');
    expect(extractStatus('maestro_status: ready')).toBe('READY');
    expect(extractStatus('MAESTRO_STATUS : READY')).toBe('NOT_READY');
    expect(extractStatus('prefix MAESTRO_STATUS: READY suffix')).toBe('NOT_READY');
    expect(extractStatus('MAESTRO_STATUS: NOT_READY\nMAESTRO_STATUS: READY')).toBe('NOT_READY');
    expect(extractStatus('no marker at all')).toBe('NOT_READY');
  });
});
```

- [ ] **Step 2: rodar e ver falhar** — `npx vitest run --config vitest.admin-motor.config.ts -t "exact-line semantics"` → FAIL (hoje: 1ª linha flexível com regex).

- [ ] **Step 3: implementação** (substitui o corpo atual em sessions.ts:851-855)

```ts
function extractStatus(text: string): 'READY' | 'NOT_READY' {
  // Desktop parity (editorial_io.rs extract_maestro_status): every line is
  // scanned; the trimmed, uppercased line must equal the marker exactly
  // (single space after the colon); the first matching line decides.
  for (const line of text.split(/\r?\n/)) {
    const normalized = line.trim().toUpperCase();
    if (normalized === 'MAESTRO_STATUS: READY') return 'READY';
    if (normalized === 'MAESTRO_STATUS: NOT_READY') return 'NOT_READY';
  }
  return 'NOT_READY';
}
```

Adicionar `extractStatus` a `maestroAiTestHooks` (sessions.ts:1380-1391).

- [ ] **Step 4: rodar verde** — mesmo comando do Step 2 → PASS.

### Task 2: extractTagged — último par completo + guard de charset

**Files:**
- Modify: `admin-motor/src/handlers/routes/maestro-ai/sessions.ts:857-860`
- Test: `admin-motor/src/handlers/routes/maestro-ai/sessions.test.ts`

**Interfaces:**
- Produces: `extractTagged(text: string, tag: string): string | null` — tag restrita a `[A-Za-z0-9_-]`; resolve o ÚLTIMO par completo `<tag>…</tag>`; conteúdo trimado; vazio → null. Exportar em `maestroAiTestHooks`.

- [ ] **Step 1: teste vermelho**

```ts
it('extractTagged resolves the LAST complete tag pair (desktop parity)', () => {
  const { extractTagged } = maestroAiTestHooks;
  expect(extractTagged('<t>first</t> and <t>second</t>', 't')).toBe('second');
  expect(extractTagged('<t>  padded  </t>', 't')).toBe('padded');
  expect(extractTagged('<t></t>', 't')).toBeNull();
  expect(extractTagged('no tags', 't')).toBeNull();
  expect(extractTagged('<t>x</t>', 'evil.*tag')).toBeNull();
});
```

- [ ] **Step 2: rodar e ver falhar** — hoje a regex resolve a PRIMEIRA ocorrência → `'first'`.

- [ ] **Step 3: implementação**

```ts
function extractTagged(text: string, tag: string): string | null {
  // Desktop parity (editorial_io.rs extract_tagged_block): resolve to the
  // LAST complete <tag>..</tag> pair so a duplicated or echoed block yields
  // the agent's final version instead of the echo.
  if (!/^[A-Za-z0-9_-]+$/.test(tag)) return null;
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const closeAt = text.lastIndexOf(close);
  if (closeAt < open.length) return null;
  const openAt = text.lastIndexOf(open, closeAt - open.length);
  if (openAt === -1) return null;
  const value = text.slice(openAt + open.length, closeAt).trim();
  return value || null;
}
```

Adicionar `extractTagged` a `maestroAiTestHooks`.

- [ ] **Step 4: rodar verde.**

### Task 3: mudança substantiva — normalização canônica

**Files:**
- Modify: `admin-motor/src/handlers/routes/maestro-ai/sessions.ts` (novas funções + call site linha 1735)
- Test: `admin-motor/src/handlers/routes/maestro-ai/sessions.test.ts`

**Interfaces:**
- Produces: `normalizedEditorialText(text: string): string` e `isSubstantiveEditorialChange(before: string, after: string): boolean`; o call site `changedByReviewer` passa a usar `isSubstantiveEditorialChange` no lugar de comparação `trim()`. Exportar `isSubstantiveEditorialChange` em `maestroAiTestHooks`.

- [ ] **Step 1: teste vermelho**

```ts
it('isSubstantiveEditorialChange ignores whitespace-only differences (desktop parity)', () => {
  const { isSubstantiveEditorialChange } = maestroAiTestHooks;
  expect(isSubstantiveEditorialChange('a b', 'a\n\nb')).toBe(false);
  expect(isSubstantiveEditorialChange('a  b', 'a b')).toBe(false);
  expect(isSubstantiveEditorialChange('a b\r\n', 'a b')).toBe(false);
  expect(isSubstantiveEditorialChange('a b.', 'a b')).toBe(true);
  expect(isSubstantiveEditorialChange('A b', 'a b')).toBe(true);
});
```

- [ ] **Step 2: rodar e ver falhar** (função não existe).

- [ ] **Step 3: implementação** (junto às demais funções puras, antes de `validateRevisionGuard`)

```ts
// Desktop parity (session_orchestration.rs normalized_editorial_text):
// peripheral whitespace, line breaks and redundant internal whitespace are
// cosmetic; punctuation and capitalization are substantive.
function normalizedEditorialText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\s+/).filter(Boolean).join(' ');
}

function isSubstantiveEditorialChange(before: string, after: string): boolean {
  return normalizedEditorialText(before) !== normalizedEditorialText(after);
}
```

Call site (linha 1735): `const changedByReviewer = Boolean(revisedText && isSubstantiveEditorialChange(currentText, revisedText));`

- [ ] **Step 4: rodar verde + suíte completa** (turnos com mudança só cosmética agora contam como custódia inalterada — verificar que nenhum teste existente quebre).

### Task 4: aliases de agente — tabela canônica completa

**Files:**
- Modify: `admin-motor/src/handlers/routes/maestro-ai/sessions.ts:284-293`
- Test: `admin-motor/src/handlers/routes/maestro-ai/sessions.test.ts`

**Interfaces:**
- Consumes: `sanitizeAgent(value: unknown, fallback: ProviderKey): ProviderKey` (assinatura inalterada).
- Produces: aliases adicionais `agy`/`antigravity`→gemini, `deepseek-api`→deepseek, `grok-api`→grok, `perplexity-api`→perplexity (session_controls.rs:76-87).

- [ ] **Step 1: teste vermelho**

```ts
it('sanitizeAgent honors the desktop alias table', () => {
  const { sanitizeAgent } = maestroAiTestHooks;
  expect(sanitizeAgent('agy', 'claude')).toBe('gemini');
  expect(sanitizeAgent('antigravity', 'claude')).toBe('gemini');
  expect(sanitizeAgent('deepseek-api', 'claude')).toBe('deepseek');
  expect(sanitizeAgent('grok-api', 'claude')).toBe('grok');
  expect(sanitizeAgent('perplexity-api', 'claude')).toBe('perplexity');
  expect(sanitizeAgent('unknown', 'claude')).toBe('claude');
});
```

- [ ] **Step 2: rodar e ver falhar** (`agy` cai no fallback hoje).

- [ ] **Step 3: implementação** — acrescentar em `sanitizeAgent` (mantendo as linhas existentes):

```ts
  if (normalized === 'agy' || normalized === 'antigravity') return 'gemini';
  if (normalized === 'deepseek-api') return 'deepseek';
  if (normalized === 'grok-api') return 'grok';
  if (normalized === 'perplexity-api') return 'perplexity';
```

Adicionar `sanitizeAgent` a `maestroAiTestHooks`.

- [ ] **Step 4: rodar verde.**

### Task 5: gates + ship

- [ ] Suíte completa + typecheck + eslint + biome + prettier public + markdownlint CHANGELOG.
- [ ] Bump `APP_VERSION` → `APP v02.04.00` (src/App.tsx:35) + entrada no CHANGELOG.
- [ ] Cross-review ALL READY do diff.
- [ ] Branch `feat/maestro-ai-parity-plan-a` → PR → automerge → GHA verde.
