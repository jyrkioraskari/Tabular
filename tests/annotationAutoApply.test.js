import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTO_SEMANTIC_SCORE, autoSlotKey, selectAutoAnnotations } from '../src/services/annotationAutoApply.js';

const options = { vocabularyId: 'TEST', language: 'en', localizedUnitLabels: { language: 'en', labels: {} } };
const field = { header: 'Actuator forces [kN]', description: 'The actuator applies force', unit: '' };
const concept = { iri: 'urn:applied-load', label: 'Applied load', score: AUTO_SEMANTIC_SCORE + 0.05 };
const unit = { unit: 'urn:kN', label: 'Kilonewton', labelLanguage: 'en' };

test('automatically selects one strong unambiguous semantic match and explicit unit', () => {
  const result = { meaning: { source: 'semantic snapshot', ambiguous: false, candidates: [concept] }, unit: { unit, reason: '[kN] in the header' } };
  const selected = selectAutoAnnotations(field, result, [], options);
  assert.equal(selected.meaning.choice.iri, concept.iri);
  assert.equal(selected.unit.choice.unit, unit.unit);
  assert.equal(selectAutoAnnotations({ ...field, descriptionUri: 'urn:manual', unitUri: 'urn:manual-unit' }, result, [], options).meaning, null);
  assert.equal(selectAutoAnnotations({ ...field, unit: 'Typed by researcher' }, result, [], options).unit, null);
});

test('ambiguous, fallback, and weak semantic matches stay for review', () => {
  const meaning = { source: 'semantic snapshot', ambiguous: false, candidates: [concept] };
  for (const change of [
    { ambiguous: true },
    { source: 'Terminology Service fallback' },
    { candidates: [{ ...concept, score: AUTO_SEMANTIC_SCORE - 0.01 }] },
    { candidates: [concept, { ...concept, iri: 'urn:other' }] },
  ]) assert.equal(selectAutoAnnotations(field, { meaning: { ...meaning, ...change } }, [], options).meaning, null);
});

test('confident memory matches survive minor spelling changes but conflicting history abstains', () => {
  const history = [
    { kind: 'meaning', uri: 'urn:applied-load', label: 'Applied load', header: 'Actuator force [kN]', description: 'Force applied by the actuator', vocabularyId: 'TEST' },
    { kind: 'unit', uri: 'urn:kN', label: 'Kilonewton', language: 'en', header: 'Actuator force [kN]', description: 'Force applied by the actuator' },
  ];
  const selected = selectAutoAnnotations(field, null, history, options);
  assert.equal(selected.meaning.choice.uri, 'urn:applied-load');
  assert.equal(selected.unit.choice.uri, 'urn:kN');
  const conflicting = [...history, { ...history[0], uri: 'urn:other', savedAt: 1 }];
  assert.equal(selectAutoAnnotations(field, null, conflicting, options).meaning, null);
  const semanticConflict = { meaning: { source: 'semantic snapshot', ambiguous: false, candidates: [{ ...concept, iri: 'urn:other' }] } };
  assert.equal(selectAutoAnnotations(field, semanticConflict, history, options).meaning, null);
  assert.equal(selectAutoAnnotations(field, { unit: { unit: { ...unit, unit: 'urn:N' } } }, history, options).unit, null);
});

test('header-only memory applies a unique match and localizes a unit', () => {
  const headerOnly = { header: 'Force [kN]', description: '', unit: '' };
  const history = [
    { kind: 'meaning', uri: 'urn:force', label: 'Force', header: 'Force [kN]', description: 'Applied force', vocabularyId: 'TEST' },
    { kind: 'unit', uri: 'urn:kN', label: 'Kilonewton', language: 'en', header: 'Force [kN]', description: 'Applied force' },
  ];
  const german = selectAutoAnnotations(headerOnly, null, history, {
    ...options, language: 'de', localizedUnitLabels: { language: 'de', labels: { 'urn:kN': { label: 'Kilonewton Deutsch', language: 'de' } } },
  });
  assert.equal(german.meaning.choice.uri, 'urn:force');
  assert.equal(german.unit.choice.label, 'Kilonewton Deutsch');
});

test('manual override slot remains blocked after description edits', () => {
  const context = { workbookKey: 'book', sheetName: 'Sheet', vocabularyId: 'TEST' };
  assert.equal(autoSlotKey(context, field, 0, 'meaning'), autoSlotKey(context, { ...field, description: 'Edited by researcher' }, 0, 'meaning'));
  assert.notEqual(autoSlotKey(context, field, 0, 'meaning'), autoSlotKey({ ...context, sheetName: 'Other' }, field, 0, 'meaning'));
});
