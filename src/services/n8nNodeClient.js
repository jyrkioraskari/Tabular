import { collectPythonInputs } from './pythonNodeClient.js';

export function collectN8nInputs(nodes, edges, nodeId, tabularMemory) {
  return collectPythonInputs(nodes, edges, nodeId, tabularMemory, 'n8n');
}

export async function runN8nNode({ webhookUrl, authHeaderName, authHeaderValue,
  communityNode, inputs, signal }) {
  let response;
  try {
    response = await fetch('/n8n-node/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tabular-n8n': 'tabular-local' },
      body: JSON.stringify({ webhookUrl, authHeaderName, authHeaderValue, communityNode, inputs }),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error('The local n8n bridge is unavailable. Use the desktop app or npm run serve.');
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The local n8n bridge returned an invalid response.');
  }
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error || `n8n request failed (HTTP ${response.status}).`);
  }
  return payload.output;
}
