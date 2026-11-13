import { readFile } from 'node:fs/promises';
import { evaluateAnnotationSuggestions } from '../src/services/annotationSuggestions.js';
import { rerankCandidates } from '../src/services/annotationReranker.js';

const [fileName, ontologyId, endpoint = 'http://127.0.0.1:4173/annotation-rerank'] = process.argv.slice(2);
if (!fileName || !ontologyId) {
  console.error('Usage: node scripts/evaluateAnnotations.mjs labelled-columns.json VOCABULARY_ID [rerank-endpoint]');
  process.exitCode = 2;
} else {
  const labelled = JSON.parse(await readFile(fileName, 'utf8'));
  const report = await evaluateAnnotationSuggestions(labelled, {
    ontologyId,
    rerank: (query, candidates, options) => rerankCandidates(query, candidates, { ...options, endpoint }),
  });
  console.log(JSON.stringify(report, null, 2));
}
