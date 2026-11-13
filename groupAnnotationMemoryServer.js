import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';

const MAX_BODY_BYTES = 180_000;
const MAX_RECORDS = 300;
const writeQueues = new Map();

function send(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

function groupPath(code) {
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{12,80}$/.test(code)) throw new Error('Use a group code of at least 12 letters or digits.');
  const digest = createHash('sha256').update(code).digest('hex');
  return join(resolve(process.env.TABULAR_GROUP_MEMORY_DIR || '.tabular-group-memory'), `${digest}.json`);
}

function cleanRecord(value) {
  if (!value || !['meaning', 'unit'].includes(value.kind) || typeof value.uri !== 'string' || !/^[a-z][a-z0-9+.-]*:[^\s<>]+$/i.test(value.uri) || value.uri.length > 2000) return null;
  const text = (item, limit) => typeof item === 'string' ? item.slice(0, limit) : '';
  return {
    kind: value.kind,
    uri: value.uri,
    label: text(value.label, 300),
    header: text(value.header, 300),
    description: text(value.description, 2000),
    language: text(value.language, 30),
    vocabularyId: text(value.vocabularyId, 100),
    savedAt: Number.isFinite(value.savedAt) ? value.savedAt : Date.now(),
  };
}

async function load(path) {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'));
    return Array.isArray(parsed) ? parsed.map(cleanRecord).filter(Boolean) : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function recordKey(record) {
  return [record.kind, record.uri, record.header.toLocaleLowerCase(), record.description.toLocaleLowerCase(), record.vocabularyId].join('|');
}

async function save(path, incoming) {
  const existing = await load(path);
  const merged = new Map(existing.map((record) => [recordKey(record), record]));
  for (const record of incoming) merged.set(recordKey(record), { ...record, savedAt: Date.now() });
  const records = [...merged.values()].sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_RECORDS);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(records), { mode: 0o600 });
  await rename(temp, path);
  return records;
}

export async function handleGroupAnnotationMemory(request, response) {
  if (request.method !== 'POST' || !['/annotation-memory/group/read', '/annotation-memory/group/write'].includes(request.url)) {
    send(response, 404, { error: 'Not found.' });
    return;
  }
  let size = 0;
  const chunks = [];
  try {
    for await (const chunk of request) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { send(response, 413, { error: 'Request too large.' }); return; }
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const path = groupPath(body.code);
    if (request.url.endsWith('/read')) {
      send(response, 200, { records: await load(path) });
      return;
    }
    if (!Array.isArray(body.records) || body.records.length > MAX_RECORDS) throw new Error('Invalid shared annotations.');
    const incoming = body.records.map(cleanRecord);
    if (incoming.some((record) => !record)) throw new Error('Invalid shared annotation.');
    const previous = writeQueues.get(path) || Promise.resolve();
    const current = previous.catch(() => {}).then(() => save(path, incoming));
    writeQueues.set(path, current);
    try { send(response, 200, { records: await current }); }
    finally { if (writeQueues.get(path) === current) writeQueues.delete(path); }
  } catch (error) {
    send(response, 400, { error: error.message || 'Invalid request.' });
  }
}
