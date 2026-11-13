import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAnnotationMemory,
  clearAnnotationMemoryForNode,
  findRememberedAnnotations,
  readAnnotationMemory,
  rememberAnnotationChoice,
} from '../src/services/annotationMemory.js';

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('remembers meaning and unit and suggests them for a differently spelled column', () => {
  const browser = storage();
  rememberAnnotationChoice({ kind: 'meaning', uri: 'https://example.org/applied-load', label: 'Applied load', header: 'Actuator force [kN]', description: 'Force applied by the actuator', vocabularyId: 'TEST' }, browser);
  rememberAnnotationChoice({ kind: 'unit', uri: 'http://qudt.org/vocab/unit/KiloN', label: 'Kilonewton', header: 'Actuator force [kN]', description: 'Force applied by the actuator' }, browser);
  const choices = findRememberedAnnotations({ header: 'Actuator forces [kN]', description: 'The actuator applies force' }, readAnnotationMemory(browser), { vocabularyId: 'TEST' });
  assert.equal(choices.meaning?.uri, 'https://example.org/applied-load');
  assert.equal(choices.unit?.uri, 'http://qudt.org/vocab/unit/KiloN');
  clearAnnotationMemory(browser);
  assert.deepEqual(readAnnotationMemory(browser), []);
});

test('header-only columns can reuse history within the same vocabulary', () => {
  const records = [{ kind: 'meaning', uri: 'https://example.org/force', header: 'Force [kN]', description: 'Applied force', vocabularyId: 'A' }];
  assert.equal(findRememberedAnnotations({ header: 'Force [kN]', description: '' }, records, { vocabularyId: 'A' }).meaning?.uri, records[0].uri);
  assert.equal(findRememberedAnnotations({ header: '', description: '' }, records, { vocabularyId: 'A' }).meaning, null);
  assert.equal(findRememberedAnnotations({ header: 'Force [kN]', description: 'Applied force' }, records, { vocabularyId: 'B' }).meaning, null);
});

test('conflicting explicit unit symbols prevent a reused unit suggestion', () => {
  const records = [{ kind: 'unit', uri: 'http://qudt.org/vocab/unit/KiloN', header: 'Force [kN]', description: 'Applied force' }];
  assert.equal(findRememberedAnnotations({ header: 'Force [N]', description: 'Applied force' }, records).unit, null);
});

test('removing a node copy removes only its opted-in choices', () => {
  const browser = storage();
  browser.setItem('tabular-rdm.annotation-memory.v1', JSON.stringify([{ uri: 'https://example.org/legacy' }]));
  assert.deepEqual(readAnnotationMemory(browser), []);
  assert.equal(browser.getItem('tabular-rdm.annotation-memory.v1'), null);
  const choice = { kind: 'meaning', uri: 'https://example.org/force', header: 'Force', description: 'Actuator force', vocabularyId: 'A' };
  rememberAnnotationChoice({ ...choice, originNodeId: 'first' }, browser);
  rememberAnnotationChoice({ ...choice, originNodeId: 'second' }, browser);
  assert.equal(readAnnotationMemory(browser).length, 2);
  clearAnnotationMemoryForNode('first', browser);
  assert.deepEqual(readAnnotationMemory(browser).map((item) => item.originNodeId), ['second']);
});
