export function countTurtleTriplesInWorker(turtle, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./rdfTripleCount.worker.js', import.meta.url), {
      type: 'module',
    });

    const dispose = () => {
      signal?.removeEventListener('abort', handleAbort);
      worker.terminate();
    };

    const handleAbort = () => {
      dispose();
      reject(new DOMException('RDF parsing was cancelled.', 'AbortError'));
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
    worker.addEventListener('message', (event) => {
      const { type, tripleCount, error } = event.data ?? {};
      dispose();

      if (type === 'complete') {
        resolve(tripleCount ?? 0);
      } else {
        reject(new Error(error || 'Could not parse the generated RDF.'));
      }
    });
    worker.addEventListener('error', (event) => {
      dispose();
      reject(new Error(event.message || 'RDF parsing worker failed.'));
    });
    worker.postMessage({ turtle });
  });
}
