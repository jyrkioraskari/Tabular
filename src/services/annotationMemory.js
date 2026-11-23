/** Browser-local history of choices the researcher actually applied. */
export const ANNOTATION_MEMORY_KEY = 'tabular-rdm.annotation-memory.v2';
const LEGACY_MEMORY_KEY = 'tabular-rdm.annotation-memory.v1';
export const ANNOTATION_MEMORY_EVENT = 'tabular-rdm.annotation-memory-changed';
const MAX_RECORDS = 300;
const STOP_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'is', 'of', 'on', 'or', 'the', 'to', 'with']);

function normalized(value) {
  return String(value || '').toLocaleLowerCase().normalize('NFKC')
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function tokens(value) {
  return new Set(normalized(value).split(' ').filter((word) => word.length > 1 && !STOP_WORDS.has(word)));
}

function dice(left, right) {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return (2 * shared) / (left.size + right.size);
}

function characterDice(left, right) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const grams = (value) => {
    const padded = ` ${value} `;
    const result = new Map();
    for (let index = 0; index < padded.length - 1; index += 1) {
      const gram = padded.slice(index, index + 2);
      result.set(gram, (result.get(gram) || 0) + 1);
    }
    return result;
  };
  const a = grams(left);
  const b = grams(right);
  let shared = 0;
  for (const [gram, count] of a) shared += Math.min(count, b.get(gram) || 0);
  return (2 * shared) / ([...a.values()].reduce((sum, count) => sum + count, 0) + [...b.values()].reduce((sum, count) => sum + count, 0));
}

function explicitUnitToken(header) {
  return String(header || '').match(/\[([^\]]+)\]|\(([^)]+)\)/)?.[1]?.trim().toLocaleLowerCase() ||
    String(header || '').match(/\[([^\]]+)\]|\(([^)]+)\)/)?.[2]?.trim().toLocaleLowerCase() || '';
}

export function readAnnotationMemory(storage = globalThis.localStorage) {
  try {
    // v1 wrote choices without the remember opt-in. Do not reuse those records.
    storage?.removeItem(LEGACY_MEMORY_KEY);
    const parsed = JSON.parse(storage?.getItem(ANNOTATION_MEMORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : [];
  } catch {
    return [];
  }
}

export function rememberAnnotationChoice(choice, storage = globalThis.localStorage) {
  if (!choice?.uri || !choice?.kind || (!choice.description?.trim() && !choice.header?.trim())) return readAnnotationMemory(storage);
  const records = readAnnotationMemory(storage);
  const key = [choice.originNodeId || '', choice.kind, choice.uri, normalized(choice.description), normalized(choice.header), choice.vocabularyId || ''].join('|');
  const next = [
    { ...choice, savedAt: Date.now() },
    ...records.filter((item) => [item.originNodeId || '', item.kind, item.uri, normalized(item.description), normalized(item.header), item.vocabularyId || ''].join('|') !== key),
  ].slice(0, MAX_RECORDS);
  storage.setItem(ANNOTATION_MEMORY_KEY, JSON.stringify(next));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ANNOTATION_MEMORY_EVENT));
  return next;
}

export function clearAnnotationMemory(storage = globalThis.localStorage) {
  storage.removeItem(ANNOTATION_MEMORY_KEY);
  storage.removeItem(LEGACY_MEMORY_KEY);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ANNOTATION_MEMORY_EVENT));
}

export function clearAnnotationMemoryForNode(nodeId, storage = globalThis.localStorage) {
  const remaining = readAnnotationMemory(storage).filter((item) => item.originNodeId !== nodeId);
  storage.setItem(ANNOTATION_MEMORY_KEY, JSON.stringify(remaining));
  storage.removeItem(LEGACY_MEMORY_KEY);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ANNOTATION_MEMORY_EVENT));
  return remaining;
}

export function rankRememberedAnnotations(field, records, { vocabularyId = '' } = {}) {
  if (!String(field?.description || '').trim() && !String(field?.header || '').trim()) return [];
  const currentDescription = normalized(field.description);
  const currentHeader = normalized(field.header);
  const currentTokens = tokens(field.description);
  const currentUnitToken = explicitUnitToken(field.header);
  const candidates = (Array.isArray(records) ? records : []).flatMap((item) => {
    if (!item?.uri || !['meaning', 'unit'].includes(item.kind)) return [];
    if (item.kind === 'meaning' && vocabularyId && (item.vocabularyId || '') !== vocabularyId) return [];
    const previousUnitToken = explicitUnitToken(item.header);
    if (item.kind === 'unit' && currentUnitToken && currentUnitToken !== previousUnitToken) return [];
    const previousTokens = tokens(item.description);
    const descriptionSimilarity = Math.max(
      dice(currentTokens, previousTokens),
      characterDice([...currentTokens].sort().join(' '), [...previousTokens].sort().join(' ')),
    );
    const sameDescription = Boolean(currentDescription && currentDescription === normalized(item.description));
    const previousHeader = normalized(item.header);
    const headerSimilarity = characterDice(currentHeader, previousHeader);
    const similarHeader = Boolean(currentHeader && previousHeader && (currentHeader === previousHeader || (currentHeader.length >= 4 && previousHeader.length >= 4 && headerSimilarity >= 0.8)));
    // Description similarity can stand alone. A repeated header needs at least
    // one matching description term, unless the earlier choice had no description.
    if (!sameDescription && descriptionSimilarity < 0.58 && !(similarHeader && (descriptionSimilarity >= 0.25 || !item.description?.trim() || !field.description?.trim()))) return [];
    const score = (sameDescription ? 1 : descriptionSimilarity) + (similarHeader ? 0.3 * headerSimilarity : 0);
    return [{ ...item, score, sameDescription, sameHeader: Boolean(currentHeader && currentHeader === previousHeader), headerSimilarity, descriptionSimilarity }];
  }).sort((a, b) => b.score - a.score || b.savedAt - a.savedAt);
  return candidates;
}

export function findRememberedAnnotations(field, records, options = {}) {
  const candidates = rankRememberedAnnotations(field, records, options);
  return {
    meaning: candidates.find((item) => item.kind === 'meaning') || null,
    unit: candidates.find((item) => item.kind === 'unit') || null,
  };
}
