// Approved-content lock — byte-exact port of maestro-app (canonical)
// src-tauri/src/editorial_content_lock.rs. Blocks are segmented on blank
// lines, identified as B0001.., and compared via whitespace-normalized text;
// a revised custody may only change/reorder/grow blocks that the
// maestro_revision_report declares in a changed_blocks section with
// protocol_basis (and change_type split/addition/reorder where applicable).
//
// Implementation note (documented deviation): the desktop keys block equality
// by sha256(normalized_text); this port keys by the normalized text itself —
// the equality relation is identical and no hash is exposed by validation.
// The prompt-side manifest column (sha256_12) belongs to Plan F.

type EditorialContentBlock = {
  id: string;
  normalizedKey: string;
  text: string;
  kind: string;
  chars: number;
};

type ChangedBlockDeclaration = {
  hasProtocolBasis: boolean;
  allowsBlockCountGrowth: boolean;
  allowsReorder: boolean;
};

// Rust char::is_whitespace = Unicode White_Space (same class as the Plan A
// helpers in sessions.ts; duplicated locally to keep this module standalone
// like its desktop counterpart).
const WS_CLASS = '[\\t\\n\\u000B\\f\\r \\u0085\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]';
const WS_RUN = new RegExp(`${WS_CLASS}+`, 'g');
const WS_EDGES = new RegExp(`^${WS_CLASS}+|${WS_CLASS}+$`, 'g');
const WS_START = new RegExp(`^${WS_CLASS}+`);
// Rust splits the bare protocol_basis token on char::is_whitespace or , } ].
const BARE_TOKEN_BOUNDARY = new RegExp(`${WS_CLASS}|[,}\\]]`);
// Field-extraction regexes mirror the Rust regex crate classes exactly:
// \s there is Unicode White_Space (NEL in, FEFF out) -> WS_CLASS here;
// \d there is Unicode \p{Nd}; the trailing boundary is the Unicode word
// class ([\p{Alphabetic}\p{M}\p{Nd}\p{Pc}\p{Join_Control}]) as a negative
// lookahead, since JS \b/\s/\d are ASCII or ES-specific classes.
const BLOCK_ID_FIELD = new RegExp(
  `["']?block_id["']?${WS_CLASS}*[:=]${WS_CLASS}*["']?(B\\p{Nd}{4})(?![\\p{Alphabetic}\\p{M}\\p{Nd}\\p{Pc}\\p{Join_Control}])`,
  'isu',
);
const PROTOCOL_BASIS_KEY = new RegExp(`["']?protocol_basis["']?${WS_CLASS}*[:=]${WS_CLASS}*`, 'isu');

function rustTrim(text: string): string {
  return text.replace(WS_EDGES, '');
}

function rustTrimStart(text: string): string {
  return text.replace(WS_START, '');
}

function asciiLowercase(text: string): string {
  return text.replace(/[A-Z]/g, (character) => character.toLowerCase());
}

function normalizeBlockText(text: string): string {
  return text.split(WS_RUN).filter(Boolean).join(' ');
}

export function segmentEditorialBlocks(text: string): EditorialContentBlock[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n\n')
    .map((rawBlock) => rustTrim(rawBlock))
    .filter((block) => block !== '')
    .map((block, index) => ({
      id: `B${String(index + 1).padStart(4, '0')}`,
      normalizedKey: normalizeBlockText(block),
      text: block,
      kind: classifyBlockKind(block),
      chars: Array.from(block).length,
    }));
}

// Desktop parity (classify_block_kind): heading/quote by leading marker, list
// when every line starts with a bullet or ASCII digit, table when two or more
// lines contain a pipe, else paragraph.
function classifyBlockKind(text: string): string {
  const trimmed = rustTrimStart(text);
  if (trimmed.startsWith('#')) return 'heading';
  if (trimmed.startsWith('>')) return 'quote';
  const lines = trimmed.split('\n');
  if (
    lines.every((line) => {
      const lineStart = rustTrimStart(line);
      return lineStart.startsWith('- ') || lineStart.startsWith('* ') || /^[0-9]/.test(lineStart.charAt(0));
    })
  ) {
    return 'list';
  }
  if (lines.filter((line) => line.includes('|')).length >= 2) return 'table';
  return 'paragraph';
}

