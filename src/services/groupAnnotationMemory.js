export const GROUP_MEMORY_SETTINGS_KEY = 'tabular-rdm.group-annotation-memory-settings.v1';

export function readGroupMemorySettings() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(GROUP_MEMORY_SETTINGS_KEY) || 'null');
    return { enabled: parsed?.enabled === true, code: typeof parsed?.code === 'string' ? parsed.code : '' };
  } catch {
    return { enabled: false, code: '' };
  }
}

export function writeGroupMemorySettings(settings) {
  globalThis.localStorage.setItem(GROUP_MEMORY_SETTINGS_KEY, JSON.stringify(settings));
}

async function requestGroupMemory(action, code, records, signal) {
  const response = await fetch(`/annotation-memory/group/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, ...(records ? { records } : {}) }),
    signal,
  });
  let payload;
  try { payload = await response.json(); } catch { throw new Error('Shared memory server returned an invalid response.'); }
  if (!response.ok || !Array.isArray(payload?.records)) throw new Error(payload?.error || 'Could not access shared memory.');
  return payload.records;
}

export function loadGroupAnnotations(code, signal) {
  return requestGroupMemory('read', code, null, signal);
}

export function shareGroupAnnotations(code, records, signal) {
  return requestGroupMemory('write', code, records, signal);
}
