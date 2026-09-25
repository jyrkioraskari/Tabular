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

function normalizeTerm(entity) {
  const types = Array.isArray(entity?.type)
    ? entity.type.filter((type) => type && type !== 'entity')
    : [];

  return {
    iri: firstText(entity?.iri),
    label: firstText(entity?.label) || firstText(entity?.shortForm) || firstText(entity?.iri),
    definition: firstText(entity?.definition),
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
