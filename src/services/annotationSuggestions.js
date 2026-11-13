import { EMBEDDING_MODEL, embedTexts } from './annotationEmbeddings.js';
import { rerankCandidates } from './annotationReranker.js';
import { loadVocabularySnapshot, searchTerminologyTerms } from './terminologyApi.js';
import { selectAutoAnnotations } from './annotationAutoApply.js';

const cache = new Map();
export const DEFAULT_RETRIEVAL_CUTOFF = 12;

export function cosine(left, right) {
  if (!left?.length || left.length !== right?.length) throw new Error('Invalid embedding vector.');
  let dot = 0; let a = 0; let b = 0;
  for (let i = 0; i < left.length; i += 1) { dot += left[i] * right[i]; a += left[i] ** 2; b += right[i] ** 2; }
  return dot / (Math.sqrt(a * b) || 1);
}

export function glossaryText(term) {
  return [term.label, ...(term.synonyms || []), term.definition].filter(Boolean).join('. ');
}

export function columnQueryText(query) {
  const description = String(query.description || '').trim();
  if (description) return description;
  return [query.header, query.sheetName, ...(query.neighboringHeaders || []), query.notes]
    .map((value) => String(value || '').trim()).filter(Boolean).join('. ');
}

export async function retrieveCandidates(query, { ontologyId, cutoff = DEFAULT_RETRIEVAL_CUTOFF, language = 'en', signal, snapshotLoader = loadVocabularySnapshot, embed = embedTexts, search = searchTerminologyTerms } = {}) {
  const queryText = columnQueryText(query);
  if (!queryText) return { candidates: [], source: 'none' };
  const boundedCutoff = Math.max(1, Math.min(50, cutoff));
  let snapshot = null;
  try { snapshot = await snapshotLoader({ ontologyId, signal }); } catch (error) { if (error?.name === 'AbortError') throw error; }
  if (snapshot?.terms?.length) {
    const key = `${EMBEDDING_MODEL}:${snapshot.fingerprint}`;
    let record = cache.get(key);
    if (!record) {
      record = embed(snapshot.terms.map(glossaryText)).then((vectors) => ({ terms: snapshot.terms, vectors }));
      cache.set(key, record);
      record.catch(() => cache.delete(key));
    }
    const { terms, vectors } = await record;
    const [queryVector] = await embed([queryText]);
    return { candidates: terms.map((term, index) => ({ ...term, score: cosine(queryVector, vectors[index]) })).sort((a, b) => b.score - a.score || a.iri.localeCompare(b.iri)).slice(0, boundedCutoff), source: 'semantic snapshot' };
  }
  const { terms } = await search({ query: queryText, ontologyId, language, limit: boundedCutoff, signal });
  return { candidates: terms, source: 'Terminology Service fallback' };
}

export async function suggestMeanings(query, options = {}) {
  const retrieval = await retrieveCandidates(query, options);
  if (!retrieval.candidates.length) return { ...retrieval, candidates: [], ambiguous: false };
  const rerank = options.rerank || rerankCandidates;
  const result = await rerank(query, retrieval.candidates, { signal: options.signal });
  return { ...retrieval, candidates: result.ranked.filter((term) => term.supported).slice(0, 3), ambiguous: result.ambiguous };
}

/** Deterministic baseline for evaluation and when no model is configured. */
export async function baselineMeanings(query, options = {}) {
  const queryText = columnQueryText(query);
  if (!queryText) return [];
  const { terms } = await (options.search || searchTerminologyTerms)({ query: queryText, ontologyId: options.ontologyId, language: options.language, limit: options.cutoff || DEFAULT_RETRIEVAL_CUTOFF, signal: options.signal });
  const words = queryText.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const score = (term) => {
    const label = String(term.label || '').toLocaleLowerCase();
    const synonyms = (term.synonyms || []).join(' ').toLocaleLowerCase();
    const definition = String(term.definition || '').toLocaleLowerCase();
    return words.reduce((sum, word) => sum + (label.includes(word) ? 3 : 0) + (synonyms.includes(word) ? 2 : 0) + (definition.includes(word) ? 1 : 0), 0);
  };
  return [...terms].sort((a, b) => score(b) - score(a) || a.iri.localeCompare(b.iri));
}

/** Gold URI labels let retrieval misses be separated from ranking and abstention. */
export async function evaluateAnnotationSuggestions(labelledColumns, options = {}) {
  const rows = [];
  for (const item of labelledColumns) {
    const query = { description: item.description, header: item.header, sheetName: item.sheetName || '', neighboringHeaders: item.neighboringHeaders || [] };
    const retrieval = await retrieveCandidates(query, options);
    const baseline = await baselineMeanings(query, options);
    const reranked = retrieval.candidates.length
      ? await (options.rerank || rerankCandidates)(query, retrieval.candidates, options)
      : { ranked: [], ambiguous: false };
    const supported = reranked.ranked.filter((term) => term.supported).slice(0, 3);
    const automatic = selectAutoAnnotations(query, {
      meaning: { source: retrieval.source, candidates: supported, ambiguous: reranked.ambiguous },
    }, [], { vocabularyId: options.ontologyId || '', language: options.language || 'en', localizedUnitLabels: { language: options.language || 'en', labels: {} } });
    const autoUri = automatic.meaning?.choice.iri || null;
    rows.push({
      goldUri: item.goldUri,
      retrievalHit: retrieval.candidates.some((term) => term.iri === item.goldUri),
      beforeHit3: retrieval.candidates.slice(0, 3).some((term) => term.iri === item.goldUri),
      baselineHit3: baseline.slice(0, 3).some((term) => term.iri === item.goldUri),
      afterHit3: supported.some((term) => term.iri === item.goldUri),
      abstained: supported.length === 0,
      autoApplied: Boolean(autoUri),
      autoCorrect: Boolean(autoUri && autoUri === item.goldUri),
      source: retrieval.source,
    });
  }
  const rate = (key) => rows.length ? rows.filter((row) => row[key]).length / rows.length : 0;
  const autoAppliedCount = rows.filter((row) => row.autoApplied).length;
  return {
    count: rows.length,
    retrievalCutoff: options.cutoff || DEFAULT_RETRIEVAL_CUTOFF,
    recallAtCutoff: rate('retrievalHit'),
    hitAt3Before: rate('beforeHit3'),
    hitAt3After: rate('afterHit3'),
    baselineHit3: rate('baselineHit3'),
    abstentionRate: rate('abstained'),
    autoApplyRate: rate('autoApplied'),
    autoPrecision: autoAppliedCount ? rows.filter((row) => row.autoCorrect).length / autoAppliedCount : null,
    rows,
  };
}
