/** Server-side OpenAI-compatible reranking bridge. Credentials stay in server environment. */
export async function proxyAnnotationRerank(request, response) {
  const key = process.env.ANNOTATION_RERANK_API_KEY;
  const model = process.env.ANNOTATION_RERANK_MODEL;
  if (!key || !model) {
    response.writeHead(503, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Configure ANNOTATION_RERANK_API_KEY and ANNOTATION_RERANK_MODEL.' }));
    return;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 100_000) { response.writeHead(413); response.end(); return; }
    chunks.push(chunk);
  }
  try {
    const { messages } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!Array.isArray(messages) || messages.length !== 2) throw new Error('Invalid prompt.');
    const upstream = await fetch(process.env.ANNOTATION_RERANK_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0, response_format: { type: 'json_object' } }),
    });
    if (!upstream.ok) throw new Error(`Provider returned ${upstream.status}.`);
    const payload = await upstream.json();
    const result = JSON.parse(payload?.choices?.[0]?.message?.content || 'null');
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ result }));
  } catch (error) {
    response.writeHead(502, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: error.message }));
  }
}
