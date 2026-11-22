import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import {
  handleN8nNodeRun,
  validateN8nWebhookUrl,
} from '../n8nNodeServer.js';
import { collectN8nInputs } from '../src/services/n8nNodeClient.js';
import { serializeSelection } from '../src/services/nodeExchange.js';

function requestFor(payload, headers = {}) {
  const request = Readable.from([Buffer.from(JSON.stringify(payload))]);
  request.method = 'POST';
  request.url = '/n8n-node/run';
  request.headers = {
    host: '127.0.0.1:4173',
    'x-tabular-n8n': 'tabular-local',
    ...headers,
  };
  return request;
}

function responseRecorder() {
  return {
    status: 0,
    headers: {},
    body: null,
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body) { this.body = JSON.parse(body); },
  };
}

test('accepts n8n webhook URLs and rejects unsafe URL forms', () => {
  assert.equal(validateN8nWebhookUrl('http://localhost:5678/webhook/demo').pathname, '/webhook/demo');
  assert.equal(validateN8nWebhookUrl('https://n8n.example.org/webhook-test/demo').pathname,
    '/webhook-test/demo');
  assert.throws(() => validateN8nWebhookUrl('http://n8n.example.org/webhook/demo'), /HTTPS/);
  assert.throws(() => validateN8nWebhookUrl('https://n8n.example.org/api/v1/workflows'), /webhook URL/);
  assert.throws(() => validateN8nWebhookUrl('https://user:pass@n8n.example.org/webhook/demo'), /credentials/);
});

test('forwards connected inputs to the configured n8n webhook and returns JSON', async () => {
  const previousFetch = globalThis.fetch;
  let call;
  globalThis.fetch = async (url, options) => {
    call = { url: String(url), options };
    return new Response(JSON.stringify({ result: [{ value: 42 }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const response = responseRecorder();
    await handleN8nNodeRun(requestFor({
      webhookUrl: 'https://n8n.example.org/webhook/demo',
      communityNode: { name: 'Example', package: 'n8n-nodes-example' },
      authHeaderName: 'X-Webhook-Token',
      authHeaderValue: 'secret',
      inputs: { 'Column Descriptions 1': { fields: [{ header: 'A' }] } },
    }), response);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.output, { result: [{ value: 42 }] });
    assert.equal(call.url, 'https://n8n.example.org/webhook/demo');
    assert.equal(call.options.headers['X-Webhook-Token'], 'secret');
    assert.equal(call.options.redirect, 'error');
    assert.deepEqual(JSON.parse(call.options.body).inputs,
      { 'Column Descriptions 1': { fields: [{ header: 'A' }] } });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('rejects requests without the local custom header', async () => {
  const response = responseRecorder();
  await handleN8nNodeRun(requestFor({ webhookUrl: 'https://n8n.example.org/webhook/demo' },
    { 'x-tabular-n8n': '' }), response);
  assert.equal(response.status, 403);
});

test('shared workflows omit webhook credentials and returned research data', () => {
  const exported = serializeSelection({
    nodes: [{ id: 'n', type: 'n8nCommunity', position: { x: 0, y: 0 }, data: {
      label: 'SPARQL', communityNodeName: 'SPARQL', communityPackage: 'n8n-nodes-example',
      webhookUrl: 'https://n8n.example.org/webhook/private',
      authHeaderName: 'Authorization', authHeaderValue: 'Bearer secret',
      n8nOutput: { privateRows: ['research data'] },
    } }],
    edges: [],
  });
  assert.equal(exported.nodes[0].data.webhookUrl, undefined);
  assert.equal(exported.nodes[0].data.authHeaderValue, undefined);
  assert.equal(exported.nodes[0].data.n8nOutput, undefined);
  assert.equal(exported.nodes[0].data.communityPackage, 'n8n-nodes-example');
});

test('collects a named Tabular input for an n8n canvas node', () => {
  const inputs = collectN8nInputs([
    { id: 'columns', type: 'columnDescription', data: {
      label: 'Columns', fields: [{ header: 'Temperature', description: 'Air temperature' }],
    } },
    { id: 'community', type: 'n8nCommunity', data: {} },
  ], [{ source: 'columns', target: 'community' }], 'community', new Map());
  assert.equal(inputs.Columns.fields[0].description, 'Air temperature');
});
