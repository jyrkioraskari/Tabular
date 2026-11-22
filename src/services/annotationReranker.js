/** RankGPT-style listwise adapter. IDs are scoped to one shortlist and never become URIs. */
export function makeRerankPrompt(query, candidates) {
  return [
    { role: 'system', content: 'Rank vocabulary concepts by how precisely the column evidence supports their definitions. If a description exists, use it as primary evidence; otherwise use the header, sheet, neighboring headers and notes. Do not infer from measurement rows. Return JSON only: {"ranked":[{"id":"C1","supported":true,"reason":"short evidence-based reason"}],"ambiguous":false}. Include every candidate exactly once. Mark unsupported matches false; set ambiguous true when several meanings remain plausible. Do not invent IDs.' },
    { role: 'user', content: JSON.stringify({ column: query, candidates: candidates.map((term, index) => ({ id: `C${index + 1}`, label: term.label, definition: term.definition })) }) },
  ];
}

export function validateRerankResponse(raw, candidates) {
  const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!result || !Array.isArray(result.ranked) || typeof result.ambiguous !== 'boolean' || result.ranked.length !== candidates.length) throw new Error('Invalid reranking response. Retry suggestions.');
  const ids = new Set(candidates.map((_, index) => `C${index + 1}`));
  const seen = new Set();
  const ranked = result.ranked.map((item) => {
    if (!ids.has(item?.id) || seen.has(item.id) || typeof item.supported !== 'boolean' || typeof item.reason !== 'string' || (item.supported && !item.reason.trim())) throw new Error('Invalid reranking candidate ID or item. Retry suggestions.');
    seen.add(item.id);
    return { ...candidates[Number(item.id.slice(1)) - 1], supported: item.supported, reason: item.reason.trim() };
  });
  return { ranked, ambiguous: result.ambiguous };
}

export async function rerankCandidates(query, candidates, { endpoint = '/annotation-rerank', signal } = {}) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: makeRerankPrompt(query, candidates) }), signal });
  if (!response.ok) throw new Error(`Reranking unavailable (${response.status}). Retry suggestions.`);
  const payload = await response.json();
  return validateRerankResponse(payload?.result, candidates);
}
