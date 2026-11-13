import { useCallback, useEffect, useRef, useState } from 'react';
import { searchConceptOptions, searchUnitOptions } from '../services/annotationAutocomplete';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const MAX_OPTIONS = 8;

/** Manual concept/unit search for the currently focused field. */
export function useAnnotationAutocomplete({
  fields, hasTerminologyInput, unitInput, vocabularyId, language,
  searchConcepts = searchConceptOptions, searchUnits = searchUnitOptions,
}) {
  const [activeField, setActiveField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (!activeField) {
      setSuggestions([]);
      setLoading(false);
      setError('');
      return undefined;
    }
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      setSuggestions([]);
      setLoading(false);
      setError('');
      return undefined;
    }
    const query = String(fields[activeField.index]?.[activeField.kind] ?? '').trim();
    const connected = activeField.kind === 'description' ? hasTerminologyInput : true;
    if (query.length < MIN_QUERY_LENGTH || !connected) {
      setSuggestions([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      const request = activeField.kind === 'description'
        ? searchConcepts(query, { language, vocabularyId, limit: MAX_OPTIONS, signal: controller.signal })
        : searchUnits(query, { language, quantityKindFilter: unitInput?.quantityKindFilter || '' });
      request.then((results) => {
        if (!controller.signal.aborted) setSuggestions(results.slice(0, MAX_OPTIONS));
      }).catch((requestError) => {
        if (!controller.signal.aborted && requestError?.name !== 'AbortError') {
          setSuggestions([]);
          setError(requestError?.message || 'Could not load suggestions.');
        }
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, DEBOUNCE_MS);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activeField, fields, hasTerminologyInput, language, searchConcepts, searchUnits, unitInput, vocabularyId]);

  const begin = useCallback((index, kind) => {
    const enabled = kind === 'description' ? hasTerminologyInput : true;
    setActiveField(enabled ? { index, kind } : null);
  }, [hasTerminologyInput, unitInput]);

  const markApplied = useCallback(() => {
    // The field stays active, but its just-committed label should not reopen results.
    skipNextSearch.current = true;
    setSuggestions([]);
  }, []);

  return { activeField, suggestions, loading, error, begin, close: () => setActiveField(null), markApplied };
}
