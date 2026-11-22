import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NODE_EXCHANGE_APP_ID,
  NODE_EXCHANGE_VERSION,
  readJsonFile,
  sanitizeNodeData,
  serializeSelection,
  validateImportPayload,
} from '../src/services/nodeExchange.js';

const KNOWN_TYPES = ['tabularFile', 'roCrate', 'previewTabular'];

function isValidConnection(connection, nodes) {
  const typesById = new Map(nodes.map((node) => [node.id, node.type]));
  return (
    typesById.get(connection.source) === 'tabularFile' &&
    typesById.get(connection.target) === 'roCrate'
  );
}

function basePayload(overrides = {}) {
  return {
    app: NODE_EXCHANGE_APP_ID,
    kind: 'workflow',
    version: NODE_EXCHANGE_VERSION,
    exportedAt: '2026-01-01T00:00:00.000Z',
    name: 'test',
    nodes: [],
    edges: [],
    ...overrides,
  };
}

test('sanitizeNodeData strips functions, binary values, Map/Set, circular refs, and sourceFile', () => {
  const circular = { label: 'loop' };
  circular.self = circular;

  const sanitized = sanitizeNodeData({
    label: 'File 1',
    count: 3,
    ratio: Number.NaN,
    big: 10n,
    onLoad: () => 'nope',
    buffer: new ArrayBuffer(8),
    blob: new Blob(['x']),
    lookup: new Map([['a', 1]]),
    tags: new Set(['a']),
    circular,
    sourceFile: { fileName: 'data.xlsx', content: new ArrayBuffer(8) },
    nested: { sourceFile: { content: new ArrayBuffer(4) }, keep: 'yes', list: [1, () => 2, 'ok'] },
  });

  assert.deepEqual(sanitized, {
    label: 'File 1',
    count: 3,
    circular: { label: 'loop' },
    nested: { keep: 'yes', list: [1, null, 'ok'] },
  });
  assert.doesNotThrow(() => JSON.stringify(sanitized));
  assert.equal(sanitized.circular.self, undefined);
});

test('sanitizeNodeData returns an empty object for non-object input', () => {
  assert.deepEqual(sanitizeNodeData(undefined), {});
  assert.deepEqual(sanitizeNodeData(() => 'fn'), {});
});

test('serializeSelection exports a single selected node as kind node without edges', () => {
  const nodes = [
    {
      id: 'n1',
      type: 'tabularFile',
      position: { x: 10, y: 20 },
      data: { label: 'File 1', sourceFile: { fileName: 'a.xlsx', content: new ArrayBuffer(8) } },
    },
    { id: 'n2', type: 'roCrate', position: { x: 300, y: 20 }, data: { label: 'Crate 1' } },
    { id: 'n3', type: 'previewTabular', position: { x: 10, y: 200 }, data: { label: 'P 1' } },
  ];
  const edges = [
    { id: 'e1', source: 'n1', target: 'n2' },
    { id: 'e2', source: 'n1', target: 'n3' },
  ];

  const single = serializeSelection({ nodes, edges, selectionIds: ['n1'] });
  assert.equal(single.app, NODE_EXCHANGE_APP_ID);
  assert.equal(single.kind, 'node');
  assert.equal(single.version, NODE_EXCHANGE_VERSION);
  assert.equal(typeof single.exportedAt, 'string');
  assert.equal(single.name, 'File 1');
  assert.equal(single.nodes.length, 1);
  assert.deepEqual(single.nodes[0], {
    id: 'n1',
    type: 'tabularFile',
    position: { x: 10, y: 20 },
    data: { label: 'File 1' },
  });
  assert.deepEqual(single.edges, []);

  const pair = serializeSelection({ nodes, edges, selectionIds: ['n1', 'n2'], name: 'pair' });
  assert.equal(pair.kind, 'workflow');
  assert.equal(pair.name, 'pair');
  assert.equal(pair.nodes.length, 2);
  assert.deepEqual(pair.edges, [{ source: 'n1', target: 'n2' }]);

  const full = serializeSelection({ nodes, edges });
  assert.equal(full.kind, 'workflow');
  assert.equal(full.nodes.length, 3);
  assert.equal(full.edges.length, 2);
});

test('validateImportPayload rejects wrong app marker, missing version, and non-array nodes', () => {
  assert.ok(validateImportPayload({}, { knownTypes: KNOWN_TYPES }).error);
  assert.ok(
    validateImportPayload(basePayload({ app: 'other-app' }), { knownTypes: KNOWN_TYPES }).error,
  );
  assert.ok(
    validateImportPayload(basePayload({ version: undefined }), { knownTypes: KNOWN_TYPES }).error,
  );
  assert.ok(
    validateImportPayload(basePayload({ version: 99 }), { knownTypes: KNOWN_TYPES }).error,
  );
  assert.ok(
    validateImportPayload(basePayload({ nodes: {}, edges: [] }), { knownTypes: KNOWN_TYPES })
      .error,
  );
  assert.ok(validateImportPayload(null, { knownTypes: KNOWN_TYPES }).error);
  assert.ok(validateImportPayload([1, 2], { knownTypes: KNOWN_TYPES }).error);
});