function markdownTableExcerpt(text: string): string {
  const compact = normalizeBlockText(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const characters = Array.from(compact);
  let excerpt = characters.slice(0, 96).join('');
  if (characters.length > 96) excerpt += '...';
  return excerpt;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Desktop parity (format_block_manifest_for_prompt): the prompt-facing table
// of locked blocks. The sha256_12 column here IS the desktop hash — computed
// asynchronously via crypto.subtle over the normalized block text.
export async function formatBlockManifestForPrompt(text: string): Promise<string> {
  const blocks = segmentEditorialBlocks(text);
  if (blocks.length === 0) return 'No editorial content blocks were detected.';
  const lines = [
    '| block_id | kind | chars | sha256_12 | locked_by_default | excerpt |',
    '|---|---:|---:|---|---|---|',
  ];
  for (const block of blocks) {
    const hash = await sha256Hex(block.normalizedKey);
    lines.push(
      `| ${block.id} | ${block.kind} | ${block.chars} | ${hash.slice(0, 12)} | yes | ${markdownTableExcerpt(block.text)} |`,
    );
  }
  return lines.join('\n');
}

export function validateRevisionContentLock(before: string, after: string, report: string): string | null {
  const beforeBlocks = segmentEditorialBlocks(before);
  const afterBlocks = segmentEditorialBlocks(after);
  const changedIds = changedReceivedBlockIds(beforeBlocks, afterBlocks);
  const reorderedIds = reorderedReceivedBlockIds(beforeBlocks, afterBlocks);
  const reordered = reorderedIds.length > 0;
  const changedSection = extractChangedBlocksSection(report);
  if (changedSection === null) {
    if (changedIds.length === 0 && afterBlocks.length <= beforeBlocks.length && !reordered) {
      return null;
    }
    if (reordered) {
      return `approved-content lock violation: revised custody reordered received blocks ${reorderedIds.join(', ')} but maestro_revision_report has no changed_blocks section with change_type reorder`;
    }
    return `approved-content lock violation: revised custody changed received blocks ${changedIds.join(', ')} but maestro_revision_report has no changed_blocks section with block IDs`;
  }
  const declarations = extractChangedBlockDeclarations(changedSection);

  const undeclared = changedIds.filter((id) => !declarations.has(id));
  if (undeclared.length > 0) {
    return `approved-content lock violation: changed received blocks ${undeclared.join(', ')} without matching changed_blocks declaration`;
  }

  const idsRequiringProtocolBasis = [...changedIds];
  for (const id of reorderedIds) {
    if (!idsRequiringProtocolBasis.includes(id)) idsRequiringProtocolBasis.push(id);
  }

  const missingProtocolBasis = idsRequiringProtocolBasis.filter((id) => {
    const declaration = declarations.get(id);
    return declaration ? !declaration.hasProtocolBasis : false;
  });
  if (missingProtocolBasis.length > 0) {
    return `approved-content lock violation: changed_blocks entries for ${missingProtocolBasis.join(', ')} must include protocol_basis`;
  }

  if (
    afterBlocks.length > beforeBlocks.length &&
    ![...declarations.values()].some((declaration) => declaration.allowsBlockCountGrowth)
  ) {
    return 'approved-content lock violation: revised custody added new blocks without declaring change_type split/addition in changed_blocks';
  }

  if (
    reordered &&
    !reorderedIds.every((id) => {
      const declaration = declarations.get(id);
      return declaration ? declaration.allowsReorder : false;
    })
  ) {
    const missingReorder = reorderedIds.filter((id) => {
      const declaration = declarations.get(id);
      return declaration ? !declaration.allowsReorder : true;
    });
    return `approved-content lock violation: reordered received blocks ${missingReorder.join(', ')} must each declare change_type reorder in changed_blocks`;
  }

  return null;
}

function changedReceivedBlockIds(
  beforeBlocks: EditorialContentBlock[],
  afterBlocks: EditorialContentBlock[],
): string[] {
  const afterKeyCounts = new Map<string, number>();
  for (const after of afterBlocks) {
    afterKeyCounts.set(after.normalizedKey, (afterKeyCounts.get(after.normalizedKey) ?? 0) + 1);
  }
  const changed: string[] = [];
  for (const before of beforeBlocks) {
    const count = afterKeyCounts.get(before.normalizedKey) ?? 0;
    if (count === 0) {
      changed.push(before.id);
    } else {
      afterKeyCounts.set(before.normalizedKey, count - 1);
    }
  }
  return changed;
}

function reorderedReceivedBlockIds(
  beforeBlocks: EditorialContentBlock[],
  afterBlocks: EditorialContentBlock[],
): string[] {
  const commonCounts = commonNormalizedKeyCounts(beforeBlocks, afterBlocks);
  let total = 0;
  for (const count of commonCounts.values()) total += count;
  if (total <= 1) return [];

  const beforeSequence = commonBlockIdSequence(beforeBlocks, beforeBlocks, commonCounts);
  const afterSequence = commonBlockIdSequence(beforeBlocks, afterBlocks, commonCounts);
  if (beforeSequence.join(' ') === afterSequence.join(' ')) return [];

  const beforePositions = new Map(beforeSequence.map((id, index) => [id, index]));
  const afterPositions = new Map(afterSequence.map((id, index) => [id, index]));
  return beforeSequence.filter((id) => beforePositions.get(id) !== afterPositions.get(id));
}

function commonNormalizedKeyCounts(
  beforeBlocks: EditorialContentBlock[],
  afterBlocks: EditorialContentBlock[],
): Map<string, number> {
  const beforeCounts = new Map<string, number>();
  const afterCounts = new Map<string, number>();
  for (const block of beforeBlocks) {
    beforeCounts.set(block.normalizedKey, (beforeCounts.get(block.normalizedKey) ?? 0) + 1);
  }
  for (const block of afterBlocks) {
    afterCounts.set(block.normalizedKey, (afterCounts.get(block.normalizedKey) ?? 0) + 1);
  }
  const commonCounts = new Map<string, number>();
  for (const [key, beforeCount] of beforeCounts) {
    const afterCount = afterCounts.get(key);
    if (afterCount !== undefined) {
      commonCounts.set(key, Math.min(beforeCount, afterCount));
    }
  }
  return commonCounts;
}

function commonBlockIdSequence(
  beforeBlocks: EditorialContentBlock[],
  orderedBlocks: EditorialContentBlock[],
  commonCounts: Map<string, number>,
): string[] {
  const idsByKey = new Map<string, string[]>();
  const remainingForIds = new Map(commonCounts);
  for (const block of beforeBlocks) {
    const count = remainingForIds.get(block.normalizedKey);
    if (count !== undefined && count > 0) {
      const ids = idsByKey.get(block.normalizedKey);
      if (ids) {
        ids.push(block.id);
      } else {
        idsByKey.set(block.normalizedKey, [block.id]);
      }
      remainingForIds.set(block.normalizedKey, count - 1);
    }
  }

  const remaining = new Map(commonCounts);
  const sequence: string[] = [];
  for (const block of orderedBlocks) {
    const count = remaining.get(block.normalizedKey);
    if (count !== undefined && count > 0) {
      const ids = idsByKey.get(block.normalizedKey);
      const id = ids?.shift();
      if (id !== undefined) sequence.push(id);
      remaining.set(block.normalizedKey, count - 1);
    }
  }
  return sequence;
}

function extractChangedBlocksSection(report: string): string | null {
  const lower = asciiLowercase(report);
  const start = findFirstReportFieldKey(lower, ['changed_blocks', 'changes']);
  if (start === null) return null;
  const relativeEnd = findFirstReportFieldKey(lower.slice(start + 1), [
    'operator_evidence_required',
    'out_of_scope',
    'quality_preservation',
    'unchanged_approved_blocks',
    'custody',
  ]);
  const end = relativeEnd === null ? report.length : start + 1 + relativeEnd;
  return report.slice(start, end);
}

// Rust u8::is_ascii_whitespace: space, tab, LF, CR and form feed.
function isAsciiWhitespaceChar(character: string): boolean {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r' || character === '\f';
}

function findFirstReportFieldKey(haystack: string, keys: string[]): number | null {
  let index = 0;
  let inQuote: string | null = null;
  let escaped = false;
  while (index < haystack.length) {
    const character = haystack.charAt(index);
    if (inQuote !== null) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === inQuote) {
        inQuote = null;
      }
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      const fieldStart = index;
      const endQuote = haystack.indexOf(character, index + 1);
      if (endQuote !== -1) {
        const candidate = haystack.slice(index + 1, endQuote);
        const after = endQuote + 1;
        if (
          keys.includes(candidate) &&
          fieldKeyIsDelimitedBefore(haystack, fieldStart) &&
          fieldKeyHasAssignmentAfter(haystack, after)
        ) {
          return fieldStart;
        }
      }
      inQuote = character;
      index += 1;
      continue;
    }
    if (fieldKeyIsDelimitedBefore(haystack, index)) {
      for (const key of keys) {
        if (haystack.startsWith(key, index)) {
          const after = index + key.length;
          if (fieldKeyHasAssignmentAfter(haystack, after)) {
            return index;
          }
        }
      }
    }
    index += 1;
  }
  return null;
}

