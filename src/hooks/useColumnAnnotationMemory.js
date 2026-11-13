import { useCallback, useEffect, useRef, useState } from 'react';
import { queryUnits } from '../services/qudtService';
import { localizedUnitRows } from '../services/annotationUnits';
import {
  ANNOTATION_MEMORY_EVENT, clearAnnotationMemory,
  readAnnotationMemory, rememberAnnotationChoice,
} from '../services/annotationMemory';
import {
  loadGroupAnnotations, readGroupMemorySettings, shareGroupAnnotations, writeGroupMemorySettings,
} from '../services/groupAnnotationMemory';
import { deleteBrowserDraft, readBrowserDraft, writeBrowserDraft } from '../services/browserDrafts';

const DRAFT_PREFIX = 'tabular-rdm.column-annotations-draft.v1';
const SAVE_DELAY_MS = 400;

/** Persistence and shared-choice state for a column annotation editor. */
export function useColumnAnnotationMemory({ id, fields, onFieldsChange, language, vocabularyId, workbookKey }) {
  const storageKey = `${DRAFT_PREFIX}:${id}`;
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

  const visibleGroupMemory = groupSettings.enabled && groupSettings.code === groupMemoryCode ? groupMemory : [];
  const visibleBrowserMemory = rememberAnnotations ? annotationMemory : [];
  const availableMemory = [
    ...visibleBrowserMemory.map((item) => ({ ...item, source: 'browser' })),
    ...visibleGroupMemory.map((item) => ({ ...item, source: 'group' })),
  ];

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
      if (active) setLocalizedUnitLabels({
        language,
        labels: Object.fromEntries(localizedUnitRows(units, language).map((unit) => [unit.unit, { label: unit.label, language: unit.labelLanguage }])),
      });
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
  }, [groupSettings.enabled, groupSettings.code, groupRefresh, workbookKey]);

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
    const draft = { enabled: true, headers: nextFields.map((field) => field.header), fields: nextFields };
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
    if (!rememberAnnotations || !fields.length) return;
    const headersKey = JSON.stringify(fields.map((field) => field.header));
    if (restoredHeadersRef.current === headersKey) return;
    restoredHeadersRef.current = headersKey;
    if (JSON.stringify(storedDraft?.headers) !== headersKey ||
      !Array.isArray(storedDraft?.fields) ||
      fields.some((field) => field.description || field.descriptionUri || field.unit || field.unitUri)) return;
    // Restore only onto the same headers and only when the live fields are empty.
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
  }, [fields, id, onFieldsChange, rememberAnnotations, storedDraft]);

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
    // Only newly linked URIs enter memory. Text edits still use the same RDF path.
    const newChoices = [];
    nextFields.forEach((next, index) => {
      const labels = selectionMeta.byIndex?.[index] || selectionMeta;
      const previous = fields[index] || {};
      const source = { header: next.header, description: previous.description || next.description };
      if (next.descriptionUri && next.descriptionUri !== previous.descriptionUri) newChoices.push({
        ...source, kind: 'meaning', uri: next.descriptionUri,
        label: labels.meaningLabel || next.description,
        language: next.descriptionLanguage || language,
        vocabularyId: labels.vocabularyId || vocabularyId,
      });
      if (next.unitUri && next.unitUri !== previous.unitUri) newChoices.push({
        ...source, kind: 'unit', uri: next.unitUri,
        label: labels.unitLabel || next.unit,
        language: next.unitLanguage || language,
      });
    });
    if (rememberAnnotations) newChoices.forEach((choice) => {
      try { rememberAnnotationChoice({ ...choice, originNodeId: id }); }
      catch { setStorageError('Applied annotation could not be remembered in this browser.'); }
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
      saveTimerRef.current = window.setTimeout(flushPendingAnnotations, SAVE_DELAY_MS);
    }
  }, [fields, flushPendingAnnotations, groupSettings, id, language, onFieldsChange, rememberAnnotations, vocabularyId]);

  const removeSavedAnnotations = useCallback(() => {
    window.clearTimeout(saveTimerRef.current);
    pendingFieldsRef.current = null;
    try {
      deleteBrowserDraft(storageKey);
      clearAnnotationMemory();
      setStoredDraft(null);
      setStorageError('');
    } catch {
      setStorageError('Saved annotations could not be removed from this browser.');
    }
  }, [id, storageKey]);

  const handleRememberChange = useCallback((event) => {
    if (!event.target.checked) { removeSavedAnnotations(); return; }
    restoredHeadersRef.current = JSON.stringify(fields.map((field) => field.header));
    if (!saveAnnotations(fields)) return;
    try {
      fields.forEach((field) => {
        const source = { header: field.header, description: field.description, originNodeId: id };
        if (field.descriptionUri) rememberAnnotationChoice({ ...source, kind: 'meaning', uri: field.descriptionUri, label: field.description || field.descriptionUri, language: field.descriptionLanguage || language, vocabularyId });
        if (field.unitUri) rememberAnnotationChoice({ ...source, kind: 'unit', uri: field.unitUri, label: field.unit || field.unitUri, language: field.unitLanguage || language });
      });
    } catch {
      setStorageError('Existing choices could not be remembered in this browser.');
    }
  }, [fields, id, language, removeSavedAnnotations, saveAnnotations, vocabularyId]);

  const refreshGroupChoices = useCallback(() => setGroupRefresh((value) => value + 1), []);
  const shareSavedChoices = useCallback(() => {
    setGroupBusy(true);
    shareGroupAnnotations(groupSettings.code, annotationMemory)
      .then((records) => { setGroupMemory(records); setGroupMemoryCode(groupSettings.code); setGroupError(''); })
      .catch((error) => setGroupError(error?.message || 'Could not share browser choices.'))
      .finally(() => setGroupBusy(false));
  }, [annotationMemory, groupSettings.code]);

  return {
    rememberAnnotations, storageError, annotationMemory, localizedUnitLabels,
    groupSettings, groupBusy, groupError, availableMemory,
    commitFields, handleRememberChange,
    changeGroupSettings, refreshGroupChoices, shareSavedChoices,
  };
}
