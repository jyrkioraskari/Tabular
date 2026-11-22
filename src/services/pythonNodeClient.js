/**
 * Renderer-side client for user-authored Python nodes. The sandboxed renderer
 * cannot spawn processes itself, so execution goes through the loopback-only
 * local server (POST /python-node/run, see pythonNodeServer.js). The desktop,
 * standalone server, and Vite development server all expose this endpoint.
 */
import { sanitizeNodeData } from './nodeExchange.js';

export const PYTHON_NODE_RUN_URL = '/python-node/run';
export const PYTHON_NODE_HEADER = 'x-tabular-python';
export const PYTHON_NODE_HEADER_VALUE = 'tabular-local';
export const PYTHON_NODE_DEFAULT_TIMEOUT_MS = 10_000;

export const DEFAULT_PYTHON_NODE_CODE = [
  'def run(inputs, data):',
  '    # inputs: { "<source node label>": <that node\'s data> }',
  '    # data:   this node\'s own saved settings',
  '    # Return any JSON-serializable value; it becomes this node\'s output.',
  '    return {"received_inputs": sorted(inputs.keys())}',
  '',
].join('\n');

/**
 * Runs a Python node script on the local server and resolves with its output.
 * Throws an Error with a user-presentable message on any failure.
 */
export async function runPythonNode({ code, inputs = {}, data = {}, timeoutMs, signal }) {
  let response;
  try {
    response = await fetch(PYTHON_NODE_RUN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [PYTHON_NODE_HEADER]: PYTHON_NODE_HEADER_VALUE,
      },
      body: JSON.stringify({
        code,
        inputs,
        data,
        ...(Number.isFinite(timeoutMs) ? { timeoutMs } : {}),
      }),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error(
      'The local Python service is not reachable. Restart the app and check that its local server is running.',
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The local Python service returned an invalid response.');
  }
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error || `The local Python service failed (HTTP ${response.status}).`);
  }
  return payload.output;
}

function inputPayloadForSource(node, tabularMemory, targetType) {
  if (node.type === 'tabularFile') {
    const preview = tabularMemory?.get(node.id);
    return sanitizeNodeData({
      fileName: node.data?.fileName,
      sheetName: node.data?.sheetName,
      hasHeader: node.data?.hasHeader,
      transpose: node.data?.transpose,
      rowCount: node.data?.rowCount,
      headers: preview?.headers,
      rows: preview?.rows,
    });
  }
  if (node.type === 'columnDescription' || node.type === 'headerSchema') {
    return sanitizeNodeData({
      fields: node.data?.fields,
      serializedRdf: node.data?.serializedRdf,
    });
  }
  if (node.type === 'metadataForm') {
    return sanitizeNodeData({
      profileName: node.data?.profileName,
      serializedRdf: node.data?.serializedRdf,
    });
  }
  if (node.type === 'roCrate') {
    return sanitizeNodeData({ jsonLdContent: node.data?.jsonLdContent });
  }
  if (node.type === 'n8nCommunity') {
    return sanitizeNodeData({
      communityNodeName: node.data?.communityNodeName,
      communityPackage: node.data?.communityPackage,
      output: node.data?.n8nOutput,
    });
  }
  if (node.type === 'coscine' && targetType === 'n8n') {
    return sanitizeNodeData({
      resource: node.data?.selectedResource,
      uploadState: node.data?.coscineUploadState,
    });
  }
  return sanitizeNodeData(node.data);
}

/**
 * Builds the `inputs` mapping for a Python node: one entry per incoming edge,
 * keyed by the source node's label (made unique), holding a JSON-safe excerpt
 * of that node's data.
 */
export function collectPythonInputs(nodes, edges, nodeId, tabularMemory, targetType = 'python') {
  const inputs = {};

  for (const edge of Array.isArray(edges) ? edges : []) {
    if (edge.target !== nodeId) continue;
    const source = (Array.isArray(nodes) ? nodes : []).find((node) => node.id === edge.source);
    if (!source) continue;

    const base = String(source.data?.label || source.id);
    let key = base;
    let counter = 2;
    while (key in inputs) {
      key = `${base} ${counter}`;
      counter += 1;
    }

    inputs[key] = inputPayloadForSource(source, tabularMemory, targetType);
  }

  return inputs;
}
