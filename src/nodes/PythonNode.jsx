/**
 * Node whose behavior the user writes in Python. The code must define
 * run(inputs, data) and return a JSON-serializable value; inputs is one entry
 * per connected upstream node (keyed by its label). Execution happens on the
 * loopback-only local server, never in the renderer. Code that arrived through
 * an imported workflow file is shown but not run until the user trusts it.
 */
import { useCallback } from 'react';
import pythonLogo from '../assets/python-logo.svg';
import { DEFAULT_PYTHON_NODE_CODE } from '../services/pythonNodeClient.js';
import { downloadJsonFile } from '../services/nodeExchange.js';
import NodeHandle from './NodeHandle';
import NodeInfoButton from './NodeInfoButton';

const PYTHON_INPUT_ACCEPTS = [
  'Tabular file',
  'Preview Tabular Data',
  'Column Descriptions',
  'Metadata Form',
  'RO-Crate',
  'Quantity Kinds',
  'Units',
  'Terminology Service',
  'Metadata Profile Search',
  'Coscine',
  'n8n community node',
];

export default function PythonNode({ data, selected, onCodeChange, onRun, onTrust }) {
  const code = typeof data.code === 'string' && data.code.trim() ? data.code : DEFAULT_PYTHON_NODE_CODE;
  const trusted = data.trusted !== false;
  const status = data.pythonStatus || '';
  const error = data.pythonError || '';
  const output = data.pythonOutput;
  const hasOutput = output !== undefined && output !== null;
  const outputPreview = hasOutput ? JSON.stringify(output, null, 2) : '';

  const handleDownloadOutput = useCallback(() => {
    if (!hasOutput) return;
    const label = String(data.label || 'python-node').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadJsonFile(`tabular-python-output-${label}.json`, output);
  }, [data.label, hasOutput, output]);

  return (
    <div className={`python-node${selected ? ' selected' : ''}`}>
      <NodeHandle type="target" accepts={PYTHON_INPUT_ACCEPTS} />
      <div className="python-node__header">
        <img src={pythonLogo} alt="" className="python-node__icon" />
        <p className="python-node__title">{data.label}</p>
      </div>

      {!trusted ? (
        <div className="python-node__untrusted">
          <p>Code imported from a shared file is not run automatically.</p>
          <button type="button" className="python-node__button nodrag" onClick={onTrust}>
            Trust and run this code
          </button>
        </div>
      ) : null}

      <textarea
        className="python-node__editor nodrag"
        value={code}
        spellCheck={false}
        aria-label="Python node code"
        onChange={(event) => onCodeChange(event.target.value)}
      />

      <div className="python-node__actions">
        <button
          type="button"
          className="python-node__button nodrag"
          onClick={onRun}
          disabled={status === 'running'}
        >
          {status === 'running' ? 'Running…' : 'Run'}
        </button>
        <button
          type="button"
          className="python-node__button nodrag"
          onClick={handleDownloadOutput}
          disabled={!hasOutput}
        >
          Download output
        </button>
      </div>

      {error ? <p className="python-node__error">{error}</p> : null}
      {hasOutput ? (
        <pre className="python-node__output">{outputPreview.length > 4000 ? `${outputPreview.slice(0, 4000)}…` : outputPreview}</pre>
      ) : (
        <p className="python-node__status">Connect an input node and run the script.</p>
      )}

      <NodeInfoButton nodeType="pythonScript" language={data.language} />
    </div>
  );
}
