/** Preview, validate, and download Turtle received from connected RDF nodes. */
import { useCallback, useEffect, useRef, useState } from 'react';
import rdfLogo from '../assets/250px-Rdf_logo.svg.png';
import { parseTurtleStore } from '../services/turtleStore';
import NodeHandle from './NodeHandle';
import NodeInfoButton from './NodeInfoButton';

export default function RDFStoreNode({ data, selected }) {
  const storeRef = useRef(null);
  const [tripleCount, setTripleCount] = useState(0);
  const [loadedTurtle, setLoadedTurtle] = useState('');
  const [error, setError] = useState('');
  const connectedInput = data.rdfInput || '';

  useEffect(() => {
    const turtle = connectedInput.trim();
    if (!turtle) {
      storeRef.current = null;
      setTripleCount(0);
      setLoadedTurtle('');
      setError('');
      return;
    }

    try {
      // A fresh store prevents triples from an earlier input surviving a reload.
      const nextStore = parseTurtleStore(turtle);
      storeRef.current = nextStore;
      setTripleCount(nextStore.size);
      setLoadedTurtle(turtle);
      setError('');
    } catch (parseError) {
      storeRef.current = null;
      setTripleCount(0);
      setLoadedTurtle('');
      setError(parseError?.message || 'Unable to load RDF content.');
    }
  }, [connectedInput]);

  const downloadTurtle = useCallback(() => {
    if (!loadedTurtle) return;
    const blob = new Blob([loadedTurtle], { type: 'text/turtle;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'metadata.ttl';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [loadedTurtle]);

  return (
    <div className={`rdf-node${selected ? ' selected' : ''}`}>
      <NodeHandle type="target" accepts={['Metadata Form', 'Column Descriptions']} />
      <div className="rdf-node__header">
        <img src={rdfLogo} alt="" className="rdf-node__icon" />
        <p className="rdf-node__title">{data.label}</p>
      </div>
      <p className="rdf-node__count">{tripleCount} triples in store</p>
      <button type="button" className="rdf-node__button nodrag" disabled={!loadedTurtle} onClick={downloadTurtle}>
        Download Turtle
      </button>
      <div className="rdf-node__preview">
        <p className="rdf-node__preview-title">Turtle Preview</p>
        {loadedTurtle ? (
          <pre className="rdf-node__preview-content nowheel">{loadedTurtle}</pre>
        ) : (
          <p className="rdf-node__preview-empty">No Turtle content loaded yet.</p>
        )}
      </div>
      {!connectedInput ? <p className="rdf-node__status">Connect an RDF-producing node and press Save.</p> : null}
      {error ? <p className="rdf-node__error">{error}</p> : null}
      <NodeInfoButton nodeType="rdfStore" language={data.language} />
      <NodeHandle type="source" connectsTo={['RO-Crate']} />
    </div>
  );
}
