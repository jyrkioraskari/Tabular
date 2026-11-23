import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieveCandidates, suggestMeanings, evaluateAnnotationSuggestions } from '../src/services/annotationSuggestions.js';
import { canRetrieveDescriptionMeaning } from '../src/services/columnAnnotationQuery.js';
import { validateRerankResponse } from '../src/services/annotationReranker.js';
import { localizedUnitRows, suggestUnit } from '../src/services/annotationUnits.js';
import { serializeColumnDescriptionsToTurtle } from '../src/services/columnDescriptionRdf.js';

const terms = [
  { iri: 'https://example.org/applied-load', label: 'Applied load', definition: 'Force applied to an object', synonyms: ['Actuator force'] },
  { iri: 'https://example.org/voltage', label: 'Voltage', definition: 'Electric potential difference', synonyms: [] },
];

test('description retrieval skips blank text and retains contrasting candidates in rerank order', async () => {
  const modulusTerms = [
    { iri: 'https://example.org/young-modulus', label: "Young's modulus", definition: 'Elastic stiffness under tensile loading', ontologyId: 'materials' },
    { iri: 'https://example.org/voltage', label: 'Voltage', definition: 'Electric potential difference', ontologyId: 'electrical' },
  ];
  assert.equal(canRetrieveDescriptionMeaning({ description: '  ' }, true), false);
  assert.equal(canRetrieveDescriptionMeaning({ description: 'Young modulus' }, true), true);
  const skipped = await suggestMeanings({ header: 'E_mod', description: '  ' }, {
    snapshotLoader: () => { throw Error('retrieval must not run'); },
  });
  assert.equal(skipped.source, 'no description');
  const result = await suggestMeanings({ header: 'E_mod', description: 'Elastic modulus in GPa' }, {
    ontologyId: 'test',
    snapshotLoader: async () => ({ terms: modulusTerms, fingerprint: 'e-mod-fixture' }),
    embed: async (texts) => texts.map((text) => text.includes('Voltage') ? [0, 1] : [1, 0]),
    rerank: async (_, candidates) => ({ ranked: [
      { ...candidates[0], supported: true, reason: 'Elastic modulus describes stiffness' },
      { ...candidates[1], supported: false, reason: 'Voltage measures potential difference' },
    ], ambiguous: false }),
  });
  assert.deepEqual(result.candidates.map((term) => term.iri), modulusTerms.map((term) => term.iri));
  assert.equal(result.candidates[1].supported, false);
});

test('glossary retrieval searches all vocabularies without an ontology ID', async () => {
  const result = await retrieveCandidates({ description: 'Applied load', header: 'Force' }, {
    snapshotLoader: async ({ ontologyId }) => {
      assert.equal(ontologyId, undefined);
      return null;
    },
    search: async ({ ontologyId }) => {
      assert.equal(ontologyId, undefined);
      return { terms: [terms[0]] };
    },
  });
  assert.equal(result.candidates[0].iri, terms[0].iri);
  assert.equal(result.source, 'Terminology Service fallback');
});

test('header-only columns can retrieve a meaning and explicit header unit', async () => {
  const retrieved = await retrieveCandidates({ description: '', header: 'Actuator force [kN]' }, {
    ontologyId: 'test', snapshotLoader: async () => ({ terms, fingerprint: 'header-only-test' }),
    embed: async (texts) => texts.map((text) => text.includes('Voltage') ? [0, 1] : [1, 0]),
  });
  assert.equal(retrieved.candidates[0].iri, terms[0].iri);
  const unit = await suggestUnit({ description: '', header: 'Actuator force [kN]' }, async () => [
    { unit: 'http://qudt.org/vocab/unit/KiloN', label: 'Kilonewton', labelLanguage: 'en', symbols: ['kN'], quantityKinds: ['force'] },
  ]);
  assert.equal(unit.unit.unit, 'http://qudt.org/vocab/unit/KiloN');
  const absent = await retrieveCandidates({ description: '', header: '' }, { snapshotLoader: () => { throw Error('should not load'); } });
  assert.deepEqual(absent.candidates, []);
});

