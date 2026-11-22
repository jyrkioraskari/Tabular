/**
 * Browser-local "My nodes" library: configured nodes the user saved for reuse.
 * Stored in localStorage through the browserDrafts helpers; entries carry
 * sanitized node configuration only, never loaded file content.
 */
import { v4 as uuidv4 } from 'uuid';
import { readBrowserDraft, writeBrowserDraft } from './browserDrafts.js';
import { sanitizeNodeData } from './nodeExchange.js';

export const NODE_LIBRARY_KEY = 'tabular-rdm.node-library.v1';
export const NODE_LIBRARY_MAX_ENTRIES = 100;

export function readNodeLibrary() {
  const entries = readBrowserDraft(NODE_LIBRARY_KEY);
  return Array.isArray(entries) ? entries : [];
}

function writeNodeLibrary(entries) {
  writeBrowserDraft(NODE_LIBRARY_KEY, entries);
}

/**
 * Saves a configured node. The node type must be one of the compiled-in types
 * and the data is sanitized before storage. The library is capped and sorted
 * newest first. Returns the created entry.
 */
export function addNodeLibraryEntry({ name, nodeType, data }, knownTypes) {
  if (!Array.isArray(knownTypes) || !knownTypes.includes(nodeType)) {
    throw new Error(`Unknown node type "${String(nodeType ?? 'unknown')}".`);
  }

  const entry = {
    id: uuidv4(),
    name: typeof name === 'string' && name.trim() ? name.trim() : String(nodeType),
    nodeType,
    data: sanitizeNodeData(data),
    savedAt: new Date().toISOString(),
  };

  const next = [entry, ...readNodeLibrary()].slice(0, NODE_LIBRARY_MAX_ENTRIES);
  writeNodeLibrary(next);
  return entry;
}

export function removeNodeLibraryEntry(id) {
  writeNodeLibrary(readNodeLibrary().filter((entry) => entry.id !== id));
}

export function renameNodeLibraryEntry(id, name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return;

  writeNodeLibrary(
    readNodeLibrary().map((entry) => (entry.id === id ? { ...entry, name: trimmed } : entry)),
  );
}
