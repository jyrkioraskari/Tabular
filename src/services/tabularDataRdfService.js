export function serializeTabularDataInWorker(
  sheets,
  { signal, onProgress } = {},
) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./tabularDataRdf.worker.js', import.meta.url), {
      type: 'module',
    });

    const dispose = () => {
      signal?.removeEventListener('abort', handleAbort);
      worker.terminate();
    };

    const handleAbort = () => {
      dispose();
      reject(new DOMException('Tabular RDF conversion was cancelled.', 'AbortError'));
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
    worker.addEventListener('message', (event) => {
      const { type, progress, turtle, error } = event.data ?? {};

      if (type === 'progress') {
        onProgress?.(progress);
        return;
      }

      dispose();

      if (type === 'complete') {
        resolve(turtle || '');
      } else {
        reject(new Error(error || 'Could not convert the tabular data to RDF.'));
      }
    });
    worker.addEventListener('error', (event) => {
      dispose();
      reject(new Error(event.message || 'Tabular RDF conversion worker failed.'));
    });
    worker.postMessage({ sheets });
  });
}
