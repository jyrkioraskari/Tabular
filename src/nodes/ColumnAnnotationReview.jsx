import { useState } from 'react';
import { findRememberedAnnotations } from '../services/annotationMemory';
import { localizeRememberedUnit } from '../services/annotationAutoApply';

function rememberedChoices(field, records, vocabularyId, language, localizedUnitLabels) {
  const remembered = findRememberedAnnotations(field, records, { vocabularyId });
  return [remembered.meaning, remembered.unit].flatMap((choice) => {
    if (!choice || (choice.kind === 'meaning' ? field.descriptionUri === choice.uri : field.unitUri === choice.uri)) return [];
    if (choice.kind === 'meaning') return [choice];

    const localized = localizeRememberedUnit(choice, language, localizedUnitLabels);
    return localized ? [localized] : [];
  });
}

/** Read-only proposal display; all annotation commits stay in the parent node. */
export default function ColumnAnnotationReview({
  fields,
  review,
  fingerprint,
  memory,
  vocabularyId,
  language,
  localizedUnitLabels,
  onApplyRemembered,
  onApplyMeaning,
  onApplyUnit,
  onDismissMeaning,
}) {
  const [expanded, setExpanded] = useState({});

  return (
    <div
      className="column-description-node__proposal-scroll nodrag nopan nowheel"
      role="region"
      aria-label="Annotation suggestions"
      tabIndex={0}
    >
      {fields.map((field, index) => {
        const choices = rememberedChoices(field, memory, vocabularyId, language, localizedUnitLabels);
        return choices.length ? (
          <section key={`remembered-${index}`} className="column-description-node__review nodrag nopan">
            <strong>{field.header || `Column ${index + 1}`}: previously used on a similar column</strong>
            {choices.map((choice) => (
              <div key={`${choice.kind}-${choice.uri}`} className="column-description-node__review-candidate">
                <span>{choice.kind === 'meaning' ? 'Meaning' : 'Unit'}: {choice.label || choice.uri}</span>
                <p>{choice.source === 'group' ? 'Shared by your group' : 'Saved in this browser'} for “{choice.header}”{choice.description ? ` — “${choice.description}”` : ''}</p>
                <button type="button" onClick={() => onApplyRemembered(index, choice)}>
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
        // A description edit invalidates the evidence even before a new run finishes.
        if (!field || result.inputKey !== fingerprint || result.description !== field.description) return null;
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
                <button type="button" disabled={field.descriptionUri === candidate.iri} onClick={() => onApplyMeaning(index, candidate)}>
                  {field.descriptionUri ? 'Replace meaning' : 'Apply meaning'}
                </button>
              </div>
            ))}
            {candidates.length > 1 && !expanded[index] ? (
              <button type="button" onClick={() => setExpanded((current) => ({ ...current, [index]: true }))}>See alternatives</button>
            ) : null}
            {candidates.length ? <button type="button" onClick={() => onDismissMeaning(index)}>Leave unresolved</button> : null}
            {result.unit ? (
              <div>
                <b>Unit</b>
                <div>
                  <span>{result.unit.unit.label} — {result.unit.reason}</span>{' '}
                  <button type="button" disabled={field.unitUri === result.unit.unit.unit} onClick={() => onApplyUnit(index, result.unit)}>
                    {field.unitUri ? 'Replace unit' : 'Apply unit'}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
