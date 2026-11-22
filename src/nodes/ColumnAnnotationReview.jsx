import { findRememberedAnnotations } from '../services/annotationMemory';

/** Comparison stays independent of retrieval and annotation persistence. */
export function CandidateComparison({ candidates, field, onAccept }) {
  if (!candidates.length) return <p>No matching glossary terms were returned. Manual annotation remains available in the table.</p>;
  return <div className="column-description-node__candidate-list">
    {candidates.map((candidate) => {
      const candidateUnit = typeof candidate.unitLabel === 'string' ? candidate.unitLabel
        : typeof candidate.unit === 'string' ? candidate.unit : '';
      const recordedUnit = field.unit || '';
      return <article key={candidate.iri} className="column-description-node__review-candidate">
        <dl>
          <dt>Preferred label</dt><dd>{candidate.label || 'Not supplied'}</dd>
          <dt>Definition</dt><dd>{candidate.definition || 'Not supplied'}</dd>
          <dt>Vocabulary</dt><dd>{candidate.ontologyPrefix || candidate.ontologyId || 'Not supplied'}</dd>
          <dt>Identifier</dt><dd>{/^https?:\/\//i.test(candidate.iri || '') ? <a href={candidate.iri} target="_blank" rel="noreferrer">{candidate.curie || candidate.iri}</a> : candidate.curie || candidate.iri || 'Not supplied'}</dd>
          <dt>Evidence</dt><dd>{candidate.reason
            ? <>Column description: “{field.description}”<br />{candidate.supported === false ? 'Conflicting or insufficient evidence' : 'Supporting evidence'}: {candidate.reason}</>
            : 'No candidate-specific explanation available.'}</dd>
          <dt>Unit comparison</dt><dd>{candidateUnit && recordedUnit
            ? candidateUnit === recordedUnit ? `Recorded ${recordedUnit}; candidate ${candidateUnit}` : `Conflict: recorded ${recordedUnit}; candidate ${candidateUnit}`
            : `Missing candidate unit${recordedUnit ? `; recorded ${recordedUnit}` : ' and recorded unit'}`}</dd>
        </dl>
        <button type="button" disabled={field.descriptionUri === candidate.iri || candidate.supported === false} onClick={() => onAccept(candidate)}>
          {field.descriptionUri === candidate.iri ? 'Accepted term' : field.descriptionUri ? `Replace with ${candidate.label}` : `Accept ${candidate.label}`}
        </button>
      </article>;
    })}
  </div>;
}

export default function ColumnAnnotationReview({
  selectedIndex, rows, loading, error, onRetry, fields, review, fingerprint,
  memory, vocabularyId, onApplyRemembered, onApplyMeaning, onApplyUnit,
  onDismissMeaning, onClearMeaning,
}) {
  const field = fields[selectedIndex];
  if (!field) return <aside className="column-description-node__proposal-scroll nodrag nopan" aria-label="Column review"><p>Select a column to review its glossary terms.</p></aside>;
  const result = review[selectedIndex];
  const current = result?.inputKey === fingerprint && result.description === field.description ? result : null;
  const remembered = findRememberedAnnotations(field, memory, { vocabularyId });
  const choices = [remembered.meaning, remembered.unit].filter((choice) => choice && (choice.kind === 'meaning' ? field.descriptionUri !== choice.uri : field.unitUri !== choice.uri));
  const values = rows.map((row) => row?.[selectedIndex]).filter((value) => value !== '' && value != null).slice(0, 5);
  return <aside className="column-description-node__proposal-scroll nodrag nopan nowheel" role="region" aria-label={`Review ${field.header || `column ${selectedIndex + 1}`}`} tabIndex={0}>
    <h3>Which term fits this column, and why?</h3>
    <section className="column-description-node__review">
      <h4>Source column</h4>
      <dl>
        <dt>Original header</dt><dd>{field.header || '(blank)'}</dd>
        <dt>Description</dt><dd>{field.description || 'Not supplied'}</dd>
        <dt>Recorded unit</dt><dd>{field.unit || 'Not supplied'}</dd>
        <dt>Representative values</dt><dd>{values.length ? values.map((value, index) => <span key={index}>{index ? ', ' : ''}{String(value)}</span>) : 'Not available'}</dd>
      </dl>
    </section>
    <section className="column-description-node__review">
      <h4>Decision</h4>
      <p>{field.descriptionUri ? <>Accepted identifier: <code>{field.descriptionUri}</code></> : 'Unresolved'}</p>
      {field.descriptionUri ? <button type="button" onClick={() => onClearMeaning(selectedIndex)}>Clear accepted term</button> : null}
      <button type="button" onClick={onDismissMeaning}>Leave unresolved and return to columns</button>
    </section>
    <section className="column-description-node__review">
      <h4>Candidate terms</h4>
      {!String(field.description || '').trim() ? <p>Add a description to retrieve glossary suggestions. Manual annotation remains available in the table.</p>
        : !vocabularyId ? <p>Choose a vocabulary to retrieve glossary suggestions.</p>
          : current?.error ? <p role="alert">Glossary retrieval failed: {current.error} <button type="button" onClick={onRetry}>Retry glossary retrieval</button></p>
            : current ? <><p>Source: {current.meaning?.source || 'Glossary'}</p><CandidateComparison candidates={current.meaning?.candidates || []} field={field} onAccept={(candidate) => onApplyMeaning(selectedIndex, candidate)} /></>
              : loading ? <p role="status">Searching glossary terms…</p>
                : error ? <p role="alert">Glossary retrieval failed: {error} <button type="button" onClick={onRetry}>Retry glossary retrieval</button></p>
                  : <p>Glossary suggestions are pending.</p>}
    </section>
    {current?.unit ? <section className="column-description-node__review"><h4>Suggested unit</h4><p>{current.unit.unit.label}: {current.unit.reason}</p><button type="button" disabled={field.unitUri === current.unit.unit.unit} onClick={() => onApplyUnit(selectedIndex, current.unit)}>Accept suggested unit</button></section> : null}
    {choices.length ? <section className="column-description-node__review"><h4>Previously used choices</h4>{choices.map((choice) => <div key={`${choice.kind}-${choice.uri}`}><p>{choice.kind}: {choice.label || choice.uri}</p><button type="button" onClick={() => onApplyRemembered(selectedIndex, choice)}>Accept {choice.label || choice.uri}</button></div>)}</section> : null}
  </aside>;
}
