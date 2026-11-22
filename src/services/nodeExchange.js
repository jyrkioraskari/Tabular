/**
 * JSON exchange of user-created workflow nodes. Exported files carry node
 * configuration only; loaded spreadsheet content never leaves the browser
 * through this module. Import is JSON-shape plus known-type validation only —
 * shared files are never evaluated as code.
 */
import { v4 as uuidv4 } from 'uuid';

export const NODE_EXCHANGE_APP_ID = 'tabular-rdm';
export const NODE_EXCHANGE_VERSION = 1;
export const NODE_EXCHANGE_MAX_BYTES = 2_000_000;

function isBlockedValue(value) {
  return (
    typeof value === 'function' ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    value instanceof Map ||
    value instanceof Set ||
    (typeof Blob !== 'undefined' && value instanceof Blob) ||
    (typeof File !== 'undefined' && value instanceof File)
  );
}

function isPlainObject(value) {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Deep-copies node data keeping only JSON-safe values. Functions, binary
 * payloads (ArrayBuffer/Blob/File), Map/Set, and values that fail a JSON
 * round-trip are dropped; circular references are pruned at the link so the
 * result always survives JSON.stringify. `sourceFile` is always stripped so
 * shared nodes carry configuration, not data. Unsafe array items become null
 * to preserve indexes.
 */
export function sanitizeNodeData(data) {
  const sanitizeValue = (value, seen) => {
    if (value === null) return null;

    const type = typeof value;
    if (type === 'string' || type === 'boolean') return value;
    if (type === 'number') return Number.isFinite(value) ? value : undefined;
    if (type !== 'object') return undefined;
    if (isBlockedValue(value) || seen.has(value)) return undefined;

    if (!Array.isArray(value) && !isPlainObject(value)) {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return undefined;
      }
    }

    seen.add(value);
    try {
      if (Array.isArray(value)) {
        return value.map((item) => {
          const sanitized = sanitizeValue(item, seen);
          return sanitized === undefined ? null : sanitized;
        });
      }

      const result = {};
      for (const [key, entry] of Object.entries(value)) {
        if (['sourceFile', 'webhookUrl', 'authHeaderValue', 'n8nOutput', 'n8nError', 'n8nStatus'].includes(key)) continue;
        const sanitized = sanitizeValue(entry, seen);
        if (sanitized !== undefined) result[key] = sanitized;
      }
      return result;
    } finally {
      seen.delete(value);
    }
  };

  const sanitized = sanitizeValue(data, new Set());
  return sanitized === undefined ? {} : sanitized;
}

/**
 * Serializes nodes (and, when selectionIds is given, only the selected nodes
 * plus the edges between them) into a portable JSON payload.
 */
export function serializeSelection({ nodes, edges, selectionIds, name }) {
  const allNodes = Array.isArray(nodes) ? nodes : [];
  const allEdges = Array.isArray(edges) ? edges : [];
  const selectedIds =
    Array.isArray(selectionIds) && selectionIds.length > 0 ? new Set(selectionIds) : null;

  const exportedNodes = selectedIds
    ? allNodes.filter((node) => selectedIds.has(node.id))
    : allNodes;
  const exportedIds = new Set(exportedNodes.map((node) => node.id));
  const exportedEdges = selectedIds
    ? allEdges.filter((edge) => exportedIds.has(edge.source) && exportedIds.has(edge.target))
    : allEdges;

  const fallbackName =
    exportedNodes.length === 1
      ? String(exportedNodes[0]?.data?.label ?? '').trim() || 'node'
      : 'workflow';

  return {
    app: NODE_EXCHANGE_APP_ID,
    kind: exportedNodes.length === 1 ? 'node' : 'workflow',
    version: NODE_EXCHANGE_VERSION,
    exportedAt: new Date().toISOString(),
    name: typeof name === 'string' && name.trim() ? name.trim() : fallbackName,
    nodes: exportedNodes.map((node) => ({
      // The original id is kept so importers can remap edge endpoints onto the
      // fresh ids they assign; it is replaced on import.
      id: node.id,
      type: node.type,
      position: {
        x: Number.isFinite(node.position?.x) ? node.position.x : 0,
        y: Number.isFinite(node.position?.y) ? node.position.y : 0,
      },
      data: sanitizeNodeData(node.data),
    })),
    edges: exportedEdges.map((edge) => ({ source: edge.source, target: edge.target })),
  };
}

