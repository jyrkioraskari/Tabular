/**
 * Client for the NFDI4Ing Terminology Service's OLS4 API v2.
 */
const TERMINOLOGY_ENTITIES_URL = 'https://api.terminology.tib.eu/api/v2/entities';
const DEFAULT_RESULT_LIMIT = 20;
const MAX_RESULT_LIMIT = 100;

function firstText(value) {
  if (Array.isArray(value)) {
    return value.find((item) => typeof item === 'string' && item.trim())?.trim() ?? '';
  }

  return typeof value === 'string' ? value.trim() : '';
}

function allText(value) {
  return (Array.isArray(value) ? value : [value])
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim());
}

function normalizeTerm(entity) {
  const types = Array.isArray(entity?.type)
    ? entity.type.filter((type) => type && type !== 'entity')
    : [];

  return {
    iri: firstText(entity?.iri),
    label: firstText(entity?.label) || firstText(entity?.shortForm) || firstText(entity?.iri),
    definition: firstText(entity?.definition),
    synonyms: [...new Set([...allText(entity?.synonym), ...allText(entity?.synonyms)])],
    ontologyId: firstText(entity?.ontologyId),
    ontologyPrefix:
      firstText(entity?.ontologyPreferredPrefix) || firstText(entity?.ontologyId).toUpperCase(),
    curie: firstText(entity?.curie),
    types,
    isDefiningOntology: entity?.isDefiningOntology === true,
  };
}

function normalizeTerms(entities) {
  const termsByIri = new Map();

  for (const entity of Array.isArray(entities) ? entities : []) {
    const term = normalizeTerm(entity);

    if (!term.iri) {
      continue;
    }

    const existingTerm = termsByIri.get(term.iri);

    if (!existingTerm || (!existingTerm.isDefiningOntology && term.isDefiningOntology)) {
      termsByIri.set(term.iri, term);
    }
  }

  return [...termsByIri.values()];
}

export async function searchTerminologyTerms({
  query,
  language = 'en',
  page = 0,
  limit = DEFAULT_RESULT_LIMIT,
  signal,
  ontologyId,
}) {
  const trimmedQuery = String(query ?? '').trim();

  if (!trimmedQuery) {
    return { terms: [], total: 0 };
  }

  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_RESULT_LIMIT, 1), MAX_RESULT_LIMIT);
  const searchUrl = new URL(TERMINOLOGY_ENTITIES_URL);

  searchUrl.searchParams.set('search', trimmedQuery);
  searchUrl.searchParams.set('lang', language);
  searchUrl.searchParams.set('page', String(Math.max(Number(page) || 0, 0)));
  searchUrl.searchParams.set('size', String(safeLimit));
  searchUrl.searchParams.set('searchFields', 'label^5 synonym^3 definition');
  searchUrl.searchParams.set('boostFields', 'label^100 curie^50');
  searchUrl.searchParams.set('includeObsoleteEntities', 'false');
  if (ontologyId) searchUrl.searchParams.set('ontologyId', ontologyId);

  const response = await fetch(searchUrl, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Terminology Service search failed (${response.status}).`);
  }

  const payload = await response.json();

  return {
    terms: normalizeTerms(payload?.elements).map((term) => ({ ...term, language })),
    total: Number(payload?.totalElements) || 0,
  };
}

/** A complete, bounded ontology snapshot; partial snapshots must not masquerade as retrieval. */
export async function loadVocabularySnapshot({ ontologyId, signal, maxTerms = 1000 }) {
  if (!/^[a-z0-9_-]+$/i.test(ontologyId || '')) return null;
  const terms = [];
  const pageSize = 100;
  for (let page = 0; terms.length <= maxTerms; page += 1) {
    const url = new URL(`${TERMINOLOGY_ENTITIES_URL.replace(/\/entities$/, '')}/ontologies/${encodeURIComponent(ontologyId)}/classes`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(pageSize));
    const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const payload = await response.json();
    const batch = normalizeTerms(payload?.elements);
    if (!Array.isArray(payload?.elements)) return null;
    terms.push(...batch);
    if (Number(payload.totalElements) > maxTerms) return null;
    if (payload.elements.length < pageSize || terms.length >= Number(payload.totalElements)) break;
  }
  if (!terms.length || terms.length > maxTerms) return null;
  const fingerprint = `${ontologyId}:${terms.length}:${terms.map((term) => `${term.iri}|${term.label}|${term.definition}`).join('\n')}`;
  return { terms, fingerprint };
}
