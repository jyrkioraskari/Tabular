export function readBrowserDraft(key) {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function writeBrowserDraft(key, draft) {
  window.localStorage.setItem(key, JSON.stringify(draft));
}

export function deleteBrowserDraft(key) {
  window.localStorage.removeItem(key);
}

export function deleteBrowserDraftsWithPrefix(prefix) {
  const storage = window.localStorage;
  const keys = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }

  for (const key of keys) {
    storage.removeItem(key);
  }
}
