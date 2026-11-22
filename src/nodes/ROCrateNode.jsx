/**
 * Node that packages connected metadata and tabular sheet exports into an
 * RO-Crate ZIP. It reads optional dataset settings from an export_config sheet.
 */
import { useCallback, useEffect, useState } from 'react';
import roCrateLogo from '../assets/RO-Crate.png';
<<<<<<< HEAD
import { configuredDatasetLicense, createROCratePackage } from '../services/roCrateExport';
=======
import { createROCratePackage } from '../services/roCrateExport';
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
import { countTurtleTriplesInWorker } from '../services/rdfTripleCountService';
import NodeHandle from './NodeHandle';
import NodeInfoButton from './NodeInfoButton';

<<<<<<< HEAD
export default function ROCrateNode({ id, data, selected, onLicenseChange }) {
  const [tripleCount, setTripleCount] = useState(0);
  const [rdfStatus, setRdfStatus] = useState('');
  const [rdfError, setRdfError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const configuredLicense = configuredDatasetLicense(data.sheets);
  const chosenLicense = configuredLicense || data.datasetLicense || '';
=======
export default function ROCrateNode({ data, selected }) {
  const [tripleCount, setTripleCount] = useState(0);
  const [rdfStatus, setRdfStatus] = useState('');
  const [rdfError, setRdfError] = useState('');
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
  const turtleContent = data.jsonLdContent?.jsonLd?.trim() || '';
  const pendingRdfInputs = data.pendingRdfInputs ?? [];
  const pendingInputNames = pendingRdfInputs.length === 1
    ? pendingRdfInputs[0].replace(/ 1$/, '')
    : pendingRdfInputs.join(', ');
  const pendingStatus = pendingRdfInputs.length > 0
    ? `Waiting for ${pendingInputNames}.`
    : '';
  const displayStatus = turtleContent
    ? [rdfStatus, pendingStatus].filter(Boolean).join(' ')
    : pendingStatus || 'Connect an input to build an RO-Crate.';

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const updateTripleCount = async () => {
      try {
        if (!turtleContent) {
          setTripleCount(0);
          setRdfError('');
          setRdfStatus('');
          return;
        }

        setRdfStatus('Checking RDF in background...');
        setRdfError('');
        const count = await countTurtleTriplesInWorker(turtleContent, {
          signal: controller.signal,
        });

        if (isActive) {
          setTripleCount(count);
          setRdfStatus('');
        }
      } catch (error) {
        if (isActive && error?.name !== 'AbortError') {
          setTripleCount(0);
          setRdfError(error?.message || 'Unable to load RDF content.');
          setRdfStatus('');
        }
      }
    };

    updateTripleCount();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [turtleContent]);

  /**
   * Implements the RO-Crate download template:
   * metadata.ttl contains connected Turtle RDF, workbook sheets become CSV files
   * with adjacent CSVW metadata, and export_config can override dataset metadata.
   */
  const handleCrateDownload = useCallback(async () => {
    if (!data.jsonLdContent?.jsonLd) {
      return;
    }

<<<<<<< HEAD
    setDownloadError('');
    try {
      const cratePackage = await createROCratePackage({
        jsonLdContent: data.jsonLdContent,
        sheets: data.sheets,
        columnDescriptions: data.csvwColumnDescriptions,
        sourceFile: data.sourceFile,
        selectedSheetName: data.selectedSheetName,
        datasetLicense: chosenLicense,
      });
      const url = URL.createObjectURL(cratePackage.blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = cratePackage.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error?.message || 'Could not create the RO-Crate.');
    }
  }, [chosenLicense, data.csvwColumnDescriptions, data.jsonLdContent, data.selectedSheetName, data.sheets, data.sourceFile]);
=======
    const cratePackage = await createROCratePackage({
      jsonLdContent: data.jsonLdContent,
      sheets: data.sheets,
      columnDescriptions: data.csvwColumnDescriptions,
      sourceFile: data.sourceFile,
    });
    const url = URL.createObjectURL(cratePackage.blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = cratePackage.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [data.csvwColumnDescriptions, data.jsonLdContent, data.sheets, data.sourceFile]);
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571

  const canDownload = Boolean(data.jsonLdContent?.jsonLd && chosenLicense);

  return (
    <div className={`ro-crate-node${selected ? ' selected' : ''}`}>
      <NodeHandle
        type="target"
        accepts={[
          'Tabular file',
          'Preview Tabular Data',
          'Column Descriptions',
          'Metadata Form',
        ]}
      />
      <div className="ro-crate-node__header">
        <img src={roCrateLogo} alt="" className="ro-crate-node__icon" />
        <p className="ro-crate-node__title">{data.label}</p>
      </div>
      <p className="rdf-node__count">{tripleCount} triples in RO-Crate</p>
      {displayStatus ? <p className="ro-crate-node__status">{displayStatus}</p> : null}
      {rdfError ? <p className="rdf-node__error">{rdfError}</p> : null}
<<<<<<< HEAD
      {configuredLicense ? (
        <p className="ro-crate-node__status">Dataset licence from export_config: {configuredLicense}</p>
      ) : (
        <label className="ro-crate-node__license nodrag">
          Dataset licence
          <select value={data.datasetLicense || ''} onChange={(event) => onLicenseChange?.(id, event.target.value)}>
            <option value="">Choose a licence</option>
            <option value="CC BY 4.0">CC BY 4.0</option>
            <option value="unspecified">Unspecified (omit licence claim)</option>
          </select>
        </label>
      )}
      {!chosenLicense ? <p className="ro-crate-node__status">Choose a dataset licence before export or upload.</p> : null}
      {downloadError ? <p className="rdf-node__error" role="alert">{downloadError}</p> : null}
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
      <button
        type="button"
        className="ro-crate-node__button nodrag"
        disabled={!canDownload}
        onClick={handleCrateDownload}
      >
        Download RO-Crate
      </button>
      <NodeInfoButton nodeType="roCrate" language={data.language} />
      <NodeHandle type="source" connectsTo={['Coscine']} />
    </div>
  );
}
