import { serializeTabularDataToTurtle } from './tabularDataRdf';

self.addEventListener('message', (event) => {
  const { sheets } = event.data ?? {};

  try {
    const turtle = serializeTabularDataToTurtle(sheets, {
      onProgress: (progress) => self.postMessage({ type: 'progress', progress }),
    });
    self.postMessage({ type: 'complete', turtle });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error?.message || 'Could not convert the tabular data to RDF.',
    });
  }
});
