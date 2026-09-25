/**
 * Node for editing metadata about each detected spreadsheet column.
 * Descriptions can be typed or assigned from TerminologyNode, units are
 * assigned from UnitNode, and every change is sent upward for RDF serialization.
 */
import { useCallback } from 'react';
import tabularSchemaIcon from '../assets/tabular_schema.png';
import NodeHandle from './NodeHandle';
import NodeInfoButton from './NodeInfoButton';

const UNIT_DRAG_MIME_TYPE = 'application/tabulatrdm-unit';
const TERM_DRAG_MIME_TYPE = 'application/tabulatrdm-term';

export default function ColumnDescriptionNode({ id, data, selected, onFieldsChange }) {
  const fields = Array.isArray(data.fields) ? data.fields : [];
  const hasFields = fields.length > 0;

  const handleDescriptionChange = useCallback(
    (index, description, descriptionUri = '', descriptionLanguage = '') => {
      const nextFields = fields.map((field, fieldIndex) =>
        fieldIndex === index
          ? { ...field, description, descriptionUri, descriptionLanguage }
          : field,
      );
      onFieldsChange(id, nextFields);
    },
    [fields, id, onFieldsChange],
  );

  const handleUnitChange = useCallback(
    (index, unit, unitUri = '', unitLanguage = '') => {
      const nextFields = fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, unit, unitUri, unitLanguage } : field,
      );
      onFieldsChange(id, nextFields);
    },
    [fields, id, onFieldsChange],
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
        );
      } catch {
        // Ignore malformed internal drag payloads.
      }
    },
    [handleDescriptionChange],
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
      <NodeHandle type="target" />
      <div className="column-description-node__header">
        <img src={tabularSchemaIcon} alt="" className="column-description-node__icon" />
        <p className="column-description-node__title">{data.label}</p>
      </div>

      {hasFields ? (
        <div className="column-description-node__table-wrap">
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
                      onDragOver={handleDropTargetDragOver}
                      onDrop={(event) => handleDescriptionDrop(event, index)}
                      title={field.descriptionUri || undefined}
                      placeholder="Type or drag a terminology concept"
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
                      readOnly
                      onDragOver={handleDropTargetDragOver}
                      onDrop={(event) => handleUnitDrop(event, index)}
                      title={field.unitUri || undefined}
                      placeholder="Drag a unit from Units"
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

      <p className="column-description-node__status">
        {hasFields ? 'Column descriptions are saved as RDF automatically' : 'No RDF to save yet'}
      </p>

      <NodeInfoButton
        nodeType={data.infoNodeType || 'columnDescription'}
        language={data.language}
      />
      <NodeHandle type="source" />
    </div>
  );
}
