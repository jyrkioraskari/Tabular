import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import {
  PYTHON_NODE_HEADER,
  PYTHON_NODE_HEADER_VALUE,
  handlePythonNodeRun,
} from '../pythonNodeServer.js';

function makeRequest(body, headers = {}) {
  const input = Readable.from([Buffer.from(body)]);
  input.method = 'POST';
  input.url = '/python-node/run';
  input.headers = {
    host: '127.0.0.1:4173',
    [PYTHON_NODE_HEADER]: PYTHON_NODE_HEADER_VALUE,
    ...headers,
  };
  return input;
}

async function call(body, headers) {
  let status;
  let payload;
  await handlePythonNodeRun(makeRequest(body, headers), {
    writeHead: (value) => {
      status = value;
    },
    end: (value) => {
      payload = JSON.parse(value);
    },
  });
  return { status, payload };
}

const runCode = (code, extra = {}) =>
  call(JSON.stringify({ code, inputs: { source: { value: 2 } }, data: { label: 'Py 1' }, ...extra }));

test('runs user code and returns the JSON output', async () => {
  const { status, payload } = await runCode(
    'def run(inputs, data):\n    return {"sum": inputs["source"]["value"] + 1, "label": data["label"], "keys": sorted(inputs)}',
  );
  assert.equal(status, 200);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.output, { sum: 3, label: 'Py 1', keys: ['source'] });
});

test('reports a missing run() function', async () => {
  const { status, payload } = await runCode('x = 1');
  assert.equal(status, 200);
  assert.equal(payload.ok, false);
  assert.match(payload.error, /run\(inputs, data\)/);
});

test('reports runtime exceptions with the Python error line', async () => {
  const { payload } = await runCode('def run(inputs, data):\n    return 1 / 0');
  assert.equal(payload.ok, false);
  assert.match(payload.error, /ZeroDivisionError/);
});

test('reports syntax errors', async () => {
  const { payload } = await runCode('def run(:\n    pass');
  assert.equal(payload.ok, false);
  assert.match(payload.error, /Syntax error/);
});

test('rejects non-JSON-serializable return values', async () => {
  const { payload } = await runCode('def run(inputs, data):\n    return {1, 2}');
  assert.equal(payload.ok, false);
  assert.match(payload.error, /JSON-serializable/);
});

test('rejects NaN output instead of emitting invalid JSON', async () => {
  const { payload } = await runCode('def run(inputs, data):\n    return {"v": float("nan")}');
  assert.equal(payload.ok, false);
  assert.match(payload.error, /JSON-serializable/);
});

test('enforces the custom header and loopback host guard', async () => {
  const code = 'def run(inputs, data):\n    return 1';
  const body = JSON.stringify({ code, inputs: {}, data: {} });

  const noHeader = await call(body, { [PYTHON_NODE_HEADER]: undefined });
  assert.equal(noHeader.status, 403);

  const wrongHeader = await call(body, { [PYTHON_NODE_HEADER]: 'evil' });
  assert.equal(wrongHeader.status, 403);

  const rebound = await call(body, { host: 'example.com' });
  assert.equal(rebound.status, 403);

  const okHost = await call(body, { host: 'localhost:4173' });
  assert.equal(okHost.status, 200);
  assert.equal(okHost.payload.ok, true);
});

test('rejects invalid JSON, empty code, and oversized code', async () => {
  assert.equal((await call('{nope')).status, 400);
  assert.equal((await runCode('   ')).status, 400);
  const big = await runCode(`def run(inputs, data):\n    return ${'x'.repeat(200_001)}`);
  assert.equal(big.status, 413);
});

test('times out long-running scripts and reports it', async () => {
  const { status, payload } = await runCode('import time\n\ndef run(inputs, data):\n    time.sleep(10)\n    return 1', { timeoutMs: 400 });
  assert.equal(status, 200);
  assert.equal(payload.ok, false);
  assert.match(payload.error, /timed out/);
});

test('returns 503 with guidance when no Python interpreter exists', async () => {
  const oldBin = process.env.TABULAR_PYTHON_BIN;
  process.env.TABULAR_PYTHON_BIN = '/nonexistent/tabular-python-bin';
  try {
    const { status, payload } = await runCode('def run(inputs, data):\n    return 1');
    assert.equal(status, 503);
    assert.equal(payload.ok, false);
    assert.match(payload.error, /Python 3 was not found/);
  } finally {
    if (oldBin === undefined) delete process.env.TABULAR_PYTHON_BIN;
    else process.env.TABULAR_PYTHON_BIN = oldBin;
  }
});

test('TABULAR_PYTHON_BIN override is used when it points at a real interpreter', async () => {
  const oldBin = process.env.TABULAR_PYTHON_BIN;
  process.env.TABULAR_PYTHON_BIN = process.execPath === undefined ? 'python3' : 'python3';
  try {
    const { status, payload } = await runCode('def run(inputs, data):\n    return {"via": "override"}');
    assert.equal(status, 200);
    assert.equal(payload.ok, true);
    assert.deepEqual(payload.output, { via: 'override' });
  } finally {
    if (oldBin === undefined) delete process.env.TABULAR_PYTHON_BIN;
    else process.env.TABULAR_PYTHON_BIN = oldBin;
  }
});
