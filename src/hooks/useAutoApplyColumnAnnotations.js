import { useCallback, useEffect, useRef, useState } from 'react';
import { autoSlotKey, selectAutoAnnotations } from '../services/annotationAutoApply';

/** Applies strong proposals once per column evidence and remembers manual overrides. */
export function useAutoApplyColumnAnnotations({
  fields, review, reviewFingerprint, memory, vocabularyId, language, localizedUnitLabels,
  workbookKey, sheetName, commitFields, dismissReviewPart,
}) {
  const [autoApplied, setAutoApplied] = useState({});
  const blockedRef = useRef(new Set());
  const pendingRef = useRef(null);
  const context = { workbookKey, sheetName, vocabularyId };
  const contextKey = JSON.stringify([workbookKey, sheetName, vocabularyId]);

  const markManual = useCallback((index, kind) => {
    const field = fields[index];
    if (!field) return;
    blockedRef.current.add(autoSlotKey(context, field, index, kind));
    setAutoApplied((current) => {
      if (!current[index]?.[kind]) return current;
      return { ...current, [index]: { ...current[index], [kind]: null } };
    });
  }, [fields, workbookKey, sheetName, vocabularyId]);

  useEffect(() => {
    const beforeKey = JSON.stringify(fields.map((field) => [field.descriptionUri, field.unitUri, field.unit]));
    if (pendingRef.current) {
      if (pendingRef.current.contextKey === contextKey && pendingRef.current.beforeKey === beforeKey) return;
      pendingRef.current = null;
    }

    const nextFields = [...fields];
    const byIndex = {};
    const applied = [];
    fields.forEach((field, index) => {
      if (!field.header?.trim() && !field.description?.trim()) return;
      const result = review[index]?.inputKey === reviewFingerprint && review[index]?.description === field.description
        ? review[index] : null;
      const selected = selectAutoAnnotations(field, result, memory, { vocabularyId, language, localizedUnitLabels });
      const meaningKey = autoSlotKey(context, field, index, 'meaning');
      const unitKey = autoSlotKey(context, field, index, 'unit');
      const meaning = !blockedRef.current.has(meaningKey) ? selected.meaning : null;
      const unit = !blockedRef.current.has(unitKey) ? selected.unit : null;
      if (!meaning && !unit) return;

      const updated = { ...field };
      const labels = {};
      if (meaning) {
        updated.descriptionUri = meaning.choice.uri || meaning.choice.iri;
        updated.descriptionLanguage = meaning.choice.language || language;
        labels.meaningLabel = meaning.choice.label;
        applied.push({ index, kind: 'meaning', uri: updated.descriptionUri, label: meaning.choice.label, key: meaningKey });
      }
      if (unit) {
        updated.unit = unit.choice.label;
        updated.unitUri = unit.choice.uri || unit.choice.unit;
        updated.unitLanguage = unit.choice.language || unit.choice.labelLanguage || language;
        labels.unitLabel = unit.choice.label;
        applied.push({ index, kind: 'unit', uri: updated.unitUri, label: unit.choice.label, key: unitKey });
      }
      nextFields[index] = updated;
      byIndex[index] = labels;
    });
    if (!applied.length) return;

    // Wait for the parent to publish this batch before considering later results.
    pendingRef.current = { contextKey, beforeKey };
    commitFields(nextFields, { byIndex });
    applied.forEach(({ index, kind }) => dismissReviewPart(index, kind));
    setAutoApplied((current) => {
      const next = { ...current };
      applied.forEach(({ index, kind, uri, label, key }) => {
        next[index] = { ...next[index], [kind]: { uri, label, key } };
      });
      return next;
    });
  }, [fields, review, reviewFingerprint, memory, vocabularyId, language, localizedUnitLabels, workbookKey, sheetName, commitFields, dismissReviewPart, contextKey]);

  const getAutoApplied = useCallback((index, kind) => {
    const field = fields[index];
    const applied = autoApplied[index]?.[kind];
    if (!field || !applied || applied.key !== autoSlotKey(context, field, index, kind)) return null;
    return (kind === 'meaning' ? field.descriptionUri : field.unitUri) === applied.uri ? applied : null;
  }, [autoApplied, fields, workbookKey, sheetName, vocabularyId]);

  return { getAutoApplied, markManual };
}
