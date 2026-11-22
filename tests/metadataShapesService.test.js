import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchExternalClassInstances } from '../src/services/metadataShapesService.js';

test('unavailable external vocabularies report failed URLs without losing usable graphs', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('unavailable')) {
      return new Response(JSON.stringify({ message: 'External RDF vocabulary is unavailable.', upstreamStatus: 503 }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('<https://example.org/value> <http://www.w3.org/2000/01/rdf-schema#label> "Value" .', {
      status: 200, headers: { 'Content-Type': 'text/turtle' },
    });
  };
  try {
    let failures;
    const rdf = await fetchExternalClassInstances([
      'https://example.org/usable',
      'https://example.org/unavailable',
    ], { onError: (items) => { failures = items; } });
    assert.match(rdf, /https:\/\/example.org\/value/);
    assert.equal(failures.length, 1);
    assert.equal(failures[0].url, 'https://example.org/unavailable');
    await assert.rejects(
      fetchExternalClassInstances('https://example.org/all-unavailable', { onError: (items) => { failures = items; } }),
      /503/,
    );
    assert.equal(failures.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
