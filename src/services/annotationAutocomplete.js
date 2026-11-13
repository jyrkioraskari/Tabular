import { searchTerminologyTerms } from './terminologyApi.js';
import { queryUnits } from './qudtService.js';
import { localizedUnitRows } from './annotationUnits.js';

/** Adapters for manual type-to-search; both return the same display shape. */
export async function searchConceptOptions(query, { language, vocabularyId, limit, signal, search = searchTerminologyTerms }) {
  const { terms } = await search({ query, language, ontologyId: vocabularyId || undefined, limit, signal });
  return terms.map((term) => ({
    key: term.iri,
    label: term.label || term.iri,
    secondary: term.curie || term.ontologyPrefix || term.iri,
    payload: {
      description: term.label || term.iri,
      descriptionUri: term.iri,
      descriptionLanguage: term.language || language || '',
      vocabularyId: term.ontologyId || vocabularyId,
    },
  }));
}

export async function searchUnitOptions(query, { language, quantityKindFilter = '', lookup = queryUnits }) {
  const units = await lookup();
  const normalizedQuery = query.toLocaleLowerCase();
  const textMatches = localizedUnitRows(units, language).filter((unit) => unit.label.toLocaleLowerCase().includes(normalizedQuery));
  const compatible = quantityKindFilter
    ? textMatches.filter((unit) => unit.quantityKinds?.includes(quantityKindFilter))
    : textMatches;
  // Keep text matches available when the connected quantity kind is too narrow.
  return (compatible.length ? compatible : textMatches).map((unit) => ({
    key: `${unit.unit}\n${unit.label}\n${unit.labelLanguage}`,
    label: unit.label || unit.unit,
    secondary: unit.unit.replace(/^.*[/#]/, ''),
    payload: { unit: unit.label || unit.unit, unitUri: unit.unit, unitLanguage: unit.labelLanguage },
  }));
}
