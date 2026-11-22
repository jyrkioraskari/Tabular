import assert from 'node:assert/strict';
import test from 'node:test';
import { searchConceptOptions, searchUnitOptions } from '../src/services/annotationAutocomplete.js';

test('manual concept search maps terminology records to an annotation choice', async () => {
  const options = await searchConceptOptions('load', {
    language: 'en', vocabularyId: 'mechanics', limit: 8,
    search: async (request) => {
      assert.equal(request.ontologyId, 'mechanics');
      return { terms: [{ iri: 'urn:load', label: 'Applied load', language: 'en' }] };
    },
  });
  assert.deepEqual(options[0].payload, {
    description: 'Applied load', descriptionUri: 'urn:load',
    descriptionLanguage: 'en', vocabularyId: 'mechanics',
  });
});

test('manual unit search prefers quantity-kind compatible rows and English labels', async () => {
  const units = [
    { unit: 'urn:force', label: 'Kilonewton', labelLanguage: 'en', quantityKinds: ['force'] },
    { unit: 'urn:force', label: 'Kilonewton Deutsch', labelLanguage: 'de', quantityKinds: ['force'] },
    { unit: 'urn:other', label: 'Kilonewton equivalent', labelLanguage: 'en', quantityKinds: ['energy'] },
  ];
  const lookup = async () => units;
  const compatible = await searchUnitOptions('kilo', { language: 'en', quantityKindFilter: 'force', lookup });
  assert.deepEqual(compatible.map((option) => option.payload.unitUri), ['urn:force']);
  assert.equal(compatible[0].label, 'Kilonewton');
  const fallback = await searchUnitOptions('kilo', { language: 'en', quantityKindFilter: 'missing', lookup });
  assert.equal(fallback.length, 2);
});