function fieldKeyIsDelimitedBefore(haystack: string, index: number): boolean {
  if (index === 0) return true;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const character = haystack.charAt(cursor);
    if (isAsciiWhitespaceChar(character)) continue;
    return character === '{' || character === '[' || character === ',' || character === '\n' || character === '\r';
  }
  return true;
}

function fieldKeyHasAssignmentAfter(haystack: string, index: number): boolean {
  for (let cursor = index; cursor < haystack.length; cursor += 1) {
    const character = haystack.charAt(cursor);
    if (isAsciiWhitespaceChar(character)) continue;
    return character === ':' || character === '=';
  }
  return false;
}

function extractChangedBlockDeclarations(section: string): Map<string, ChangedBlockDeclaration> {
  const declarations = new Map<string, ChangedBlockDeclaration>();
  for (const fragment of changedBlockEntryFragments(section)) {
    const blockId = extractBlockIdField(fragment);
    if (blockId === null) continue;
    const declaration: ChangedBlockDeclaration = {
      hasProtocolBasis: fragmentHasNonemptyProtocolBasis(fragment),
      allowsBlockCountGrowth: fragmentDeclaresBlockCountGrowth(fragment),
      allowsReorder: fragmentDeclaresReorder(fragment),
    };
    const existing = declarations.get(blockId);
    if (existing) {
      existing.hasProtocolBasis ||= declaration.hasProtocolBasis;
      existing.allowsBlockCountGrowth ||= declaration.allowsBlockCountGrowth;
      existing.allowsReorder ||= declaration.allowsReorder;
    } else {
      declarations.set(blockId, declaration);
    }
  }
  return declarations;
}

