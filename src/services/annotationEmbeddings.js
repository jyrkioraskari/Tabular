/** Local embedding adapter. The same model and pooling are used for terms and queries. */
export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
let extractorPromise;

export async function embedTexts(texts) {
  if (!extractorPromise) {
    extractorPromise = import('@huggingface/transformers')
      .then(({ pipeline }) => pipeline('feature-extraction', EMBEDDING_MODEL))
      .catch((error) => { extractorPromise = undefined; throw error; });
  }
  const extractor = await extractorPromise;
  const vectors = [];
  for (const value of texts) {
    const output = await extractor(value, { pooling: 'mean', normalize: true });
    vectors.push(Array.from(output.data));
  }
  return vectors;
}
