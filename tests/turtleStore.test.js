import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTurtleStore } from '../src/services/turtleStore.js';

test('parses Turtle into a fresh store and counts unique triples', () => {
  const first = parseTurtleStore('@prefix ex: <https://example.org/> . ex:a ex:p ex:b . ex:a ex:p ex:b .');
  const second = parseTurtleStore('@prefix ex: <https://example.org/> . ex:c ex:p "text" .');
  assert.equal(first.size, 1);
  assert.equal(second.size, 1);
  assert.equal(first.getQuads(null, null, null, null)[0].subject.value, 'https://example.org/a');
  assert.equal(second.getQuads(null, null, null, null)[0].subject.value, 'https://example.org/c');
});

test('rejects malformed Turtle before creating a replacement store', () => {
  assert.throws(() => parseTurtleStore('@prefix ex: <https://example.org/> . ex:a ex:p .'));
});
