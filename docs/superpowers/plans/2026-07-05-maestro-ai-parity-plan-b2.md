# Maestro AI Parity Plan B2 — Approved-Content Lock (executado)

> Registro do ship; fonte canônica: `maestro-app/src-tauri/src/editorial_content_lock.rs` (959 linhas; lógica 1-607, testes oracle 608+).

**Goal:** Portar a trava soberana de conteúdo aprovado: uma custódia revisada só pode alterar/reordenar/crescer blocos declarados na seção `changed_blocks` do relatório, com `protocol_basis` não-vazio e `change_type` split/addition (crescimento) ou reorder (reordenação).

## Entregue

- Novo módulo `admin-motor/src/handlers/routes/maestro-ai/content-lock.ts` — port byte-exato e standalone (espelha a modularidade do desktop):
  - `segmentEditorialBlocks`: CRLF→LF, split em `\n\n`, trim canônico (classe White_Space do Rust), IDs `B0001…`.
  - `validateRevisionContentLock(before, after, report)`: mesma ordem e strings exatas dos 5 erros do desktop (sem seção com mudança/reordenação; bloco alterado sem declaração; `protocol_basis` ausente; crescimento sem split/addition; reordenação sem reorder por bloco).
  - Detecção de mudança/reordenação por multiconjunto de chaves normalizadas (`changed_received_block_ids`, `reordered_received_block_ids` com sequência comum por hash e posições).
  - Localizador de seção (`extract_changed_blocks_section` + `find_first_report_field_key`): chave `changed_blocks`/`changes` reconhecida no início, ou após `{`/`[`/`,` (pulando whitespace ASCII), com chaves entre aspas suportadas; fim da seção na próxima chave de {operator_evidence_required, out_of_scope, quality_preservation, unchanged_approved_blocks, custody}.
  - Declarações por fragmento `{...}` (profundidade de chaves) com fallback por linhas contendo `block_id`; valores quoted/bracketed/bare com as mesmas regras de não-vazio; keywords de `change_type` idênticas.
  - **Regexes de extração com classes canônicas (achados do cross-review, red-first)**: o `\b`/`\s`/`\d` do regex crate do Rust são Unicode (White_Space com NEL e sem FEFF; `\p{Nd}`; word class `[\p{Alphabetic}\p{M}\p{Nd}\p{Pc}\p{Join_Control}]`), enquanto os do JS são ASCII/ES — `BLOCK_ID_FIELD` e `PROTOCOL_BASIS_KEY` são construídas de `WS_CLASS` + `\p{Nd}` + lookahead negativo da word class, com testes de paridade para `B0002é`, NEL, FEFF e dígitos árabes.
- Wiring em `runSession`: após `validateSerialTurnOutput` passar e havendo `<maestro_final_text>`, `validateRevisionContentLock` roda ANTES do tier guard (ordem canônica: sessões 1591 < 1677); violação segue o mesmo caminho CONTRACT_VIOLATION → retry corretivo ×3 → skip.

## Desvio de implementação documentado

- O desktop chaveia igualdade de bloco por `sha256(texto_normalizado)`; o port usa o próprio texto normalizado como chave — relação de igualdade idêntica, nenhum hash é exposto pela validação (crypto.subtle é assíncrono em Workers). A coluna `sha256_12` do manifest de prompt pertence ao Plano F.

## Testes

- `content-lock.test.ts` (8 testes, oracle do desktop incl. o teste canônico B0002-sem-declaração): segmentação, revisão inalterada/cosmética, drop não-declarado é violação, mudança sem seção, declaração sem `protocol_basis`, crescimento sem/com `change_type addition`, reordenação sem/com `reorder` por bloco, fallback bare (não-JSON).
- Integração em `sessions.test.ts`: mudança de bloco não-declarada → CONTRACT_VIOLATION com retry corretivo e custódia preservada; fixtures dos testes de bans-inversion e tier-guard atualizados para a forma canônica de relatório (`changed_blocks` liderando — o localizador não reconhece a chave precedida por linha de valor quoted, igual ao desktop) e asserção de chamada única no tier guard.
- Suíte completa 148/148.
