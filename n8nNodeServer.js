/**
 * Runs an explicitly configured n8n workflow through its webhook. Community
 * packages execute in n8n; this bridge only sends the selected Tabular inputs.
 */
export const N8N_NODE_RUN_PATH = '/n8n-node/run';
export const N8N_NODE_HEADER = 'x-tabular-n8n';
export const N8N_NODE_HEADER_VALUE = 'tabular-local';

const MAX_BODY_BYTES = 1_000_000;
const MAX_OUTPUT_BYTES = 1_000_000;
const TIMEOUT_MS = 30_000;

function send(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function isLoopbackHost(host) {
  return /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(String(host || ''));
}

export function validateN8nWebhookUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Enter a valid n8n webhook URL.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase());
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('Use HTTPS for remote n8n webhooks. Local n8n may use HTTP.');
  }
  if (url.username || url.password || url.hash) {
    throw new Error('Remove credentials and fragments from the webhook URL.');
  }
  if (!/\/(webhook|webhook-test)\//.test(url.pathname)) {
    throw new Error('Use an n8n production or test webhook URL.');
  }
  return url;
}

async function readLimited(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.byteLength;
    if (size > MAX_BODY_BYTES) throw new Error('The Tabular input is too large for this node.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readResponse(response) {
  const chunks = [];
  let size = 0;
  if (!response.body) return '';
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > MAX_OUTPUT_BYTES) throw new Error('The n8n response is too large to show in Tabular.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function handleN8nNodeRun(request, response) {
  if (request.method !== 'POST' || request.url !== N8N_NODE_RUN_PATH) {
    send(response, 404, { error: 'Not found.' });
    return;
  }
  if (request.headers[N8N_NODE_HEADER] !== N8N_NODE_HEADER_VALUE ||
      !isLoopbackHost(request.headers.host)) {
    send(response, 403, { error: 'Forbidden.' });
    return;
  }

  let payload;
  try {
    payload = JSON.parse((await readLimited(request)).toString('utf8'));
  } catch (error) {
    send(response, 400, { error: error.message || 'Invalid request.' });
    return;
  }

  let url;
  try {
    url = validateN8nWebhookUrl(payload?.webhookUrl);
  } catch (error) {
    send(response, 400, { error: error.message });
    return;
  }
  if (!payload?.inputs || typeof payload.inputs !== 'object' || Array.isArray(payload.inputs)) {
    send(response, 400, { error: 'Connect an input node before running this node.' });
    return;
  }

  const authName = String(payload.authHeaderName || '').trim();
  const authValue = String(payload.authHeaderValue || '').trim();
  if ((authName || authValue) && (!/^[A-Za-z][A-Za-z0-9-]*$/.test(authName) || !authValue ||
      ['host', 'content-type', 'content-length'].includes(authName.toLowerCase()))) {
    send(response, 400, { error: 'Enter a valid authentication header name and value.' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authName ? { [authName]: authValue } : {}),
      },
      body: JSON.stringify({
        source: 'Tabular',
        communityNode: {
          name: String(payload.communityNode?.name || ''),
          package: String(payload.communityNode?.package || ''),
        },
        inputs: payload.inputs,
      }),
      redirect: 'error',
      signal: controller.signal,
    });
    const body = await readResponse(upstream);
    if (!upstream.ok) {
      send(response, 502, { error: `n8n returned HTTP ${upstream.status}. Check the workflow execution in n8n.` });
      return;
    }
    let output;
    try {
      output = JSON.parse(body);
    } catch {
      output = { text: body };
    }
    send(response, 200, { ok: true, output });
  } catch (error) {
    send(response, 502, { error: controller.signal.aborted
      ? 'n8n did not respond within 30 seconds.'
      : error.message || 'Could not reach the n8n webhook.' });
  } finally {
    clearTimeout(timeout);
  }
}
