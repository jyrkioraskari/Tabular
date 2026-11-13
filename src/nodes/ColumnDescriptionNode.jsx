/**
 * Node for editing metadata about each detected spreadsheet column.
 * Descriptions can be typed or assigned from TerminologyNode, units are
 * assigned from UnitNode, and every change is sent upward for RDF serialization.
 * When a Terminology Service or Units node is connected, the description and
 * unit fields also offer type-to-search autocomplete next to drag-and-drop.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import tabularSchemaIcon from '../assets/tabular_schema.png';
import { searchTerminologyTerms } from '../services/terminologyApi';
import { queryUnits } from '../services/qudtService';
import { suggestMeanings } from '../services/annotationSuggestions';
import { localizedUnitRows, suggestUnit } from '../services/annotationUnits';
import {
  ANNOTATION_MEMORY_EVENT,
  clearAnnotationMemory,
  clearAnnotationMemoryForNode,
  findRememberedAnnotations,
  readAnnotationMemory,
  rememberAnnotationChoice,
} from '../services/annotationMemory';
import {
  loadGroupAnnotations,
  readGroupMemorySettings,
  shareGroupAnnotations,
  writeGroupMemorySettings,
} from '../services/groupAnnotationMemory';
import {
  deleteBrowserDraft,
  readBrowserDraft,
  writeBrowserDraft,
} from '../services/browserDrafts';
import NodeHandle from './NodeHandle';
import NodeInfoButton from './NodeInfoButton';

const UNIT_DRAG_MIME_TYPE = 'application/tabulatrdm-unit';
const TERM_DRAG_MIME_TYPE = 'application/tabulatrdm-term';

const SUGGESTION_DEBOUNCE_MS = 300;
const ANNOTATION_AUTO_DELAY_MS = 650;
const MIN_SUGGESTION_QUERY_LENGTH = 2;
const MAX_SUGGESTIONS = 8;
const annotationDraftStoragePrefix = 'tabular-rdm.column-annotations-draft.v1';
const ANNOTATION_SAVE_DELAY_MS = 400;

export default function ColumnDescriptionNode({ id, data, selected, onFieldsChange }) {
  const fields = Array.isArray(data.fields) ? data.fields : [];
  const hasFields = fields.length > 0;
  const hasTerminologyInput = data.terminologyInput === true;
  const unitInput = data.unitInput ?? null;
  const language = data.language ?? 'en';
  const storageKey = `${annotationDraftStoragePrefix}:${id}`;
  const [storedDraft, setStoredDraft] = useState(() => readBrowserDraft(storageKey));
  const rememberAnnotations = storedDraft?.enabled === true;
  const [storageError, setStorageError] = useState('');
  const [annotationMemory, setAnnotationMemory] = useState(readAnnotationMemory);
  const [localizedUnitLabels, setLocalizedUnitLabels] = useState({ language: '', labels: {} });
  const [groupSettings, setGroupSettings] = useState(readGroupMemorySettings);
  const [groupMemory, setGroupMemory] = useState([]);
  const [groupMemoryCode, setGroupMemoryCode] = useState('');
  const [groupError, setGroupError] = useState('');
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupRefresh, setGroupRefresh] = useState(0);
  const saveTimerRef = useRef(null);
  const pendingFieldsRef = useRef(null);
  const restoredHeadersRef = useRef(null);
  // { index, kind: 'description' | 'unit' } of the field the user is typing in.
  const [activeField, setActiveField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  // Suppresses the immediate re-search that follows a suggestion commit, so the
  // panel does not reopen with results for the just-inserted value.
  const skipSuggestionSearchRef = useRef(false);
  const vocabularyId = data.selectedVocabularyId || '';
  const visibleGroupMemory = groupSettings.enabled && groupSettings.code === groupMemoryCode ? groupMemory : [];
  const visibleBrowserMemory = rememberAnnotations ? annotationMemory : [];
  const availableMemory = [...visibleBrowserMemory.map((item) => ({ ...item, source: 'browser' })), ...visibleGroupMemory.map((item) => ({ ...item, source: 'group' }))];
  const [review, setReview] = useState({});
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [expanded, setExpanded] = useState({});
  const reviewRequestRef = useRef({ epoch: 0, controller: null });
  const runSuggestionsRef = useRef(null);

  const invalidateReview = useCallback(() => {
    reviewRequestRef.current.epoch += 1;
    reviewRequestRef.current.controller?.abort();
    setReview({});
    setReviewLoading(false);
    setReviewError('');
  }, []);

  useEffect(() => {
    const refresh = () => setAnnotationMemory(readAnnotationMemory());
    window.addEventListener(ANNOTATION_MEMORY_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ANNOTATION_MEMORY_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (![...visibleBrowserMemory, ...visibleGroupMemory].some((item) => item.kind === 'unit')) return undefined;
    let active = true;
    queryUnits().then((units) => {
      if (active) {
        setLocalizedUnitLabels({
          language,
          labels: Object.fromEntries(localizedUnitRows(units, language).map((unit) => [unit.unit, { label: unit.label, language: unit.labelLanguage }])),
        });
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [annotationMemory, groupMemory, groupMemoryCode, groupSettings.enabled, groupSettings.code, language, rememberAnnotations]);

  useEffect(() => {
    if (!groupSettings.enabled || groupSettings.code.length < 12) {
      setGroupMemory([]);
      setGroupMemoryCode('');
      return undefined;
    }
    const controller = new AbortController();
    setGroupBusy(true);
    setGroupError('');
    loadGroupAnnotations(groupSettings.code, controller.signal)
      .then((records) => { setGroupMemory(records); setGroupMemoryCode(groupSettings.code); })
      .catch((error) => {
        if (error?.name !== 'AbortError') setGroupError(error?.message || 'Could not load shared choices.');
      })
      .finally(() => { if (!controller.signal.aborted) setGroupBusy(false); });
    return () => controller.abort();
  }, [groupSettings.enabled, groupSettings.code, groupRefresh, data.workbookKey]);

  const changeGroupSettings = useCallback((next) => {
    try {
      writeGroupMemorySettings(next);
      setGroupSettings(next);
      setGroupError('');
    } catch {
      setGroupError('Group settings could not be saved in this browser.');
    }
  }, []);

  const saveAnnotations = useCallback((nextFields) => {
    const draft = {
      enabled: true,
      headers: nextFields.map((field) => field.header),
      fields: nextFields,
    };

    try {
      writeBrowserDraft(storageKey, draft);
      setStoredDraft(draft);
      setStorageError('');
      return true;
    } catch {
      setStorageError('Column annotations could not be saved in this browser.');
      return false;
    }
  }, [storageKey]);

  const flushPendingAnnotations = useCallback(() => {
    window.clearTimeout(saveTimerRef.current);
    if (pendingFieldsRef.current) {
      saveAnnotations(pendingFieldsRef.current);
      pendingFieldsRef.current = null;
    }
  }, [saveAnnotations]);

  useEffect(() => {
    if (!rememberAnnotations || !hasFields) return;

    const headers = fields.map((field) => field.header);
    const headersKey = JSON.stringify(headers);
    if (restoredHeadersRef.current === headersKey) return;
    restoredHeadersRef.current = headersKey;

    if (
      JSON.stringify(storedDraft?.headers) !== headersKey ||
      !Array.isArray(storedDraft?.fields) ||
      fields.some((field) => field.description || field.descriptionUri || field.unit || field.unitUri)
    ) {
      return;
    }

    const restoredFields = fields.map((field, index) => ({
      ...field,
      description: storedDraft.fields[index]?.description ?? '',
      descriptionUri: storedDraft.fields[index]?.descriptionUri ?? '',
      descriptionLanguage: storedDraft.fields[index]?.descriptionLanguage ?? '',
      unit: storedDraft.fields[index]?.unit ?? '',
      unitUri: storedDraft.fields[index]?.unitUri ?? '',
      unitLanguage: storedDraft.fields[index]?.unitLanguage ?? '',
    }));
    onFieldsChange(id, restoredFields);
  }, [fields, hasFields, id, onFieldsChange, rememberAnnotations, storedDraft]);

  useEffect(() => {
    if (!rememberAnnotations) return undefined;
    const onPageHide = () => flushPendingAnnotations();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      flushPendingAnnotations();
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flushPendingAnnotations, rememberAnnotations]);

  const commitFields = useCallback((nextFields, selectionMeta = {}) => {
    const newChoices = [];
    nextFields.forEach((next, index) => {
        const previous = fields[index] || {};
        const source = { header: next.header, description: previous.description || next.description };
        if (next.descriptionUri && next.descriptionUri !== previous.descriptionUri) {
          const choice = { ...source, kind: 'meaning', uri: next.descriptionUri,
            label: selectionMeta.meaningLabel || next.description,
            language: next.descriptionLanguage || language,
            vocabularyId: selectionMeta.vocabularyId || vocabularyId,
          };
          newChoices.push(choice);
          if (rememberAnnotations) {
            try { rememberAnnotationChoice({ ...choice, originNodeId: id }); }
            catch { setStorageError('Applied annotation could not be remembered in this browser.'); }
          }
        }
        if (next.unitUri && next.unitUri !== previous.unitUri) {
          const choice = { ...source, kind: 'unit', uri: next.unitUri,
            label: selectionMeta.unitLabel || next.unit,
            language: next.unitLanguage || language,
          };
          newChoices.push(choice);
          if (rememberAnnotations) {
            try { rememberAnnotationChoice({ ...choice, originNodeId: id }); }
            catch { setStorageError('Applied annotation could not be remembered in this browser.'); }
          }
        }
    });
    if (groupSettings.enabled && groupSettings.code.length >= 12 && newChoices.length) {
      shareGroupAnnotations(groupSettings.code, newChoices)
        .then((records) => { setGroupMemory(records); setGroupMemoryCode(groupSettings.code); setGroupError(''); })
        .catch((error) => setGroupError(error?.message || 'Could not share the applied choice.'));
    }
    onFieldsChange(id, nextFields);
    if (rememberAnnotations) {
      pendingFieldsRef.current = nextFields;
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(flushPendingAnnotations, ANNOTATION_SAVE_DELAY_MS);
    }
  }, [fields, flushPendingAnnotations, groupSettings, id, language, onFieldsChange, rememberAnnotations, vocabularyId]);

  const removeSavedAnnotations = useCallback(() => {
    window.clearTimeout(saveTimerRef.current);
    pendingFieldsRef.current = null;
    try {
      deleteBrowserDraft(storageKey);
      clearAnnotationMemoryForNode(id);
      setStoredDraft(null);
      setStorageError('');
    } catch {
      setStorageError('Saved annotations could not be removed from this browser.');
    }
  }, [id, storageKey]);

  const handleRememberChange = useCallback((event) => {
    if (event.target.checked) {
      restoredHeadersRef.current = JSON.stringify(fields.map((field) => field.header));
      if (saveAnnotations(fields)) {
        try {
          fields.forEach((field) => {
            const source = { header: field.header, description: field.description, originNodeId: id };
            if (field.descriptionUri) rememberAnnotationChoice({ ...source, kind: 'meaning', uri: field.descriptionUri, label: field.description || field.descriptionUri, language: field.descriptionLanguage || language, vocabularyId });
            if (field.unitUri) rememberAnnotationChoice({ ...source, kind: 'unit', uri: field.unitUri, label: field.unit || field.unitUri, language: field.unitLanguage || language });
          });
        } catch {
          setStorageError('Existing choices could not be remembered in this browser.');
        }
      }
    } else {
      removeSavedAnnotations();
    }
  }, [fields, id, language, removeSavedAnnotations, saveAnnotations, vocabularyId]);

  const handleDescriptionChange = useCallback(
    (index, description, descriptionUri = '', descriptionLanguage = '', selectionMeta = {}) => {
      if (description !== fields[index]?.description) invalidateReview();
      const nextFields = fields.map((field, fieldIndex) =>
        fieldIndex === index
          ? { ...field, description, descriptionUri, descriptionLanguage }
          : field,
      );
      commitFields(nextFields, selectionMeta);
    },
    [commitFields, fields, invalidateReview],
  );

  const runAnnotationSuggestions = useCallback(async () => {
    const epoch = ++reviewRequestRef.current.epoch;
    reviewRequestRef.current.controller?.abort();
    const controller = new AbortController();
    reviewRequestRef.current.controller = controller;
    setReview({});
    setReviewError('');
    setReviewLoading(true);
    try {
      for (let index = 0; index < fields.length; index += 1) {
        const field = fields[index];
        if (!String(field.description || '').trim() && !String(field.header || '').trim()) continue;
        const query = {
          description: field.description,
          header: field.header,
          sheetName: data.sheetName || '',
          neighboringHeaders: [fields[index - 1]?.header, fields[index + 1]?.header].filter(Boolean),
          notes: field.notes || '',
        };
        const [meaningResult, unitResult] = await Promise.allSettled([
          hasTerminologyInput && vocabularyId && !field.descriptionUri
            ? suggestMeanings(query, { ontologyId: vocabularyId, language, signal: controller.signal })
            : Promise.resolve({ candidates: [], source: 'none', ambiguous: false }),
          field.unitUri
            ? Promise.resolve(null)
            : suggestUnit({ ...query, quantityKind: unitInput?.quantityKindFilter || '', language }),
        ]);
        if (controller.signal.aborted || epoch !== reviewRequestRef.current.epoch) return;
        const meaning = meaningResult.status === 'fulfilled'
          ? meaningResult.value
          : { candidates: [], source: 'unavailable', ambiguous: false };
        const unit = unitResult.status === 'fulfilled' ? unitResult.value : null;
        const failed = [meaningResult, unitResult].find((result) => result.status === 'rejected');
        if (failed) setReviewError(failed.reason?.message || 'Could not generate some annotations. Retry.');
        setReview((current) => ({
          ...current,
          [index]: { meaning, unit, description: field.description },
        }));
      }
    } catch (error) {
      if (error?.name !== 'AbortError' && epoch === reviewRequestRef.current.epoch) {
        setReviewError(error?.message || 'Could not generate annotations. Retry.');
      }
    } finally {
      if (epoch === reviewRequestRef.current.epoch) setReviewLoading(false);
    }
  }, [fields, data.sheetName, hasTerminologyInput, vocabularyId, language, unitInput]);

  runSuggestionsRef.current = runAnnotationSuggestions;
  const suggestionInputKey = JSON.stringify({
    workbookKey: data.workbookKey,
    sheetName: data.sheetName,
    vocabularyId: hasTerminologyInput ? vocabularyId : '',
    language,
    quantityKind: unitInput?.quantityKindFilter || '',
    columns: fields.map((field) => [field.header, field.description, field.notes]),
  });

  useEffect(() => {
    invalidateReview();
    if (!fields.some((field) => String(field.header || '').trim() || String(field.description || '').trim())) return undefined;
    const timer = window.setTimeout(() => runSuggestionsRef.current?.(), ANNOTATION_AUTO_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      reviewRequestRef.current.controller?.abort();
    };
  }, [suggestionInputKey, invalidateReview]);

  const dismissReviewPart = useCallback((index, part) => {
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

  const applyMeaning = useCallback((index, candidate) => {
    const field = fields[index];
    if (!field || review[index]?.description !== field.description || (field.descriptionUri && field.descriptionUri === candidate.iri)) return;
    commitFields(fields.map((item, position) => position === index
      ? { ...item, descriptionUri: candidate.iri, descriptionLanguage: candidate.language || language }
      : item), { meaningLabel: candidate.label });
    dismissReviewPart(index, 'meaning');
  }, [fields, review, commitFields, language, dismissReviewPart]);

  const applyUnit = useCallback((index, suggestion) => {
    const field = fields[index];
    if (!field || review[index]?.description !== field.description || (field.unitUri && field.unitUri === suggestion.unit.unit)) return;
    commitFields(fields.map((item, position) => position === index
      ? { ...item, unit: suggestion.unit.label, unitUri: suggestion.unit.unit, unitLanguage: suggestion.unit.labelLanguage }
      : item), { unitLabel: suggestion.unit.label });
    dismissReviewPart(index, 'unit');
  }, [fields, review, commitFields, dismissReviewPart]);

  const applyRemembered = useCallback((index, choice) => {
    const field = fields[index];
    if (!field || (!field.description?.trim() && !field.header?.trim())) return;
    const current = findRememberedAnnotations(field, availableMemory, { vocabularyId });
    if (current[choice.kind]?.uri !== choice.uri) return;
    if (choice.kind === 'meaning') {
      if (field.descriptionUri === choice.uri) return;
      commitFields(fields.map((item, position) => position === index
        ? { ...item, descriptionUri: choice.uri, descriptionLanguage: choice.language || language }
        : item), { meaningLabel: choice.label });
    } else {
      if (field.unitUri === choice.uri) return;
      commitFields(fields.map((item, position) => position === index
        ? { ...item, unit: choice.label, unitUri: choice.uri, unitLanguage: choice.language }
        : item), { unitLabel: choice.label });
    }
  }, [availableMemory, commitFields, fields, language, vocabularyId]);

  const handleUnitChange = useCallback(
    (index, unit, unitUri = '', unitLanguage = '') => {
      const nextFields = fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, unit, unitUri, unitLanguage } : field,
      );
      commitFields(nextFields);
    },
    [commitFields, fields],
  );

  const fetchTerminologySuggestions = useCallback(
    async (query, signal) => {
      const { terms } = await searchTerminologyTerms({
        query,
        language,
        ontologyId: vocabularyId || undefined,
        limit: MAX_SUGGESTIONS,
        signal,
      });

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
    },
    [language, vocabularyId],
  );

  // The QUDT store is cached after the first load, so suggestions are filtered
  // client-side. A quantity kind filter from the connected Units node narrows
  // the results; when it excludes everything, text matches are still offered.
  const fetchUnitSuggestions = useCallback(
    async (query) => {
      const units = await queryUnits();
      const normalizedQuery = query.toLocaleLowerCase();
      const quantityKindFilter = unitInput?.quantityKindFilter || '';
      const textMatches = localizedUnitRows(units, language).filter(
        (unit) =>
          unit.label.toLocaleLowerCase().includes(normalizedQuery),
      );
      const filteredMatches = quantityKindFilter
        ? textMatches.filter((unit) => unit.quantityKinds?.includes(quantityKindFilter))
        : textMatches;

      return (filteredMatches.length > 0 ? filteredMatches : textMatches).map((unit) => ({
        key: `${unit.unit}\n${unit.label}\n${unit.labelLanguage}`,
        label: unit.label || unit.unit,
        secondary: unit.unit.replace(/^.*[/#]/, ''),
        payload: {
          unit: unit.label || unit.unit,
          unitUri: unit.unit,
          unitLanguage: unit.labelLanguage,
        },
      }));
    },
    [language, unitInput],
  );

  useEffect(() => {
    if (!activeField) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      setSuggestionError('');
      return undefined;
    }

    if (skipSuggestionSearchRef.current) {
      skipSuggestionSearchRef.current = false;
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      setSuggestionError('');
      return undefined;
    }

    const field = fields[activeField.index];
    const query = String(field?.[activeField.kind] ?? '').trim();
    const serviceConnected =
      activeField.kind === 'description' ? hasTerminologyInput : Boolean(unitInput);

    if (query.length < MIN_SUGGESTION_QUERY_LENGTH || !serviceConnected) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      setSuggestionError('');
      return undefined;
    }

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      setIsLoadingSuggestions(true);
      setSuggestionError('');

      const request =
        activeField.kind === 'description'
          ? fetchTerminologySuggestions(query, controller.signal)
          : fetchUnitSuggestions(query);

      request
        .then((results) => {
          setSuggestions(results.slice(0, MAX_SUGGESTIONS));
        })
        .catch((error) => {
          if (error?.name !== 'AbortError') {
            setSuggestions([]);
            setSuggestionError(error?.message || 'Could not load suggestions.');
          }
        })
        .finally(() => {
          setIsLoadingSuggestions(false);
        });
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    activeField,
    fetchTerminologySuggestions,
    fetchUnitSuggestions,
    fields,
    hasTerminologyInput,
    unitInput,
  ]);

  const applySuggestion = useCallback(
    (suggestion) => {
      if (!activeField) {
        return;
      }

      if (activeField.kind === 'description') {
        handleDescriptionChange(
          activeField.index,
          suggestion.payload.description,
          suggestion.payload.descriptionUri,
          suggestion.payload.descriptionLanguage,
          { vocabularyId: suggestion.payload.vocabularyId },
        );
      } else {
        handleUnitChange(
          activeField.index,
          suggestion.payload.unit,
          suggestion.payload.unitUri,
          suggestion.payload.unitLanguage,
        );
      }

      // Keep the field active so further typing refines the search; only the
      // immediate re-search for the committed value is skipped above.
      skipSuggestionSearchRef.current = true;
      setSuggestions([]);
    },
    [activeField, handleDescriptionChange, handleUnitChange],
  );

  const beginFieldSearch = useCallback(
    (index, kind) => {
      const enabled = kind === 'description' ? hasTerminologyInput : Boolean(unitInput);
      setActiveField(enabled ? { index, kind } : null);
    },
    [hasTerminologyInput, unitInput],
  );

  const handleDropTargetDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDescriptionDrop = useCallback(
    (event, index) => {
      const rawTerm = event.dataTransfer.getData(TERM_DRAG_MIME_TYPE);

      if (!rawTerm) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      try {
        const term = JSON.parse(rawTerm);
        handleDescriptionChange(
          index,
          term.label || term.iri || '',
          term.iri || '',
          term.language || '',
          { vocabularyId: term.ontologyId || vocabularyId },
        );
      } catch {
        // Ignore malformed internal drag payloads.
      }
    },
    [handleDescriptionChange, vocabularyId],
  );

  const handleUnitDrop = useCallback(
    (event, index) => {
      // Only accept the structured payload emitted by Unit nodes so a dragged
      // terminology concept cannot accidentally be assigned as a unit.
      const rawUnit = event.dataTransfer.getData(UNIT_DRAG_MIME_TYPE);

      if (!rawUnit) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      try {
        const unit = JSON.parse(rawUnit);
        handleUnitChange(
          index,
          unit.label || unit.uri || '',
          unit.uri || '',
          unit.language || '',
        );
      } catch {
        // Ignore malformed internal drag payloads.
      }
    },
    [handleUnitChange],
  );

  return (
    <div className={`column-description-node${selected ? ' selected' : ''}`}>
      <NodeHandle
        type="target"
        accepts={['Tabular file', 'Terminology Service', 'Units']}
      />
      <div className="column-description-node__header">
        <img src={tabularSchemaIcon} alt="" className="column-description-node__icon" />
        <p className="column-description-node__title">{data.label}</p>
      </div>

      {hasTerminologyInput || reviewLoading || reviewError ? <div className="column-description-node__review-controls nodrag nopan">
        {hasTerminologyInput ? <small>Selected vocabulary: {vocabularyId || 'choose one in Terminology Service'}</small> : null}
        {reviewLoading ? <small>Suggesting annotations...</small> : null}
        {reviewError ? <p role="alert">{reviewError} <button type="button" onClick={runAnnotationSuggestions}>Retry</button></p> : null}
      </div> : null}

      {hasFields ? (
        <div className={`column-description-node__table-wrap${
          fields.length > 10 ? ' column-description-node__table-wrap--scrollable nodrag nopan nowheel' : ''
        }`}>
          <table className="column-description-node__table">
            <thead>
              <tr>
                <th>Header</th>
                <th>Column Description</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={`${field.header || 'header'}-${index}`}>
                  <td>{field.header || `Column ${index + 1}`}</td>
                  <td
                    className="column-description-node__description-cell"
                    onDragOver={handleDropTargetDragOver}
                    onDrop={(event) => handleDescriptionDrop(event, index)}
                  >
                    <input
                      type="text"
                      className={`column-description-node__input${
                        field.descriptionUri ? ' column-description-node__linked-input' : ''
                      }`}
                      value={field.description ?? ''}
                      onChange={(event) => handleDescriptionChange(index, event.target.value)}
                      onFocus={() => beginFieldSearch(index, 'description')}
                      onBlur={() => setActiveField(null)}
                      onDragOver={handleDropTargetDragOver}
                      onDrop={(event) => handleDescriptionDrop(event, index)}
                      title={field.descriptionUri || undefined}
                      placeholder={
                        hasTerminologyInput
                          ? 'Type to search, or drag a concept'
                          : 'Type or drag a terminology concept'
                      }
                    />
                  </td>
                  <td
                    className="column-description-node__unit-cell"
                    onDragOver={handleDropTargetDragOver}
                    onDrop={(event) => handleUnitDrop(event, index)}
                  >
                    <input
                      type="text"
                      className="column-description-node__input column-description-node__unit-input"
                      value={field.unit ?? ''}
                      readOnly={!unitInput}
                      onChange={(event) => handleUnitChange(index, event.target.value)}
                      onFocus={() => beginFieldSearch(index, 'unit')}
                      onBlur={() => setActiveField(null)}
                      onDragOver={handleDropTargetDragOver}
                      onDrop={(event) => handleUnitDrop(event, index)}
                      title={field.unitUri || undefined}
                      placeholder={
                        unitInput ? 'Type to search, or drag a unit' : 'Drag a unit from Units'
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="column-description-node__empty">No headers available</p>
      )}

      <div
        className="column-description-node__proposal-scroll nodrag nopan nowheel"
        role="region"
        aria-label="Annotation suggestions"
        tabIndex={0}
      >
      {fields.map((field, index) => {
        const remembered = findRememberedAnnotations(field, availableMemory, { vocabularyId });
        const choices = [remembered.meaning, remembered.unit].flatMap((choice) => {
          if (!choice || (choice.kind === 'meaning' ? field.descriptionUri === choice.uri : field.unitUri === choice.uri)) return [];
          if (choice.kind === 'meaning') return [choice];
          const localized = localizedUnitLabels.language === language ? localizedUnitLabels.labels[choice.uri] : null;
          const storedLanguageAllowed = /^de(?:-|$)/i.test(language)
            ? /^(?:de|en)(?:-|$)/i.test(choice.language || '')
            : /^en(?:-|$)/i.test(choice.language || '');
          const label = localized?.label || (storedLanguageAllowed ? choice.label : '');
          const labelLanguage = localized?.language || choice.language;
          return label ? [{ ...choice, label, language: labelLanguage }] : [];
        });
        return choices.length ? (
          <section key={`remembered-${index}`} className="column-description-node__review nodrag nopan">
            <strong>{field.header || `Column ${index + 1}`}: previously used on a similar column</strong>
            {choices.map((choice) => (
              <div key={`${choice.kind}-${choice.uri}`} className="column-description-node__review-candidate">
                <span>{choice.kind === 'meaning' ? 'Meaning' : 'Unit'}: {choice.label || choice.uri}</span>
                <p>{choice.source === 'group' ? 'Shared by your group' : 'Saved in this browser'} for “{choice.header}”{choice.description ? ` — “${choice.description}”` : ''}</p>
                <button type="button" onClick={() => applyRemembered(index, choice)}>
                  {choice.kind === 'meaning'
                    ? field.descriptionUri ? 'Replace meaning' : 'Apply meaning'
                    : field.unitUri ? 'Replace unit' : 'Apply unit'}
                </button>
              </div>
            ))}
          </section>
        ) : null;
      })}

      {Object.entries(review).map(([indexText, result]) => {
        const index = Number(indexText);
        const field = fields[index];
        if (!field || result.description !== field.description) return null;
        const candidates = result.meaning?.candidates || [];
        if (!candidates.length && !result.unit) return null;
        const visible = expanded[index] ? candidates : candidates.slice(0, 1);
        return (
          <section key={index} className="column-description-node__review nodrag nopan">
            <strong>{field.header || `Column ${index + 1}`}</strong>
            {candidates.length ? <div><b>Meaning</b> <small>{result.meaning.source}</small></div> : null}
            {candidates.length && (result.meaning.ambiguous || candidates.length > 1) ? <p>Choose a meaning</p> : null}
            {visible.map((candidate) => (
              <div key={candidate.iri} className="column-description-node__review-candidate">
                <strong>{candidate.label}</strong>
                <p>{candidate.definition || 'No definition supplied by vocabulary.'}</p>
                <p>{candidate.reason}</p>
                <button type="button" disabled={field.descriptionUri === candidate.iri} onClick={() => applyMeaning(index, candidate)}>{field.descriptionUri ? 'Replace meaning' : 'Apply meaning'}</button>
              </div>
            ))}
            {candidates.length > 1 && !expanded[index] ? <button type="button" onClick={() => setExpanded((current) => ({ ...current, [index]: true }))}>See alternatives</button> : null}
            {candidates.length ? <button type="button" onClick={() => dismissReviewPart(index, 'meaning')}>Leave unresolved</button> : null}
            {result.unit ? (
              <div>
                <b>Unit</b>
                <div><span>{result.unit.unit.label} — {result.unit.reason}</span>{' '}<button type="button" disabled={field.unitUri === result.unit.unit.unit} onClick={() => applyUnit(index, result.unit)}>{field.unitUri ? 'Replace unit' : 'Apply unit'}</button></div>
              </div>
            ) : null}
          </section>
        );
      })}
      </div>

      {activeField &&
      (suggestions.length > 0 || isLoadingSuggestions || suggestionError) ? (
        <div className="column-description-node__suggestions nodrag nopan" role="listbox">
          {suggestionError ? (
            <p className="column-description-node__suggestion-status">
              {suggestionError}
            </p>
          ) : isLoadingSuggestions ? (
            <p className="column-description-node__suggestion-status">Searching...</p>
          ) : (
            <ul>
              {suggestions.map((suggestion) => (
                <li key={suggestion.key}>
                  <button
                    type="button"
                    className="column-description-node__suggestion"
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => applySuggestion(suggestion)}
                  >
                    <span className="column-description-node__suggestion-label">
                      {suggestion.label}
                    </span>
                    <span className="column-description-node__suggestion-secondary">
                      {suggestion.secondary}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {unitInput?.quantityKindLabel ? (
        <p className="column-description-node__status">
          Unit suggestions filtered by {unitInput.quantityKindLabel}
        </p>
      ) : null}

      <div className="column-description-node__browser-storage nodrag">
        <div className="column-description-node__group-memory">
          <strong
            className="column-description-node__memory-heading"
            title="People using this Tabular server can share choices with the same group code. Turning this on shares new selections, including their column descriptions. Anyone with the code can see them."
            tabIndex={0}
          >Memory</strong>
          <label>Group code <input type="text" value={groupSettings.code} onChange={(event) => changeGroupSettings({ enabled: false, code: event.target.value.trim() })} placeholder="Enter or generate a group code" /></label>
          <button type="button" onClick={() => changeGroupSettings({ enabled: false, code: globalThis.crypto.randomUUID() })}>Generate code</button>
          <label><input type="checkbox" checked={groupSettings.enabled} disabled={groupSettings.code.length < 12} onChange={(event) => changeGroupSettings({ ...groupSettings, enabled: event.target.checked })} /> Use shared group memory</label>
          {groupSettings.enabled ? (
            <div>
              <button type="button" disabled={groupBusy} onClick={() => setGroupRefresh((value) => value + 1)}>Refresh shared choices</button>
              <button type="button" disabled={groupBusy || !rememberAnnotations || !annotationMemory.length} onClick={() => {
                setGroupBusy(true);
                shareGroupAnnotations(groupSettings.code, annotationMemory)
                  .then((records) => { setGroupMemory(records); setGroupMemoryCode(groupSettings.code); setGroupError(''); })
                  .catch((error) => setGroupError(error?.message || 'Could not share browser choices.'))
                  .finally(() => setGroupBusy(false));
              }}>Share my saved choices</button>
              {groupBusy ? <span>Loading shared choices...</span> : null}
            </div>
          ) : null}
          {groupError ? <p role="alert">{groupError}</p> : null}
        </div>
        {rememberAnnotations && annotationMemory.length ? (
          <button type="button" onClick={() => {
            try { clearAnnotationMemory(); setStorageError(''); }
            catch { setStorageError('Remembered choices could not be cleared.'); }
          }}>Clear remembered choices</button>
        ) : null}
        <label
          className="column-description-node__remember"
          title="Unchecking deletes saved annotations from this browser."
        >
          <input
            type="checkbox"
            checked={rememberAnnotations}
            onChange={handleRememberChange}
            aria-description="Unchecking deletes saved annotations from this browser."
          />
          Remember column annotations in this browser
        </label>
        {rememberAnnotations ? (
          <button type="button" onClick={removeSavedAnnotations}>
            Delete saved browser copy
          </button>
        ) : null}
        {storageError ? <p role="alert">{storageError}</p> : null}
      </div>

      <NodeInfoButton
        nodeType={data.infoNodeType || 'columnDescription'}
        language={data.language}
      />
      <NodeHandle type="source" connectsTo={['RO-Crate']} />
    </div>
  );
}