test('validateImportPayload drops unknown types, remaps edges to fresh ids, and applies connection rules', () => {
  const payload = basePayload({
    nodes: [
      {
        id: 'old-file',
        type: 'tabularFile',
        position: { x: 5, y: 6 },
        data: { label: 'File 1', sourceFile: { content: 'binary' } },
      },
      { id: 'old-crate', type: 'roCrate', position: 'broken', data: { label: 'Crate 1' } },
      { id: 'old-mystery', type: 'notARealType', position: { x: 0, y: 0 }, data: {} },
    ],
    edges: [
      { source: 'old-file', target: 'old-crate' },
      { source: 'old-crate', target: 'old-file' },
      { source: 'old-file', target: 'missing' },
    ],
  });

  const result = validateImportPayload(payload, {
    knownTypes: KNOWN_TYPES,
    isValidConnection,
    existingNodeIds: [],
  });

  assert.equal(result.error, undefined);
  assert.equal(result.nodes.length, 2);

  const fileNode = result.nodes.find((node) => node.type === 'tabularFile');
  const crateNode = result.nodes.find((node) => node.type === 'roCrate');
  assert.ok(fileNode && crateNode);
  assert.notEqual(fileNode.id, 'old-file');
  assert.notEqual(crateNode.id, 'old-crate');
  assert.match(fileNode.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(fileNode.position, { x: 5, y: 6 });
  assert.deepEqual(fileNode.data, { label: 'File 1' });
  assert.deepEqual(crateNode.position, { x: 0, y: 0 });

  assert.equal(result.edges.length, 1);
  assert.deepEqual(result.edges[0], {
    id: result.edges[0].id,
    source: fileNode.id,
    target: crateNode.id,
  });

  const warningText = result.warnings.join(' ');
  assert.match(warningText, /notARealType/);
  assert.match(warningText, /invalid position/);
  assert.match(warningText, /unsupported connection/);
  assert.match(warningText, /unknown endpoints/);
});

test('validateImportPayload never reuses ids that already exist on the canvas', () => {
  const payload = basePayload({
    nodes: [{ id: 'a', type: 'roCrate', position: { x: 0, y: 0 }, data: {} }],
    edges: [],
  });
  const existing = ['a'];
  const first = validateImportPayload(payload, { knownTypes: KNOWN_TYPES, existingNodeIds: existing });
  const second = validateImportPayload(payload, {
    knownTypes: KNOWN_TYPES,
    existingNodeIds: [...existing, first.nodes[0].id],
  });
  assert.notEqual(first.nodes[0].id, second.nodes[0].id);
  assert.ok(!existing.includes(first.nodes[0].id));
});

test('validateImportPayload marks untrusted types as trusted:false with a warning', () => {
  const payload = basePayload({
    nodes: [
      {
        id: 'p1',
        type: 'pythonScript',
        position: { x: 1, y: 1 },
        data: { label: 'My script', code: 'def run(inputs, data):\n    return 1' },
      },
      { id: 'r1', type: 'roCrate', position: { x: 2, y: 2 }, data: { label: 'Crate 1' } },
    ],
    edges: [],
  });

  const result = validateImportPayload(payload, {
    knownTypes: [...KNOWN_TYPES, 'pythonScript'],
    untrustedTypes: ['pythonScript'],
    existingNodeIds: [],
  });

  const pythonNode = result.nodes.find((node) => node.type === 'pythonScript');
  const crateNode = result.nodes.find((node) => node.type === 'roCrate');
  assert.equal(pythonNode.data.trusted, false);
  assert.equal(pythonNode.data.code.includes('def run'), true);
  assert.equal(crateNode.data.trusted, undefined);
  assert.ok(result.warnings.some((warning) => /disabled/.test(warning)));
});

test('readJsonFile enforces the size cap and rejects invalid JSON', async () => {
  await assert.rejects(
    () => readJsonFile({ size: 3_000_000, text: async () => '{}' }),
    /larger than/,
  );
  await assert.rejects(
    () => readJsonFile({ size: 100, text: async () => '{}' }, { maxBytes: 50 }),
    /larger than/,
  );
  await assert.rejects(
    () => readJsonFile({ size: 20, text: async () => '{not json' }),
    /valid JSON/,
  );
  await assert.rejects(() => readJsonFile(null), /No file/);
  assert.deepEqual(await readJsonFile({ size: 2, text: async () => '{}' }), {});
});
