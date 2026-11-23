import { useCallback, useEffect, useRef, useState } from 'react';
import { suggestMeanings } from '../services/annotationSuggestions';
import { suggestUnit } from '../services/annotationUnits';
import { annotationInputFingerprint, buildColumnAnnotationQuery, canRetrieveDescriptionMeaning } from '../services/columnAnnotationQuery';

const AUTO_DELAY_MS = 650;

/**
 * Owns automatic proposals for one table. The two providers are injectable so
 * retrieval/reranking and unit lookup can be exercised independently of the UI.
 * A request epoch protects state even if a provider ignores AbortSignal.
 */
export function useColumnAnnotationSuggestions({
  fields,
  workbookKey,
  sheetName,
  vocabularyId,
  hasTerminologyInput,
  quantityKind = '',
  language = 'en',
  suggestMeaning = suggestMeanings,
  suggestUnitForColumn = suggestUnit,
}) {
  const [review, setReview] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef({ epoch: 0, controller: null });
  const runRef = useRef(null);

  const invalidate = useCallback(() => {
    // Editing a description or switching context makes every in-flight result stale.
    requestRef.current.epoch += 1;
    requestRef.current.controller?.abort();
    setReview({});
    setLoading(false);
    setError('');
  }, []);

  const run = useCallback(async () => {
    const requestInputKey = annotationInputFingerprint({
      fields, workbookKey, sheetName,
      vocabularyId: hasTerminologyInput ? vocabularyId : '', language, quantityKind,
    });
    const epoch = ++requestRef.current.epoch;
    requestRef.current.controller?.abort();
    const controller = new AbortController();
    requestRef.current.controller = controller;
    setReview({});
    setError('');
    setLoading(true);

    try {
      for (let index = 0; index < fields.length; index += 1) {
        const field = fields[index];
        const query = buildColumnAnnotationQuery(fields, index, sheetName);
        if (!query.description.trim()) continue;

        // A failure in one provider must not hide a usable result from the other.
        const [meaningResult, unitResult] = await Promise.allSettled([
          canRetrieveDescriptionMeaning(query, hasTerminologyInput)
            ? suggestMeaning(query, { ontologyId: vocabularyId || undefined, language, signal: controller.signal })
            : Promise.resolve({ candidates: [], source: 'none', ambiguous: false }),
          field.unitUri
            ? Promise.resolve(null)
            : suggestUnitForColumn({ ...query, quantityKind, language }),
        ]);
        if (controller.signal.aborted || epoch !== requestRef.current.epoch) return;

        const meaning = meaningResult.status === 'fulfilled'
          ? meaningResult.value
          : { candidates: [], source: 'unavailable', ambiguous: false };
        const unit = unitResult.status === 'fulfilled' ? unitResult.value : null;
        const failed = [meaningResult, unitResult].find((result) => result.status === 'rejected');
        if (failed) setError(failed.reason?.message || 'Could not generate some annotations. Retry.');
        setReview((current) => ({ ...current, [index]: {
          meaning, unit, description: field.description, inputKey: requestInputKey,
          error: meaningResult.status === 'rejected' ? (meaningResult.reason?.message || 'Glossary retrieval failed.') : '',
        } }));
      }
    } catch (requestError) {
      if (requestError?.name !== 'AbortError' && epoch === requestRef.current.epoch) {
        setError(requestError?.message || 'Could not generate annotations. Retry.');
      }
    } finally {
      if (epoch === requestRef.current.epoch) setLoading(false);
    }
  }, [fields, workbookKey, hasTerminologyInput, language, quantityKind, sheetName, suggestMeaning, suggestUnitForColumn, vocabularyId]);

  // The debounce observes the semantic key, while the ref calls the newest
  // closure after unrelated renders without restarting the timer.
  runRef.current = run;
  const inputKey = annotationInputFingerprint({
    fields, workbookKey, sheetName,
    vocabularyId: hasTerminologyInput ? vocabularyId : '',
    language, quantityKind,
  });

  useEffect(() => {
    invalidate();
    if (!fields.some((field) => String(field.header || '').trim() || String(field.description || '').trim())) return undefined;
    const timer = window.setTimeout(() => runRef.current?.(), AUTO_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      requestRef.current.controller?.abort();
    };
  }, [inputKey, invalidate]);

  const dismiss = useCallback((index, part) => {
    // Meaning and unit are independent: applying or dismissing one keeps the other.
    setReview((current) => {
      const existing = current[index];
      if (!existing) return current;
      const updated = { ...existing, [part]: null };
      const next = { ...current };
      if (!updated.unit && !updated.meaning?.candidates?.length) delete next[index];
      else next[index] = updated;
      return next;
    });
  }, []);

  return { review, fingerprint: inputKey, loading, error, retry: run, invalidate, dismiss };
}
