/**
 * Node that packages connected metadata and tabular sheet exports into an
 * RO-Crate ZIP. It reads optional dataset settings from an export_config sheet.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import rdfstoreScriptUrl from 'rdfstore/dist/rdfstore.js?url';
import roCrateLogo from '../assets/RO-Crate.png';
import { createROCratePackage } from '../services/roCrateExport';
import NodeHandle from './NodeHandle';
import NodeInfoButton from './NodeInfoButton';

let rdfstoreScriptPromise = null;

function loadRdfstoreScript() {
  if (window.rdfstore) {
    return Promise.resolve(window.rdfstore);
  }

  if (!rdfstoreScriptPromise) {
    rdfstoreScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = rdfstoreScriptUrl;
      script.async = true;
      script.onload = () =>
        window.rdfstore
          ? resolve(window.rdfstore)
          : reject(new Error('Rdfstore-js loaded without exposing window.rdfstore.'));
      script.onerror = () => reject(new Error('Unable to load the RDF store.'));
      document.head.appendChild(script);
    });
  }

  return rdfstoreScriptPromise;
}

async function createRdfStore() {
  const rdfstore = await loadRdfstoreScript();

  return new Promise((resolve, reject) => {
    rdfstore.create((error, store) => (error ? reject(error) : resolve(store)));
  });
}

function clearStore(store) {
  return new Promise((resolve, reject) => {
    store.clear((error) => (error ? reject(error) : resolve()));
  });
}

function loadRdf(store, content) {
  return new Promise((resolve, reject) => {
    store.load('text/turtle', content, (error, count) =>
      error ? reject(error) : resolve(count ?? 0),
    );
  });
}

export default function ROCrateNode({ data, selected }) {
  const storeRef = useRef(null);
  const [storeReady, setStoreReady] = useState(false);
  const [tripleCount, setTripleCount] = useState(0);
  const [rdfStatus, setRdfStatus] = useState('Starting RDF store...');
  const [rdfError, setRdfError] = useState('');
  const turtleContent = data.jsonLdContent?.jsonLd?.trim() || '';

  useEffect(() => {
    let isActive = true;

    createRdfStore()
      .then((store) => {
        if (isActive) {
          storeRef.current = store;
          setStoreReady(true);
          setRdfStatus('RDF store ready.');
        }
      })
      .catch((error) => {
        if (isActive) {
          setRdfError(error?.message || 'Unable to start the RDF store.');
          setRdfStatus('');
        }
      });

    return () => {
      isActive = false;
      storeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!storeRef.current) {
      return;
    }

    let isActive = true;

    const updateStore = async () => {
      try {
        await clearStore(storeRef.current);

        if (!turtleContent) {
          if (isActive) {
            setTripleCount(0);
            setRdfError('');
            setRdfStatus('Waiting for RDF from a connected node.');
          }
          return;
        }

        setRdfStatus('Loading RDF...');
        setRdfError('');
        const count = await loadRdf(storeRef.current, turtleContent);

        if (isActive) {
          setTripleCount(count);
          setRdfStatus(`Loaded ${count} triple${count === 1 ? '' : 's'}.`);
        }
      } catch (error) {
        if (isActive) {
          setTripleCount(0);
          setRdfError(error?.message || 'Unable to load RDF content.');
          setRdfStatus('');
        }
      }
    };

    updateStore();
    return () => {
      isActive = false;
    };
  }, [storeReady, turtleContent]);

  /**
   * Implements the RO-Crate download template:
   * metadata.ttl contains connected Turtle RDF, workbook sheets become CSV files,
   * and export_config can override dataset metadata.
   */
  const handleCrateDownload = useCallback(async () => {
    if (!data.jsonLdContent?.jsonLd) {
      return;
    }

    const cratePackage = await createROCratePackage({
      jsonLdContent: data.jsonLdContent,
      sheets: data.sheets,
    });
    const url = URL.createObjectURL(cratePackage.blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = cratePackage.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [data.jsonLdContent, data.sheets]);

  const canDownload = Boolean(data.jsonLdContent?.jsonLd);

  const downloadTurtle = useCallback(() => {
    if (!turtleContent) {
      return;
    }

    const blob = new Blob([turtleContent], { type: 'text/turtle;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'metadata.ttl';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [turtleContent]);

  return (
    <div className={`ro-crate-node${selected ? ' selected' : ''}`}>
      <NodeHandle type="target" />
      <div className="ro-crate-node__header">
        <img src={roCrateLogo} alt="" className="ro-crate-node__icon" />
        <p className="ro-crate-node__title">{data.label}</p>
      </div>
      <p className="rdf-node__count">{tripleCount} triples in RO-Crate</p>
      <button
        type="button"
        className="ro-crate-node__button nodrag"
        disabled={!turtleContent}
        onClick={downloadTurtle}
      >
        Download Turtle
      </button>
      <div className="rdf-node__preview">
        <p className="rdf-node__preview-title">Turtle Preview</p>
        {turtleContent ? (
          <pre className="rdf-node__preview-content nowheel">{turtleContent}</pre>
        ) : (
          <p className="rdf-node__preview-empty">No Turtle content loaded yet.</p>
        )}
      </div>
      {rdfStatus ? <p className="ro-crate-node__status">{rdfStatus}</p> : null}
      {rdfError ? <p className="rdf-node__error">{rdfError}</p> : null}
      <button
        type="button"
        className="ro-crate-node__button nodrag"
        disabled={!canDownload}
        onClick={handleCrateDownload}
      >
        Download RO-Crate
      </button>
      <NodeInfoButton nodeType="roCrate" language={data.language} />
      <NodeHandle type="source" />
    </div>
  );
}
