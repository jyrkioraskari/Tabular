/**
 * Search node for concepts exposed by the NFDI4Ing Terminology Service.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { searchTerminologyTerms } from '../services/terminologyApi';
import NodeHandle from './NodeHandle';
import NodeInfoButton from './NodeInfoButton';

export const TERMINOLOGY_LOGO_URL =
  'https://terminology.nfdi4ing.de/ts/nfdi4ing_updated_logo.png';

const SEARCH_DEBOUNCE_MS = 400;
const TERM_DRAG_MIME_TYPE = 'application/tabulatrdm-term';

export default function TerminologyNode({ id, data, selected }) {
  const abortControllerRef = useRef(null);
  const [searchText, setSearchText] = useState(data.defaultQuery ?? '');
  const [terms, setTerms] = useState([]);
  const [selectedTermIri, setSelectedTermIri] = useState('');
  const [status, setStatus] = useState('Enter a term to search.');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const language = data.language ?? 'en';

  const runSearch = useCallback(async (query) => {
    const trimmedQuery = query.trim();

    abortControllerRef.current?.abort();

    if (!trimmedQuery) {
      setTerms([]);
      setSelectedTermIri('');
      setStatus('Enter a term to search.');
      setError('');
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsLoading(true);
    setError('');
    setStatus('Searching terminology...');

    try {
      const result = await searchTerminologyTerms({
        query: trimmedQuery,
        language,
        limit: data.limit,
        signal: abortController.signal,
      });

      setTerms(result.terms);
      setSelectedTermIri((currentIri) =>
        result.terms.some((term) => term.iri === currentIri) ? currentIri : '',
      );
      setStatus(
        result.total > result.terms.length
          ? `Showing ${result.terms.length} of ${result.total} matches.`
          : result.terms.length === 1
            ? '1 terminology match found.'
            : `${result.terms.length} terminology matches found.`,
      );
    } catch (searchError) {
      if (searchError?.name === 'AbortError') {
        return;
      }

      setTerms([]);
      setSelectedTermIri('');
      setStatus('');
      setError(searchError?.message || 'Unable to search the Terminology Service.');
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }, [data.limit, language]);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    runSearch(searchText);
  }, [runSearch, searchText]);

  useEffect(() => {
    const trimmedQuery = searchText.trim();

    if (!trimmedQuery) {
      abortControllerRef.current?.abort();
      setTerms([]);
      setSelectedTermIri('');
      setStatus('Enter a term to search.');
      setError('');
      setIsLoading(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => runSearch(trimmedQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [runSearch, searchText]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  return (
    <div className={`terminology-node${selected ? ' selected' : ''}`}>
      <NodeHandle type="target" />
      <div className="terminology-node__header">
        <img src={TERMINOLOGY_LOGO_URL} alt="" className="terminology-node__icon" />
        <p className="terminology-node__title">{data.label}</p>
      </div>

      <form className="terminology-node__form nodrag nopan" onSubmit={handleSubmit}>
        <label className="terminology-node__label" htmlFor={`terminology-search-${id}`}>
          Search concepts
        </label>
        <div className="terminology-node__controls">
          <input
            id={`terminology-search-${id}`}
            type="search"
            className="terminology-node__input"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="e.g. stress"
          />
          <button type="submit" className="terminology-node__button" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {status ? <p className="terminology-node__status">{status}</p> : null}
      {error ? <p className="terminology-node__error">{error}</p> : null}

      <div className="terminology-node__results nodrag nopan nowheel">
        {terms.length > 0 ? (
          <ul>
            {terms.map((term) => {
              const isSelected = term.iri === selectedTermIri;
              const ontologyLabel = term.ontologyPrefix || term.ontologyId || 'Ontology';

              return (
                <li key={term.iri}>
                  <button
                    type="button"
                    draggable
                    className={`terminology-node__result-button${isSelected ? ' selected' : ''}`}
                    onClick={() => setSelectedTermIri(term.iri)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onDragStart={(event) => {
                      event.stopPropagation();
                      event.dataTransfer.setData(TERM_DRAG_MIME_TYPE, JSON.stringify(term));
                      event.dataTransfer.setData('text/plain', term.iri);
                      event.dataTransfer.effectAllowed = 'copy';
                    }}
                  >
                    <span className="terminology-node__result-heading">
                      <span>{term.label || 'Unnamed concept'}</span>
                      <span className="terminology-node__ontology">{ontologyLabel}</span>
                    </span>
                    {term.definition ? (
                      <span className="terminology-node__definition">{term.definition}</span>
                    ) : null}
                    <span className="terminology-node__iri">{term.curie || term.iri}</span>
                  </button>
                  <a
                    className="terminology-node__link nodrag"
                    href={term.iri}
                    target="_blank"
                    rel="noreferrer"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    Open concept
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No terminology concepts listed yet.</p>
        )}
      </div>

      <NodeInfoButton nodeType="terminology" language={data.language} />
      <NodeHandle type="source" />
    </div>
  );
}

