import { rankRememberedAnnotations } from './annotationMemory.js';

// Similarity is a retrieval score, not a calibrated probability. Auto-apply
// requires both a strong score and a single supported reranker result.
export const AUTO_SEMANTIC_SCORE = 0.72;
const AUTO_MEMORY_SCORE = 0.88;
const MEMORY_MARGIN = 0.15;

export function autoSlotKey({ workbookKey, sheetName, vocabularyId }, field, index, kind) {
  // Description edits are deliberate user input and must not clear a manual block.
  return JSON.stringify([workbookKey, sheetName, vocabularyId, index, field.header, kind]);
}

export function localizeRememberedUnit(choice, language, localizedUnitLabels) {
  if (!choice) return null;
  const localized = localizedUnitLabels.language === language
    ? localizedUnitLabels.labels[choice.uri]
    : null;
  const storedLanguageAllowed = /^de(?:-|$)/i.test(language)
    ? /^(?:de|en)(?:-|$)/i.test(choice.language || '')
    : /^en(?:-|$)/i.test(choice.language || '');
  const label = localized?.label || (storedLanguageAllowed ? choice.label : '');
  return label ? { ...choice, label, language: localized?.language || choice.language } : null;
}

function confidentMemoryChoice(field, ranked, kind) {
  const choices = ranked.filter((choice) => choice.kind === kind);
  const top = choices[0];
  if (!top) return null;
  const strong = top.score >= AUTO_MEMORY_SCORE ||
    ((top.sameHeader || top.headerSimilarity >= 0.92) &&
      (!field.description?.trim() || !top.description?.trim()));
  if (!strong) return null;
  // Similar history entries pointing to different URIs need a human choice.
  if (choices.some((choice) => choice.uri !== top.uri && choice.score >= top.score - MEMORY_MARGIN)) return null;
  return top;
}

/** Select only choices safe enough to fill empty links; never replace user data. */
export function selectAutoAnnotations(field, result, memory, { vocabularyId, language, localizedUnitLabels }) {
  const ranked = rankRememberedAnnotations(field, memory, { vocabularyId });
  const rememberedMeaning = confidentMemoryChoice(field, ranked, 'meaning');
  const rememberedUnit = localizeRememberedUnit(confidentMemoryChoice(field, ranked, 'unit'), language, localizedUnitLabels);

  const candidates = result?.meaning?.candidates || [];
  const semanticMeaning = result?.meaning?.source === 'semantic snapshot' &&
    !result.meaning.ambiguous && candidates.length === 1 &&
    Number.isFinite(candidates[0].score) && candidates[0].score >= AUTO_SEMANTIC_SCORE
    ? candidates[0] : null;
  const meaning = !field.descriptionUri
    ? rememberedMeaning && semanticMeaning && rememberedMeaning.uri !== semanticMeaning.iri
      ? null
      : rememberedMeaning ? { source: 'memory', choice: rememberedMeaning }
        : semanticMeaning ? { source: 'semantic', choice: semanticMeaning }
          : null
    : null;

  const explicitUnit = result?.unit?.unit || null;
  const unit = !field.unitUri && !String(field.unit || '').trim()
    ? rememberedUnit && explicitUnit && rememberedUnit.uri !== explicitUnit.unit
      ? null
      : rememberedUnit ? { source: 'memory', choice: rememberedUnit }
        : explicitUnit ? { source: 'explicit', choice: explicitUnit }
          : null
    : null;
  return { meaning, unit };
}