function changedBlockEntryFragments(section: string): string[] {
  const fragments: string[] = [];
  let depth = 0;
  let start: number | null = null;
  for (let index = 0; index < section.length; index += 1) {
    const character = section.charAt(index);
    if (character === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (character === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== null) {
        fragments.push(section.slice(start, index + 1));
        start = null;
      }
    }
  }
  if (fragments.length === 0) {
    for (const line of section.split('\n')) {
      if (asciiLowercase(line).includes('block_id')) fragments.push(line);
    }
  }
  return fragments;
}

function extractBlockIdField(fragment: string): string | null {
  const match = BLOCK_ID_FIELD.exec(fragment);
  return match?.[1] ?? null;
}

function fragmentHasNonemptyProtocolBasis(fragment: string): boolean {
  const match = PROTOCOL_BASIS_KEY.exec(fragment);
  if (!match) return false;
  return protocolBasisValueIsNonempty(fragment.slice(match.index + match[0].length));
}

function protocolBasisValueIsNonempty(value: string): boolean {
  const trimmed = rustTrimStart(value);
  if (trimmed === '') return false;
  if (trimmed.startsWith('"')) return quotedValueIsNonempty(trimmed.slice(1), '"');
  if (trimmed.startsWith("'")) return quotedValueIsNonempty(trimmed.slice(1), "'");
  if (trimmed.startsWith('[')) return bracketedValueIsNonempty(trimmed.slice(1), '[', ']');
  if (trimmed.startsWith('{')) return bracketedValueIsNonempty(trimmed.slice(1), '{', '}');
  const bareValue = rustTrim(trimmed.split(BARE_TOKEN_BOUNDARY)[0] ?? '');
  return bareValue !== '' && asciiLowercase(bareValue) !== 'null' && bareValue !== '[]' && bareValue !== '{}';
}

function quotedValueIsNonempty(rest: string, quote: string): boolean {
  let escaped = false;
  let value = '';
  for (const character of rest) {
    if (escaped) {
      value += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === quote) {
      return rustTrim(value) !== '';
    }
    value += character;
  }
  return false;
}

function bracketedValueIsNonempty(rest: string, open: string, close: string): boolean {
  let depth = 1;
  let body = '';
  let inQuote: string | null = null;
  let escaped = false;
  for (const character of rest) {
    if (inQuote !== null) {
      body += character;
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === inQuote) {
        inQuote = null;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      inQuote = character;
      body += character;
      continue;
    }
    if (character === open) {
      depth += 1;
      body += character;
      continue;
    }
    if (character === close) {
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        return rustTrim(body) !== '';
      }
      body += character;
      continue;
    }
    body += character;
  }
  return false;
}

function fragmentDeclaresBlockCountGrowth(fragment: string): boolean {
  const lower = asciiLowercase(fragment);
  return (
    lower.includes('change_type') &&
    (lower.includes('split') ||
      lower.includes('addition') ||
      lower.includes('added') ||
      lower.includes('new_block') ||
      lower.includes('new block'))
  );
}

function fragmentDeclaresReorder(fragment: string): boolean {
  const lower = asciiLowercase(fragment);
  return (
    lower.includes('change_type') &&
    (lower.includes('reorder') || lower.includes('reordered') || lower.includes('move') || lower.includes('moved'))
  );
}
