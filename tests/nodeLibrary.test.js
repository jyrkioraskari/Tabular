import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NODE_LIBRARY_KEY,
  NODE_LIBRARY_MAX_ENTRIES,
  addNodeLibraryEntry,
  readNodeLibrary,
  removeNodeLibraryEntry,
  renameNodeLibraryEntry,
} from '../src/services/nodeLibrary.js';

function storage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
}

const browser = storage();
globalThis.window = { localStorage: browser };

const KNOWN_TYPES = ['tabularFile', 'roCrate', 'metadataForm'];

test('add and read round-trip an entry, newest first, with sanitized data', () => {
  browser.removeItem(NODE_LIBRARY_KEY);

  const first = addNodeLibraryEntry(
    {
      name: 'My crate',
      nodeType: 'roCrate',
      data: { label: 'My crate', sourceFile: { content: new ArrayBuffer(8) }, note: 'ok' },
    },
    KNOWN_TYPES,
  );
  const second = addNodeLibraryEntry(
    { name: 'My file', nodeType: 'tabularFile', data: { label: 'My file', hasHeader: true } },
    KNOWN_TYPES,
  );

  assert.ok(first.id);
  assert.equal(first.nodeType, 'roCrate');
  assert.deepEqual(first.data, { label: 'My crate', note: 'ok' });
  assert.equal(typeof first.savedAt, 'string');

  const entries = readNodeLibrary();
  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((entry) => entry.id),
    [second.id, first.id],
  );
  assert.equal(JSON.parse(browser.getItem(NODE_LIBRARY_KEY)).length, 2);
});

test('addNodeLibraryEntry rejects unknown node types', () => {
  assert.throws(
    () => addNodeLibraryEntry({ name: 'x', nodeType: 'evil', data: {} }, KNOWN_TYPES),
    /Unknown node type/,
  );
  assert.throws(
    () => addNodeLibraryEntry({ name: 'x', nodeType: 'roCrate', data: {} }, undefined),
    /Unknown node type/,
  );
});

test('remove and rename update only the targeted entry', () => {
  browser.removeItem(NODE_LIBRARY_KEY);
  const keep = addNodeLibraryEntry(
    { name: 'keep', nodeType: 'metadataForm', data: { label: 'keep' } },
    KNOWN_TYPES,
  );
  const drop = addNodeLibraryEntry(
    { name: 'drop', nodeType: 'roCrate', data: { label: 'drop' } },
    KNOWN_TYPES,
  );

  removeNodeLibraryEntry(drop.id);
  assert.deepEqual(
    readNodeLibrary().map((entry) => entry.id),
    [keep.id],
  );

  renameNodeLibraryEntry(keep.id, '  renamed  ');
  assert.equal(readNodeLibrary()[0].name, 'renamed');

  renameNodeLibraryEntry(keep.id, '   ');
  assert.equal(readNodeLibrary()[0].name, 'renamed');
});

test('the library is capped at the maximum number of entries, newest first', () => {
  browser.removeItem(NODE_LIBRARY_KEY);
  for (let index = 0; index < NODE_LIBRARY_MAX_ENTRIES + 5; index += 1) {
    addNodeLibraryEntry(
      { name: `entry-${index}`, nodeType: 'roCrate', data: { label: `entry-${index}` } },
      KNOWN_TYPES,
    );
  }

  const entries = readNodeLibrary();
  assert.equal(entries.length, NODE_LIBRARY_MAX_ENTRIES);
  assert.equal(entries[0].name, `entry-${NODE_LIBRARY_MAX_ENTRIES + 4}`);
  assert.equal(entries[entries.length - 1].name, 'entry-5');
});

test('readNodeLibrary returns an empty array when storage is empty or corrupt', () => {
  browser.removeItem(NODE_LIBRARY_KEY);
  assert.deepEqual(readNodeLibrary(), []);
  browser.setItem(NODE_LIBRARY_KEY, '{broken');
  assert.deepEqual(readNodeLibrary(), []);
  browser.setItem(NODE_LIBRARY_KEY, '{"not":"an array"}');
  assert.deepEqual(readNodeLibrary(), []);
});
