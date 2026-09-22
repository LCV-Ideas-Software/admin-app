// Approved-content lock adapted from maestro-app (canonical)
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
  allowedBlockCountGrowth: number;
  allowsReorder: boolean;
};

// Rust char::is_whitespace = Unicode White_Space (same class as the Plan A
// helpers in sessions.ts; duplicated locally to keep this module standalone
// like its desktop counterpart).
const WS_CLASS = '[\\t\\n\\u000B\\f\\r \\u0085\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]';
const WS_RUN = new RegExp(`${WS_CLASS}+`, 'g');
const WS_EDGES = new RegExp(`^${WS_CLASS}+|${WS_CLASS}+$`, 'g');
const WS_START = new RegExp(`^${WS_CLASS}+`);

function rustTrim(text: string): string {
  return text.replace(WS_EDGES, '');
}

function rustTrimStart(text: string): string {
  return text.replace(WS_START, '');
}

function normalizeBlockText(text: string): string {
  return text.split(WS_RUN).filter(Boolean).join(' ');
}

export function segmentEditorialBlocks(text: string): EditorialContentBlock[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(new RegExp(`\n${WS_CLASS.replace('\\n', '')}*\n`))
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
  // Escape backslashes BEFORE pipes so a pre-existing backslash cannot
  // combine with the pipe escape (CodeQL js/incomplete-sanitization). The
  // desktop escapes only the pipe; this is a deliberate cosmetic-only
  // deviation confined to the informational prompt excerpt.
  const compact = normalizeBlockText(text).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
  if (changedIds.length === 0 && afterBlocks.length <= beforeBlocks.length && !reordered) return null;
  const parsed = parseChangedBlockDeclarations(report);
  if (parsed.error) return parsed.error;
  const declarations = parsed.declarations;
  if (declarations === null) {
    if (reordered) {
      return `approved-content lock violation: revised custody reordered received blocks ${reorderedIds.join(', ')} but maestro_revision_report has no changed_blocks section with change_type reorder`;
    }
    return `approved-content lock violation: revised custody changed received blocks ${changedIds.join(', ')} but maestro_revision_report has no changed_blocks section with block IDs`;
  }
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
    [...declarations.values()].reduce((sum, declaration) => sum + declaration.allowedBlockCountGrowth, 0) <
      afterBlocks.length - beforeBlocks.length
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
  // Match identical text at stable positions first. This preserves the ID of
  // the first edited occurrence when adjacent blocks have identical text.
  let start = 0;
  while (
    start < beforeBlocks.length &&
    start < afterBlocks.length &&
    beforeBlocks[start]?.normalizedKey === afterBlocks[start]?.normalizedKey
  ) {
    start += 1;
  }
  let beforeEnd = beforeBlocks.length;
  let afterEnd = afterBlocks.length;
  while (
    beforeEnd > start &&
    afterEnd > start &&
    beforeBlocks[beforeEnd - 1]?.normalizedKey === afterBlocks[afterEnd - 1]?.normalizedKey
  ) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }
  const afterKeyCounts = new Map<string, number>();
  for (const after of afterBlocks.slice(start, afterEnd)) {
    afterKeyCounts.set(after.normalizedKey, (afterKeyCounts.get(after.normalizedKey) ?? 0) + 1);
  }
  const changed: string[] = [];
  for (const before of beforeBlocks.slice(start, beforeEnd)) {
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

function parseChangedBlockDeclarations(report: string): {
  declarations: Map<string, ChangedBlockDeclaration> | null;
  error: string | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(report);
  } catch {
    return {
      declarations: null,
      error: 'approved-content lock violation: maestro_revision_report must be one strict JSON object',
    };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      declarations: null,
      error: 'approved-content lock violation: maestro_revision_report must be one strict JSON object',
    };
  }
  const changedBlocks = (parsed as Record<string, unknown>).changed_blocks;
  if (changedBlocks === undefined) return { declarations: null, error: null };
  if (!Array.isArray(changedBlocks)) {
    return {
      declarations: null,
      error: 'approved-content lock violation: changed_blocks must be a JSON array',
    };
  }
  const declarations = new Map<string, ChangedBlockDeclaration>();
  for (const entry of changedBlocks) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return {
        declarations: null,
        error: 'approved-content lock violation: each changed_blocks entry must be a JSON object',
      };
    }
    const fields = entry as Record<string, unknown>;
    const blockId = fields.block_id;
    if (typeof blockId !== 'string' || !/^B\p{Nd}{4,}$/u.test(blockId)) continue;
    if (declarations.has(blockId)) {
      return {
        declarations: null,
        error: `approved-content lock violation: duplicate changed_blocks declaration for ${blockId}`,
      };
    }
    const basis = fields.protocol_basis;
    const changeType = fields.change_type;
    declarations.set(blockId, {
      hasProtocolBasis:
        (typeof basis === 'string' && rustTrim(basis) !== '') ||
        (Array.isArray(basis) && basis.length > 0) ||
        (typeof basis === 'object' && basis !== null && !Array.isArray(basis) && Object.keys(basis).length > 0),
      allowedBlockCountGrowth:
        changeType === 'split' || changeType === 'addition'
          ? Number.isSafeInteger(fields.new_block_count) && Number(fields.new_block_count) > 0
            ? Number(fields.new_block_count)
            : fields.new_block_count === undefined
              ? 1
              : 0
          : 0,
      allowsReorder: changeType === 'reorder',
    });
  }
  return { declarations, error: null };
}