test('description embedding can retrieve applied load and explicit header resolves kN', async () => {
  const retrieved = await retrieveCandidates({ description: 'Force applied by the actuator', header: 'F [kN]' }, {
    ontologyId: 'test', snapshotLoader: async () => ({ terms, fingerprint: 'test-version-1' }),
    embed: async (texts) => texts.map((text) => text.includes('Voltage') ? [0, 1] : [1, 0]),
  });
  assert.equal(retrieved.source, 'semantic snapshot');
  assert.equal(retrieved.candidates[0].iri, terms[0].iri);
  const unit = await suggestUnit({ description: 'Force applied by the actuator', header: 'F [kN]', quantityKind: 'force' }, async () => [
    { unit: 'http://qudt.org/vocab/unit/KiloN', label: 'Kilonewton', labelLanguage: 'en', symbols: ['kN'], quantityKinds: ['force'] },
    { unit: 'http://qudt.org/vocab/unit/KiloN', label: 'Kilonewton (German)', labelLanguage: 'de', symbols: ['kN'], quantityKinds: ['force'] },
  ]);
  assert.equal(unit.unit.unit, 'http://qudt.org/vocab/unit/KiloN');
  assert.equal(unit.unit.label, 'Kilonewton');
  assert.equal(unit.unit.labelLanguage, 'en');
  assert.equal(unit.reason, '[kN] in the header');
});

test('unit proposals follow the interface language with English fallback', async () => {
  const rows = [
    { unit: 'http://qudt.org/vocab/unit/KiloN', label: 'English kilonewton', labelLanguage: 'en', symbols: ['kN'], quantityKinds: ['force'] },
    { unit: 'http://qudt.org/vocab/unit/KiloN', label: 'Deutsches Kilonewton', labelLanguage: 'de', symbols: ['kN'], quantityKinds: ['force'] },
  ];
  const query = { description: '', header: 'F [kN]' };
  const german = await suggestUnit({ ...query, language: 'de' }, async () => rows);
  const english = await suggestUnit({ ...query, language: 'fr' }, async () => rows);
  assert.equal(german.unit.label, 'Deutsches Kilonewton');
  assert.equal(german.unit.labelLanguage, 'de');
  assert.equal(english.unit.label, 'English kilonewton');
  assert.equal(english.unit.labelLanguage, 'en');
  assert.equal(localizedUnitRows(rows.slice(0, 1), 'de')[0].label, 'English kilonewton');
});

test('reranker rejects invented IDs and preserves canonical URI for export', () => {
  assert.throws(() => validateRerankResponse({ ranked: [{ id: 'C9', supported: true, reason: 'force' }, { id: 'C2', supported: false, reason: '' }], ambiguous: false }, terms));
  const ranked = validateRerankResponse({ ranked: [{ id: 'C1', supported: true, reason: 'Force applied' }, { id: 'C2', supported: false, reason: '' }], ambiguous: true }, terms);
  assert.equal(ranked.ranked[0].iri, terms[0].iri);
  const rdf = serializeColumnDescriptionsToTurtle([{ header: 'F [kN]', description: 'Force applied by the actuator', descriptionUri: ranked.ranked[0].iri }]);
  assert.match(rdf, /Force applied by the actuator/);
  assert.match(rdf, /https:\/\/example\.org\/applied-load/);
});

test('evaluation reports retrieval, before and after Hit@3, and abstention', async () => {
  const result = await evaluateAnnotationSuggestions([{ description: 'Force applied', header: 'F', goldUri: terms[0].iri }], {
    ontologyId: 'test', snapshotLoader: async () => ({ terms, fingerprint: 'test-version-2' }),
    embed: async (texts) => texts.map((text) => text.includes('Voltage') ? [0, 1] : [1, 0]),
    search: async () => ({ terms: [terms[1], terms[0]] }),
    rerank: async (_, candidates) => ({ ranked: [{ ...candidates[0], supported: true }, { ...candidates[1], supported: false }], ambiguous: false }),
  });
  assert.deepEqual([result.recallAtCutoff, result.hitAt3Before, result.hitAt3After, result.abstentionRate], [1, 1, 1, 0]);
  assert.deepEqual([result.autoApplyRate, result.autoPrecision], [1, 1]);
});
