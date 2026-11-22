import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleGroupAnnotationMemory } from '../groupAnnotationMemoryServer.js';

test('shared choices persist by group code and remain separate from other groups', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tabular-group-memory-'));
  const oldDirectory = process.env.TABULAR_GROUP_MEMORY_DIR;
  process.env.TABULAR_GROUP_MEMORY_DIR = directory;
  const request = async (action, code, records) => {
    const input = Readable.from([Buffer.from(JSON.stringify({ code, ...(records ? { records } : {}) }))]);
    input.method = 'POST';
    input.url = `/annotation-memory/group/${action}`;
    let status;
    let body;
    await handleGroupAnnotationMemory(input, {
      writeHead: (value) => { status = value; },
      end: (value) => { body = JSON.parse(value); },
    });
    return { status, body };
  };
  try {
    const code = 'research-group-code-123456789';
    const choice = { kind: 'meaning', uri: 'https://example.org/applied-load', label: 'Applied load', header: 'Force', description: 'Actuator force', vocabularyId: 'TEST' };
    assert.equal((await request('write', code, [choice])).status, 200);
    assert.equal((await request('read', code)).body.records[0].uri, choice.uri);
    const unit = { kind: 'unit', uri: 'http://qudt.org/vocab/unit/KiloN', label: 'Kilonewton', header: 'Force [kN]', description: 'Actuator force' };
    assert.equal((await request('write', code, [unit])).status, 200);
    assert.equal((await request('read', code)).body.records.length, 2);
    assert.deepEqual((await request('read', 'another-group-code-123456')).body.records, []);
    assert.equal((await request('read', 'short')).status, 400);
  } finally {
    if (oldDirectory === undefined) delete process.env.TABULAR_GROUP_MEMORY_DIR;
    else process.env.TABULAR_GROUP_MEMORY_DIR = oldDirectory;
    await rm(directory, { recursive: true, force: true });
  }
});
