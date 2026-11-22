/**
 * Source node for selecting a tabular file from disk. It reads the file as an
 * ArrayBuffer and passes it to App.jsx for workbook parsing and propagation.
 */
import { useCallback, useRef, useState } from 'react';
import tabularFileIcon from '../assets/tabular-file-icon.png';
import NodeHandle from './NodeHandle';
import NodeInfoButton from './NodeInfoButton';

const supportedFileName = /\.(csv|tsv|txt|xls|xlsx|xlsm|xlsb|ods|html|htm)$/i;

export default function TabularFileNode({
  id,
  data,
  selected,
  onTabularLoaded,
  onHasHeaderChange,
  onTransposeChange,
  onRdfConversionChange,
}) {
  const fileInputRef = useRef(null);
  const fileDragDepthRef = useRef(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [error, setError] = useState('');

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const loadFile = useCallback(
    async (file) => {
      setIsLoading(true);
      setError('');

      try {
        const content = await file.arrayBuffer();
        onTabularLoaded(
          id,
          file.name,
          content,
          data.hasHeaderManuallySet ? data.hasHeader === true : undefined,
          data.transposeManuallySet ? data.transpose === true : undefined,
        );
      } catch (readError) {
        console.error(readError);
        setError('Could not read this tabular file');
      } finally {
        setIsLoading(false);
      }
    },
    [data.hasHeader, data.hasHeaderManuallySet, data.transpose, data.transposeManuallySet, id, onTabularLoaded],
  );

  const handleFileChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file) {
        void loadFile(file);
      }
      event.target.value = '';
    },
    [loadFile],
  );

  const hasDraggedFiles = (event) =>
    Array.from(event.dataTransfer.types ?? []).includes('Files') ||
    event.dataTransfer.files?.length > 0;

  const handleFileDragEnter = (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    fileDragDepthRef.current += 1;
    setIsDraggingFile(true);
  };

  const handleFileDragOver = (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleFileDragLeave = (event) => {
    if (fileDragDepthRef.current === 0) return;
    event.stopPropagation();
    fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1);
    if (fileDragDepthRef.current === 0) {
      setIsDraggingFile(false);
    }
  };

  const handleFileDrop = (event) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    fileDragDepthRef.current = 0;
    setIsDraggingFile(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!supportedFileName.test(file.name)) {
      setError('Drop a CSV, TSV, Excel, ODS, or HTML table file.');
      return;
    }

    void loadFile(file);
  };

  return (
    <div
      className={`tabular-file-node${selected ? ' selected' : ''}${isDraggingFile ? ' tabular-file-node--drop-target' : ''}`}
      onDragEnter={handleFileDragEnter}
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
    >
      <NodeHandle type="target" />
      <div className="tabular-file-node__header">
        <img src={tabularFileIcon} alt="" className="tabular-file-node__icon" />
        <p className="tabular-file-node__title">{data.label}</p>
      </div>
      <button type="button" className="tabular-file-node__button" onClick={openFilePicker}>
        {isLoading ? 'Reading...' : 'Select tabular file'}
      </button>
      <p className="tabular-file-node__drop-hint">or drop a CSV or spreadsheet here</p>
      {data.fileName ? (
        <label className="tabular-file-node__header-option nodrag">
          <input
            type="checkbox"
            checked={data.hasHeader === true}
            onChange={(event) => onHasHeaderChange(id, event.target.checked)}
          />
          Table has column headers
        </label>
      ) : null}
      <details className="tabular-file-node__advanced nodrag">
        <summary>Advanced options</summary>
        <label className="tabular-file-node__header-option nodrag">
          <input
            type="checkbox"
            checked={data.transpose === true}
            onChange={(event) => onTransposeChange(id, event.target.checked)}
          />
          Rotate rows into columns (stop at empty row or column-count change)
        </label>
      </details>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xls,.xlsx,.xlsm,.xlsb,.ods,.html,.htm,text/csv,text/tab-separated-values,text/html,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet"
        className="tabular-file-node__input"
        onChange={handleFileChange}
      />
      {data.fileName ? (
        <p className="tabular-file-node__meta">{data.fileName}</p>
      ) : (
        <p className="tabular-file-node__meta">No tabular file loaded</p>
      )}
      {data.rdfConversionState === 'queued' || data.rdfConversionState === 'running' ? (
        <div className="tabular-file-node__conversion" role="status" aria-live="polite">
          <div className="tabular-file-node__conversion-label">
            <span>Converting data to RDF in background</span>
            <span>{data.rdfConversionProgress || 0}%</span>
          </div>
          <progress max="100" value={data.rdfConversionProgress || 0} />
        </div>
      ) : null}
      {data.rdfConversionState === 'complete' ? (
        <p className="tabular-file-node__conversion-status">RDF conversion complete.</p>
      ) : null}
      {data.rdfConversionError ? (
        <p className="tabular-file-node__conversion-error">{data.rdfConversionError}</p>
      ) : null}
      {error ? <p className="tabular-file-node__meta">{error}</p> : null}
      <NodeInfoButton nodeType="tabularFile" language={data.language} />
      <NodeHandle
        type="source"
        connectsTo={['Preview Tabular Data', 'Column Descriptions', 'RO-Crate']}
      />
    </div>
  );
}
