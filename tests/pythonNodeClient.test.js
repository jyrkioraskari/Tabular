import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PYTHON_NODE_CODE,
  collectPythonInputs,
  runPythonNode,
} from '../src/services/pythonNodeClient.js';

const nodes = [
  {
    id: 'file-1',
    type: 'tabularFile',
    data: { label: 'File 1', fileName: 'data.csv', sheetName: 'Sheet1', sourceFile: { content: new ArrayBuffer(8) } },
  },
  { id: 'cols-1', type: 'columnDescription', data: { label: 'File 1', fields: [{ header: 'Force' }] } },
  { id: 'py-1', type: 'pythonScript', data: { label: 'Py 1' } },
];

const edges = [
  { id: 'e1', source: 'file-1', target: 'py-1' },
  { id: 'e2', source: 'cols-1', target: 'py-1' },
  { id: 'e3', source: 'file-1', target: 'cols-1' },
];

test('collectPythonInputs keys incoming edges by unique source label and sanitizes payloads', () => {
  const tabularMemory = new Map([
    ['file-1', { headers: ['Force'], rows: [[42]], sourceFile: { content: 'x' } }],
  ]);

  const inputs = collectPythonInputs(nodes, edges, 'py-1', tabularMemory);

  assert.deepEqual(Object.keys(inputs).sort(), ['File 1', 'File 1 2']);
  const fileInput = inputs['File 1'];
  assert.equal(fileInput.fileName, 'data.csv');
  assert.deepEqual(fileInput.headers, ['Force']);
  assert.deepEqual(fileInput.rows, [[42]]);
  assert.equal(fileInput.sourceFile, undefined);
  const colsInput = inputs['File 1 2'];
  assert.deepEqual(colsInput.fields, [{ header: 'Force' }]);
});

test('collectPythonInputs returns an empty mapping without incoming edges', () => {
  assert.deepEqual(collectPythonInputs(nodes, edges, 'file-1', new Map()), {});
  assert.deepEqual(collectPythonInputs([], [], 'py-1', new Map()), {});
});

test('runPythonNode posts to the loopback endpoint with the guard header', async () => {
  const calls = [];
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, output: { done: true } }),
    };
  };
  try {
    const output = await runPythonNode({ code: 'def run(inputs, data):\n    return 1', inputs: { a: 1 }, data: {}, timeoutMs: 5000 });
    assert.deepEqual(output, { done: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/python-node/run');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers['x-tabular-python'], 'tabular-local');
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.timeoutMs, 5000);
    assert.deepEqual(body.inputs, { a: 1 });
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test('runPythonNode surfaces server errors and unreachable-server errors', async () => {
  const oldFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, error: 'ZeroDivisionError: division by zero' }),
    });
    await assert.rejects(() => runPythonNode({ code: 'x' }), /ZeroDivisionError/);

    globalThis.fetch = async () => {
      throw new TypeError('fetch failed');
    };
    await assert.rejects(() => runPythonNode({ code: 'x' }), /not reachable/);
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test('the default code defines a runnable run(inputs, data) function', () => {
  assert.match(DEFAULT_PYTHON_NODE_CODE, /def run\(inputs, data\):/);
});
