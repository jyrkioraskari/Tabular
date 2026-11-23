/** Column annotation editor. Suggestions and their review live in separate modules. */
import { useCallback, useEffect, useRef, useState } from 'react';
import tabularSchemaIcon from '../assets/tabular_schema.png';
import { useColumnAnnotationSuggestions } from '../hooks/useColumnAnnotationSuggestions';
import { useAnnotationAutocomplete } from '../hooks/useAnnotationAutocomplete';
import { useColumnAnnotationMemory } from '../hooks/useColumnAnnotationMemory';
import ColumnAnnotationReview from './ColumnAnnotationReview';
import ColumnAnnotationMemoryControls from './ColumnAnnotationMemoryControls';
import { findRememberedAnnotations } from '../services/annotationMemory';
import NodeHandle from './NodeHandle';
import NodeInfoButton from './NodeInfoButton';

const UNIT_DRAG_MIME_TYPE = 'application/tabulatrdm-unit';
const TERM_DRAG_MIME_TYPE = 'application/tabulatrdm-term';

export default function ColumnDescriptionNode({ id, data, selected, onFieldsChange }) {
  const fields = Array.isArray(data.fields) ? data.fields : [];
  const hasFields = fields.length > 0;
  const hasTerminologyInput = data.terminologyInput === true;
  const unitInput = data.unitInput ?? null;
  const language = data.language ?? 'en';
  const vocabularyId = data.selectedVocabularyId || '';
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [mobileReviewOpen, setMobileReviewOpen] = useState(false);
  const reviewButtonsRef = useRef([]);
  const workspaceRef = useRef(null);
  useEffect(() => {
    setSelectedColumn(null);
    setMobileReviewOpen(false);
  }, [data.workbookKey]);
  const openReview = (index) => {
    setSelectedColumn(index);
    setMobileReviewOpen(true);
    window.requestAnimationFrame(() => workspaceRef.current?.querySelector('[aria-label^="Review "][role="region"]')?.focus());
  };
  const closeReview = () => {
    setMobileReviewOpen(false);
    window.requestAnimationFrame(() => reviewButtonsRef.current[selectedColumn]?.focus());
  };
  const {
    activeField,
    suggestions,
    loading: isLoadingSuggestions,
    error: suggestionError,
    begin: beginFieldSearch,
    close: closeFieldSearch,
    markApplied: markSearchApplied,
  } = useAnnotationAutocomplete({ fields, hasTerminologyInput, unitInput, vocabularyId, language });
  const {
    rememberAnnotations, storageError, annotationMemory, localizedUnitLabels,
    groupSettings, groupBusy, groupError, availableMemory,
    commitFields, handleRememberChange,
    changeGroupSettings, refreshGroupChoices, shareSavedChoices,
  } = useColumnAnnotationMemory({ id, fields, onFieldsChange, language, vocabularyId, workbookKey: data.workbookKey });
  const {
    review,
    fingerprint: reviewFingerprint,
    loading: reviewLoading,
    error: reviewError,
    retry: runAnnotationSuggestions,
    invalidate: invalidateReview,
    dismiss: dismissReviewPart,
  } = useColumnAnnotationSuggestions({
    fields,
    workbookKey: data.workbookKey,
    sheetName: data.sheetName,
    vocabularyId,
    hasTerminologyInput,
    quantityKind: unitInput?.quantityKindFilter || '',
    language,
  });

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

  const applyMeaning = useCallback((index, candidate) => {
    const field = fields[index];
    if (!field || review[index]?.inputKey !== reviewFingerprint || review[index]?.description !== field.description || (field.descriptionUri && field.descriptionUri === candidate.iri)) return;
    // Preserve the researcher's description; only the concept link changes.
    commitFields(fields.map((item, position) => position === index
      ? { ...item, descriptionUri: candidate.iri, descriptionLanguage: candidate.language || language }
      : item), { meaningLabel: candidate.label });
  }, [fields, review, reviewFingerprint, commitFields, language]);

  const applyUnit = useCallback((index, suggestion) => {
    const field = fields[index];
    if (!field || review[index]?.inputKey !== reviewFingerprint || review[index]?.description !== field.description || (field.unitUri && field.unitUri === suggestion.unit.unit)) return;
    // Unit application is independent of the meaning proposal.
    commitFields(fields.map((item, position) => position === index
      ? { ...item, unit: suggestion.unit.label, unitUri: suggestion.unit.unit, unitLanguage: suggestion.unit.labelLanguage }
      : item), { unitLabel: suggestion.unit.label });
    dismissReviewPart(index, 'unit');
  }, [fields, review, reviewFingerprint, commitFields, dismissReviewPart]);

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
      dismissReviewPart(index, 'meaning');
    } else {
      if (field.unitUri === choice.uri) return;
      commitFields(fields.map((item, position) => position === index
        ? { ...item, unit: choice.label, unitUri: choice.uri, unitLanguage: choice.language }
        : item), { unitLabel: choice.label });
      dismissReviewPart(index, 'unit');
    }
  }, [availableMemory, commitFields, dismissReviewPart, fields, language, vocabularyId]);

  const handleUnitChange = useCallback(
    (index, unit, unitUri = '', unitLanguage = '') => {
      const nextFields = fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, unit, unitUri, unitLanguage } : field,
      );
      commitFields(nextFields);
    },
    [commitFields, fields],
  );

  const applySuggestion = useCallback(
    (suggestion) => {
      if (!activeField) {
        return;
      }

      if (activeField.kind === 'description') {
        handleDescriptionChange(
          activeField.index,
          fields[activeField.index]?.description || suggestion.payload.description,
          suggestion.payload.descriptionUri,
          suggestion.payload.descriptionLanguage,
          { vocabularyId: suggestion.payload.vocabularyId },
        );
        dismissReviewPart(activeField.index, 'meaning');
      } else {
        handleUnitChange(
          activeField.index,
          suggestion.payload.unit,
          suggestion.payload.unitUri,
          suggestion.payload.unitLanguage,
        );
        dismissReviewPart(activeField.index, 'unit');
      }

      // Keep the field active so further typing refines the search; only the
      // immediate re-search for the committed value is skipped above.
      markSearchApplied();
    },
    [activeField, dismissReviewPart, fields, handleDescriptionChange, handleUnitChange, markSearchApplied],
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
          fields[index]?.description || term.label || term.iri || '',
          term.iri || '',
          term.language || '',
          { vocabularyId: term.ontologyId || vocabularyId },
        );
        dismissReviewPart(index, 'meaning');
      } catch {
        // Ignore malformed internal drag payloads.
      }
    },
    [dismissReviewPart, fields, handleDescriptionChange, vocabularyId],
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
        dismissReviewPart(index, 'unit');
      } catch {
        // Ignore malformed internal drag payloads.
      }
    },
    [dismissReviewPart, handleUnitChange],
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
        {hasTerminologyInput ? <small>Searching all vocabularies</small> : null}
        {reviewLoading ? <small>Suggesting annotations...</small> : null}
        {reviewError ? <p role="alert">{reviewError} <button type="button" onClick={runAnnotationSuggestions}>Retry</button></p> : null}
      </div> : null}

      <div ref={workspaceRef} className={`column-description-node__workspace${mobileReviewOpen ? ' column-description-node__workspace--review' : ''}`}>
      {hasFields ? (
        <div className={`column-description-node__table-wrap${
          fields.length > 10 ? ' column-description-node__table-wrap--scrollable nodrag nopan nowheel' : ''
        }`}>
          <table className="column-description-node__table">
            <thead>
              <tr>
                <th>Header</th>
                <th>Review</th>
                <th>Column Description</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={`${field.header || 'header'}-${index}`}>
                  <td>{field.header || `Column ${index + 1}`}</td>
                  <td><button ref={(element) => { reviewButtonsRef.current[index] = element; }} type="button" className="nodrag nopan" aria-label={`Review column ${field.header || index + 1}`} aria-current={selectedColumn === index ? 'true' : undefined} onClick={() => openReview(index)}>Review</button></td>
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
                      aria-label={`${field.header || `Column ${index + 1}`} column ${index + 1} description`}
                      onChange={(event) => handleDescriptionChange(index, event.target.value)}
                      onFocus={() => beginFieldSearch(index, 'description')}
                      onBlur={closeFieldSearch}
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
                      aria-label={`${field.header || `Column ${index + 1}`} column ${index + 1} unit`}
                      onChange={(event) => handleUnitChange(index, event.target.value)}
                      onFocus={() => beginFieldSearch(index, 'unit')}
                      onBlur={closeFieldSearch}
                      onDragOver={handleDropTargetDragOver}
                      onDrop={(event) => handleUnitDrop(event, index)}
                      title={field.unitUri || undefined}
                      placeholder={
                        'Type to search, or drag a unit'
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

      {mobileReviewOpen ? <button type="button" className="column-description-node__back nodrag nopan" onClick={closeReview}>Back to columns</button> : null}
      <ColumnAnnotationReview
        selectedIndex={selectedColumn}
        rows={data.rows || []}
        loading={reviewLoading}
        error={reviewError}
        onRetry={runAnnotationSuggestions}
        fields={fields}
        review={review}
        fingerprint={reviewFingerprint}
        memory={availableMemory}
        vocabularyId={vocabularyId}
        language={language}
        localizedUnitLabels={localizedUnitLabels}
        onApplyRemembered={applyRemembered}
        onApplyMeaning={applyMeaning}
        onApplyUnit={applyUnit}
        onDismissMeaning={() => { setSelectedColumn(null); closeReview(); }}
        onClearMeaning={(index) => { const next = fields.map((field, position) => position === index ? { ...field, descriptionUri: '', descriptionLanguage: '' } : field); commitFields(next); }}
      />
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

      <ColumnAnnotationMemoryControls
        rememberAnnotations={rememberAnnotations}
        storageError={storageError}
        annotationMemory={annotationMemory}
        groupSettings={groupSettings}
        groupBusy={groupBusy}
        groupError={groupError}
        changeGroupSettings={changeGroupSettings}
        refreshGroupChoices={refreshGroupChoices}
        shareSavedChoices={shareSavedChoices}
        handleRememberChange={handleRememberChange}
      />

      <NodeInfoButton
        nodeType={data.infoNodeType || 'columnDescription'}
        language={data.language}
      />
      <NodeHandle type="source" connectsTo={['RO-Crate']} />
    </div>
  );
}
