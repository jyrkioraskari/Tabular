import { Parser } from 'n3';

self.addEventListener('message', (event) => {
  const { turtle } = event.data ?? {};
  let tripleCount = 0;

  try {
    const parser = new Parser({ format: 'text/turtle' });
    parser.parse(String(turtle ?? ''), (error, quad) => {
      if (error) {
        self.postMessage({ type: 'error', error: error.message });
        return;
      }

      if (quad) {
        tripleCount += 1;
        return;
      }

      self.postMessage({ type: 'complete', tripleCount });
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error?.message || 'Could not parse the generated RDF.',
    });
  }
});