function normalizePosition(position) {
  if (
    position &&
    typeof position === 'object' &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.y)
  ) {
    return { x: position.x, y: position.y };
  }
  return null;
}

/**
 * Validates an imported payload against the compiled-in node types and the
 * connection rules. Every imported node gets a fresh id; edges are remapped
 * through the old→new id map and dropped when their endpoints are unknown or
 * the connection is not supported. Returns { nodes, edges, warnings } or
 * { error } when the payload must be rejected outright.
 */
export function validateImportPayload(
  payload,
  { knownTypes, isValidConnection, existingNodeIds, untrustedTypes } = {},
) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'The file is not a Tabular JSON export.' };
  }
  if (payload.app !== NODE_EXCHANGE_APP_ID) {
    return { error: 'The file was not exported by Tabular (missing tabular-rdm marker).' };
  }
  if (payload.version !== NODE_EXCHANGE_VERSION) {
    return {
      error: `Unsupported export version ${JSON.stringify(payload.version ?? null)}; expected ${NODE_EXCHANGE_VERSION}.`,
    };
  }
  if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    return { error: 'The export does not contain nodes and edges arrays.' };
  }

  const knownTypeSet = new Set(knownTypes ?? []);
  const untrustedTypeSet = new Set(untrustedTypes ?? []);
  const takenIds = new Set(existingNodeIds ?? []);
  const warnings = [];
  const idMap = new Map();
  const nodes = [];

  for (const rawNode of payload.nodes) {
    const type = rawNode?.type;

    if (!knownTypeSet.has(type)) {
      warnings.push(`Skipped a node of unknown type "${String(type ?? 'unknown')}".`);
      continue;
    }

    let id = uuidv4();
    while (takenIds.has(id)) {
      id = uuidv4();
    }
    takenIds.add(id);

    if (rawNode.id !== undefined && rawNode.id !== null) {
      idMap.set(String(rawNode.id), id);
    }

    const position = normalizePosition(rawNode.position);
    if (!position) {
      warnings.push(
        `Node "${String(rawNode.data?.label ?? type)}" had an invalid position and was placed at the origin.`,
      );
    }

    let nodeData = sanitizeNodeData(rawNode.data);
    if (untrustedTypeSet.has(type)) {
      // Imported code (e.g. Python node scripts) is data, not something the
      // app executes on its own; the user must explicitly trust it on the node.
      nodeData = { ...nodeData, trusted: false };
      warnings.push(
        `Node "${String(rawNode.data?.label ?? type)}" was imported with its code disabled; enable it on the node before it runs.`,
      );
    }

    nodes.push({
      id,
      type,
      position: position ?? { x: 0, y: 0 },
      data: nodeData,
    });
  }

  const edges = [];
  const seenPairs = new Set();

  for (const rawEdge of payload.edges) {
    const source = idMap.get(String(rawEdge?.source));
    const target = idMap.get(String(rawEdge?.target));

    if (!source || !target) {
      warnings.push('Skipped a connection with unknown endpoints.');
      continue;
    }
    if (source === target) {
      warnings.push('Skipped a connection from a node to itself.');
      continue;
    }

    const pairKey = `${source}->${target}`;
    if (seenPairs.has(pairKey)) {
      continue;
    }
    seenPairs.add(pairKey);

    if (
      typeof isValidConnection === 'function' &&
      !isValidConnection({ source, target }, nodes, edges)
    ) {
      warnings.push('Skipped an unsupported connection between the imported nodes.');
      continue;
    }

    edges.push({ id: `import-${uuidv4()}`, source, target });
  }

  return { nodes, edges, warnings };
}

/** Downloads a JSON payload through a temporary anchor, like the RO-Crate export. */
export function downloadJsonFile(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Reads and parses an imported JSON file. Oversized files and invalid JSON are
 * rejected with a clear error; the parsed payload is returned on success.
 */
export async function readJsonFile(file, { maxBytes = NODE_EXCHANGE_MAX_BYTES } = {}) {
  if (!file) {
    throw new Error('No file was selected.');
  }
  if (typeof file.size === 'number' && file.size > maxBytes) {
    throw new Error(
      `The file is larger than ${Math.round(maxBytes / 1000)} kB and cannot be imported.`,
    );
  }

  let text;
  if (typeof file.text === 'function') {
    text = await file.text();
  } else {
    text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The file could not be read.'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(file);
    });
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('The file does not contain valid JSON.');
  }
}
