import { useCallback } from 'react';
import { downloadJsonFile } from '../services/nodeExchange.js';
import n8nCommunityIcon from '../assets/n8n-community.svg';
import NodeHandle from './NodeHandle';
import NodeInfoButton from './NodeInfoButton';

const INPUTS = [
  'Tabular file', 'Preview Tabular Data', 'Column Descriptions', 'Metadata Form',
  'RO-Crate', 'Quantity Kinds', 'Units', 'Terminology Service',
  'Metadata Profile Search', 'Coscine', 'n8n community node',
];

export default function N8nCommunityNode({ id, data, selected, onConfigChange, onRun, inputs = {} }) {
  const name = data.communityNodeName || '';
  const status = data.n8nStatus || '';
  const output = data.n8nOutput;
  const hasOutput = output !== undefined && output !== null;
  const preview = hasOutput ? JSON.stringify(output, null, 2) : '';
  const inputNames = Object.keys(inputs);
  const inputPreview = JSON.stringify(inputs, null, 2);
  const setConfig = (key, value) => onConfigChange?.(id, { [key]: value });

  const downloadOutput = useCallback(() => {
    if (!hasOutput) return;
    const slug = String(name || 'community-node').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadJsonFile(`tabular-n8n-${slug}.json`, output);
  }, [hasOutput, name, output]);

  return (
    <div className={`n8n-community-node${selected ? ' selected' : ''}`}>
      <NodeHandle type="target" accepts={INPUTS} />
      <div className="n8n-community-node__header">
        <img className="n8n-community-node__mark" src={n8nCommunityIcon} alt="" />
        <div>
          <p className="n8n-community-node__title">{name || data.label || 'n8n community node'}</p>
          <p className="n8n-community-node__subtitle">Runs in your n8n workflow</p>
        </div>
      </div>
      <label className="n8n-community-node__field nodrag">
        Community node name
        <input value={name} onChange={(event) => setConfig('communityNodeName', event.target.value)}
          placeholder="e.g. Corporate Memory" />
      </label>
      <label className="n8n-community-node__field nodrag">
        npm package
        <input value={data.communityPackage || ''}
          onChange={(event) => setConfig('communityPackage', event.target.value)}
          placeholder="e.g. @eccenca/n8n-nodes-corporate-memory" />
      </label>
      <label className="n8n-community-node__field nodrag">
        n8n webhook URL
        <input type="url" value={data.webhookUrl || ''}
          onChange={(event) => setConfig('webhookUrl', event.target.value)}
          placeholder="http://localhost:5678/webhook/..." />
      </label>
      <details className="n8n-community-node__advanced nodrag">
        <summary>Webhook authentication</summary>
        <label className="n8n-community-node__field">
          Header name
          <input value={data.authHeaderName || ''}
            onChange={(event) => setConfig('authHeaderName', event.target.value)}
            placeholder="Authorization" />
        </label>
        <label className="n8n-community-node__field">
          Header value
          <input type="password" value={data.authHeaderValue || ''}
            onChange={(event) => setConfig('authHeaderValue', event.target.value)}
            autoComplete="off" />
        </label>
      </details>
      <p className="n8n-community-node__hint">Connect inputs, then run the n8n webhook. Tabular sends a JSON snapshot of those inputs.</p>
      <details className="n8n-community-node__advanced nodrag">
        <summary>Data to send ({inputNames.length} connected {inputNames.length === 1 ? 'node' : 'nodes'})</summary>
        <pre className="n8n-community-node__output">{inputPreview.length > 4000 ? `${inputPreview.slice(0, 4000)}…` : inputPreview}</pre>
      </details>
      <div className="n8n-community-node__actions">
        <button type="button" className="nodrag" onClick={() => onRun?.(id)}
          disabled={status === 'running' || !name.trim() || !data.webhookUrl?.trim()}>
          {status === 'running' ? 'Running…' : `Run ${name || 'community node'}`}
        </button>
        <button type="button" className="nodrag" onClick={downloadOutput} disabled={!hasOutput}>
          Download result
        </button>
      </div>
      {status === 'running' ? <p role="status">Waiting for n8n…</p> : null}
      {status === 'done' ? <p role="status">n8n returned a result.</p> : null}
      {data.n8nError ? <p className="n8n-community-node__error" role="alert">{data.n8nError}</p> : null}
      {hasOutput ? <pre className="n8n-community-node__output">{preview.length > 4000 ? `${preview.slice(0, 4000)}…` : preview}</pre> : null}
      <NodeInfoButton nodeType="n8nCommunity" language={data.language} />
      <NodeHandle type="source" connectsTo={['n8n community node', 'Python script']} />
    </div>
  );
}
