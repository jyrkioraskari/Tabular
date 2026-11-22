import assert from 'node:assert/strict';
import test from 'node:test';
import { annotationInputFingerprint, buildColumnAnnotationQuery } from '../src/services/columnAnnotationQuery.js';

test('column query uses its description and only associated metadata', () => {
  const fields = [
    { header: 'Time', description: 'Elapsed time' },
    { header: 'F [kN]', description: 'Force applied by the actuator', notes: 'Peak load' },
    { header: 'Displacement', description: 'Travel' },
  ];
  assert.deepEqual(buildColumnAnnotationQuery(fields, 1, 'Test sheet'), {
    description: 'Force applied by the actuator',
    header: 'F [kN]',
    sheetName: 'Test sheet',
    neighboringHeaders: ['Time', 'Displacement'],
    notes: 'Peak load',
  });
});

test('fingerprint changes with evidence and context, not applied links', () => {
  const base = { fields: [{ header: 'F [kN]', description: 'Force', notes: '' }], workbookKey: 'book-a', sheetName: 'Sheet 1', vocabularyId: 'v1', language: 'en', quantityKind: '' };
  const key = annotationInputFingerprint(base);
  assert.equal(annotationInputFingerprint({ ...base, fields: [{ ...base.fields[0], descriptionUri: 'urn:concept', unitUri: 'urn:unit' }] }), key);
  for (const change of [
    { workbookKey: 'book-b' },
    { sheetName: 'Sheet 2' },
    { vocabularyId: 'v2' },
    { fields: [{ ...base.fields[0], description: 'Load' }] },
  ]) assert.notEqual(annotationInputFingerprint({ ...base, ...change }), key);
});
