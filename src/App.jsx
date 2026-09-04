import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import * as XLSX from 'xlsx';
import '@xyflow/react/dist/style.css';
import TabularFileNode from './nodes/TabularFileNode';
import PreviewTabularDataNode from './nodes/PreviewTabularDataNode';
import ColumnDescriptionNode from './nodes/ColumnDescriptionNode';
import MetadataFormNode from './nodes/MetadataFormNode';
import MetadataProfileSearchNode from './nodes/MetadataProfileSearchNode';
import ROCrateNode from './nodes/ROCrateNode';
import QuantityKindNode from './nodes/QuantityKindNode';
import UnitNode from './nodes/UnitNode';
import CoscineNode from './nodes/CoscineNode';
import { fetchAimsApplicationProfileDefinition } from './services/aimsApi';
import { serializeColumnDescriptionsToTurtle } from './services/columnDescriptionRdf';
import tabularFileIcon from './assets/tabular-file-icon.png';
import spreadsheetIcon from './assets/matt-icons_text-x-office-generic-spreadsheet.svg';
import tabularSchemaIcon from './assets/tabular_schema.png';
import metadataFormIcon from './assets/Architetto_--_Formulario.svg';
import aimsIcon from './assets/aims.png';
import roCrateLogo from './assets/RO-Crate.png';
import qudtAvatar from './assets/qudt-avatar.jpg';
import coscineLogo from './assets/coscine_rgb.svg';
import rwthCaadLogo from './assets/rwth_caad_en_schwarz_grau_rgb.svg';
import nfdi4ingLogo from './assets/nfdi4ing_24.svg';

const nodeHandlers = {
  onTabularLoaded: undefined,
  onTabularHasHeaderChange: undefined,
  onTabularTransposeChange: undefined,
  onColumnDescriptionFieldsChange: undefined,
  onMetadataRdfChange: undefined,
  onProfileSelect: undefined,
  onCoscineApplicationProfileLoaded: undefined,
  onQuantityKindSelect: undefined,
};

function TabularFileNodeType(props) {
  return (
    <TabularFileNode
      {...props}
      onTabularLoaded={nodeHandlers.onTabularLoaded}
      onHasHeaderChange={nodeHandlers.onTabularHasHeaderChange}
      onTransposeChange={nodeHandlers.onTabularTransposeChange}
    />
  );
}

function ColumnDescriptionNodeType(props) {
  return (
    <ColumnDescriptionNode
      {...props}
      onFieldsChange={nodeHandlers.onColumnDescriptionFieldsChange}
    />
  );
}

function MetadataFormNodeType(props) {
  return <MetadataFormNode {...props} onRdfChange={nodeHandlers.onMetadataRdfChange} />;
}

function MetadataProfileSearchNodeType(props) {
  return (
    <MetadataProfileSearchNode
      {...props}
      onProfileSelect={nodeHandlers.onProfileSelect}
    />
  );
}

function QuantityKindNodeType(props) {
  return (
    <QuantityKindNode
      {...props}
      onQuantityKindSelect={nodeHandlers.onQuantityKindSelect}
    />
  );
}

function CoscineNodeType(props) {
  return (
    <CoscineNode
      {...props}
      onApplicationProfileLoaded={nodeHandlers.onCoscineApplicationProfileLoaded}
    />
  );
}

const nodeTypes = {
  tabularFile: TabularFileNodeType,
  previewTabular: PreviewTabularDataNode,
  columnDescription: ColumnDescriptionNodeType,
  headerSchema: ColumnDescriptionNodeType,
  metadataForm: MetadataFormNodeType,
  profileSearch: MetadataProfileSearchNodeType,
  quantityKind: QuantityKindNodeType,
  unit: UnitNode,
  roCrate: ROCrateNode,
  coscine: CoscineNodeType,
};

const initialNodes = [
  {
    id: 'tabular-source',
    type: 'tabularFile',
    position: { x: 40, y: 80 },
    data: {
      label: 'Tabular file 1',
      language: 'en',
      hasHeader: true,
      transpose: false,
    },
  },
  {
    id: 'column-description',
    type: 'columnDescription',
    position: { x: 940, y: 80 },
    data: { label: 'Column Descriptions 1', language: 'en', fields: [] },
  },
  {
    id: 'tabular-preview',
    type: 'previewTabular',
    position: { x: 400, y: 80 },
    data: { label: 'Preview Tabular Data 1', language: 'en' },
  },
  {
    id: 'quantity-kinds',
    type: 'quantityKind',
    position: { x: 40, y: 450 },
    data: { label: 'Quantity Kinds 1', language: 'en' },
  },
  {
    id: 'units',
    type: 'unit',
    position: { x: 500, y: 450 },
    data: { label: 'Units 1', language: 'en' },
  },
  {
    id: 'metadata-form',
    type: 'metadataForm',
    position: { x: 960, y: 450 },
    data: { label: 'Metadata Form 1', language: 'en' },
  },
  {
    id: 'ro-crate',
    type: 'roCrate',
    position: { x: 1800, y: 260 },
    data: { label: 'RO-Crate 1', language: 'en' },
  },
];

const tabularPreviewEdgeStyle = { stroke: '#2563eb', strokeWidth: 2 };
const savedLayoutsStorageKey = 'tabular-rdm.saved-layouts.v1';
/**
 * Highlights connections that carry workflow data between compatible nodes.
 * The styling is visual only; data propagation is handled by deriveNodeData().
 */
function applySemanticEdgeStyle(edge, nodes) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));

  if (
    (nodeTypesById.get(edge.source) === 'tabularFile' &&
      ['previewTabular', 'columnDescription', 'headerSchema'].includes(
        nodeTypesById.get(edge.target),
      )) ||
    (nodeTypesById.get(edge.source) === 'profileSearch' &&
      nodeTypesById.get(edge.target) === 'metadataForm') ||
    (nodeTypesById.get(edge.source) === 'quantityKind' &&
      nodeTypesById.get(edge.target) === 'unit') ||
    ([
      'tabularFile',
      'previewTabular',
      'metadataForm',
      'columnDescription',
      'headerSchema',
    ].includes(nodeTypesById.get(edge.source)) &&
      nodeTypesById.get(edge.target) === 'roCrate') ||
    (nodeTypesById.get(edge.source) === 'roCrate' &&
      nodeTypesById.get(edge.target) === 'coscine') ||
    (nodeTypesById.get(edge.source) === 'coscine' &&
      nodeTypesById.get(edge.target) === 'metadataForm')
  ) {
    return {
      ...edge,
      animated: true,
      style: {
        ...edge.style,
        ...tabularPreviewEdgeStyle,
      },
    };
  }

  return edge;
}

const initialEdges = [
  applySemanticEdgeStyle(
    {
      id: 'e1-2',
      source: 'tabular-source',
      target: 'column-description',
      animated: true,
    },
    initialNodes,
  ),
  applySemanticEdgeStyle(
    {
      id: 'e1-3',
      source: 'tabular-source',
      target: 'tabular-preview',
      animated: true,
    },
    initialNodes,
  ),
  applySemanticEdgeStyle(
    {
      id: 'e3-4',
      source: 'quantity-kinds',
      target: 'units',
      animated: true,
    },
    initialNodes,
  ),
  applySemanticEdgeStyle(
    {
      id: 'e1-7',
      source: 'tabular-source',
      target: 'ro-crate',
      animated: true,
    },
    initialNodes,
  ),
  applySemanticEdgeStyle(
    {
      id: 'e2-7',
      source: 'column-description',
      target: 'ro-crate',
      animated: true,
    },
    initialNodes,
  ),
  applySemanticEdgeStyle(
    {
      id: 'e6-7',
      source: 'metadata-form',
      target: 'ro-crate',
      animated: true,
    },
    initialNodes,
  ),
];

const nodeTemplates = [
  { type: 'tabularFile', label: 'Tabular file', icon: tabularFileIcon },
  { type: 'previewTabular', label: 'Preview Tabular Data', icon: spreadsheetIcon },
  { type: 'columnDescription', label: 'Column Descriptions', icon: tabularSchemaIcon },
  { type: 'quantityKind', label: 'Quantity Kinds', icon: qudtAvatar },
  { type: 'unit', label: 'Units', icon: qudtAvatar },
  { type: 'profileSearch', label: 'Metadata Profile Search', icon: aimsIcon },
  { type: 'metadataForm', label: 'Metadata Form', icon: metadataFormIcon },
  { type: 'roCrate', label: 'RO-Crate', icon: roCrateLogo },
  { type: 'coscine', label: 'Coscine', icon: coscineLogo },
];

const globalLanguageOptions = [
  {
    value: 'en',
    label: 'English',
    iconSrc: 'https://unpkg.com/language-icons/icons/en.svg',
  },
  {
    value: 'de',
    label: 'Deutsch',
    iconSrc: 'https://unpkg.com/language-icons/icons/de.svg',
  },
];

const appText = {
  en: {
    sidebarHeading: 'Tabular Data Management',
    sidebarIntro: 'Drag a button into the canvas to create a node where you drop it.',
    savedLayoutsHeading: 'Saved layouts',
    layoutNameLabel: 'Layout name',
    layoutNamePlaceholder: 'My workflow layout',
    saveLayout: 'Save',
    loadLayout: 'Load',
    deleteLayout: 'Delete',
    noSavedLayouts: 'No saved layouts',
    selectSavedLayout: 'Select a saved layout',
    layoutSaved: 'Layout saved in this browser.',
    layoutLoaded: 'Layout loaded.',
    layoutDeleted: 'Layout deleted.',
    layoutNameRequired: 'Enter a name first.',
    layoutSelectionRequired: 'Select a saved layout first.',
    layoutLoadFailed: 'Could not load the saved layout.',
  },
  de: {
    sidebarHeading: 'Management von tabellarischen Daten',
    sidebarIntro:
      'Ziehe eine Schaltfläche auf die Arbeitsfläche, um an der Stelle, an der du sie ablegst, einen Knoten zu erstellen.',
    savedLayoutsHeading: 'Gespeicherte Layouts',
    layoutNameLabel: 'Layoutname',
    layoutNamePlaceholder: 'Mein Workflow-Layout',
    saveLayout: 'Speichern',
    loadLayout: 'Laden',
    deleteLayout: 'Loeschen',
    noSavedLayouts: 'Keine gespeicherten Layouts',
    selectSavedLayout: 'Gespeichertes Layout auswaehlen',
    layoutSaved: 'Layout in diesem Browser gespeichert.',
    layoutLoaded: 'Layout geladen.',
    layoutDeleted: 'Layout geloescht.',
    layoutNameRequired: 'Gib zuerst einen Namen ein.',
    layoutSelectionRequired: 'Waehle zuerst ein gespeichertes Layout aus.',
    layoutLoadFailed: 'Das gespeicherte Layout konnte nicht geladen werden.',
  },
};

function readSavedLayouts() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(savedLayoutsStorageKey) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((layout) => layout && typeof layout.name === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeSavedLayouts(layouts) {
  window.localStorage.setItem(savedLayoutsStorageKey, JSON.stringify(layouts));
}

function cleanNodeForStorage(node) {
  const { dragging, selected, resizing, ...storedNode } = node;
  return storedNode;
}

function cleanEdgeForStorage(edge) {
  const { selected, ...storedEdge } = edge;
  return storedEdge;
}

function restoreSavedEdges(edges, nodes) {
  return edges.map((edge) => applySemanticEdgeStyle(cleanEdgeForStorage(edge), nodes));
}

/**
 * Creates editable column-description rows from spreadsheet headers while
 * preserving any descriptions and units already entered for unchanged headers.
 */
function buildColumnDescriptionFields(headers, previousFields = []) {
  const previousByHeader = new Map(
    previousFields.map((field) => [field.header, field]),
  );

  return headers.map((header) => {
    const existing = previousByHeader.get(header);

    return {
      header,
      description: existing?.description ?? '',
      unit: existing?.unit ?? '',
      unitUri: existing?.unitUri ?? '',
    };
  });
}

function buildNodeTypeCounts(nodes) {
  return nodes.reduce((counts, node) => {
    counts[node.type] = (counts[node.type] ?? 0) + 1;
    return counts;
  }, {});
}

function getNextNodeIdCount(nodes) {
  return nodes.reduce((highest, node) => {
    const match = /^node-(\d+)$/.exec(node.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, initialNodes.length);
}

function normalizeCellValue(value) {
  if (value == null) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value);
}

function isEmptyRow(row) {
  return row.every((cell) => normalizeCellValue(cell).trim().length === 0);
}

function getEffectiveColumnCount(row) {
  for (let index = row.length - 1; index >= 0; index -= 1) {
    if (normalizeCellValue(row[index]).trim().length > 0) {
      return index + 1;
    }
  }

  return 0;
}

function readWorksheetRows(worksheet, transpose = false) {
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: transpose,
    defval: '',
    raw: false,
  });
  let usableRows;

  if (transpose) {
    const initialColumnCount = getEffectiveColumnCount(rows[0] ?? []);
    const stopIndex = rows.findIndex(
      (row) =>
        isEmptyRow(row) || getEffectiveColumnCount(row) !== initialColumnCount,
    );
    usableRows = rows.slice(0, stopIndex < 0 ? rows.length : stopIndex);
  } else {
    usableRows = rows.filter((row) => Array.isArray(row) && !isEmptyRow(row));
  }

  if (!transpose || usableRows.length === 0) {
    return usableRows;
  }

  const columnCount = usableRows.reduce(
    (maxColumns, row) => Math.max(maxColumns, row.length),
    0,
  );

  return Array.from({ length: columnCount }, (_, columnIndex) =>
    usableRows.map((row) => normalizeCellValue(row[columnIndex])),
  );
}

/**
 * Parses a loaded workbook into two shapes:
 * - a small first-sheet preview used by preview/description nodes
 * - all sheets as row objects for later RO-Crate CSV export
 */
function parseTabularWorkbook(
  buffer,
  previewRowCount = 5,
  hasHeader = true,
  transpose = false,
) {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
  });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return { headers: [], rows: [], rowCount: 0, sheetName: '', sheets: [] };
  }

  const worksheet = workbook.Sheets[sheetName];
  const tableRows = readWorksheetRows(worksheet, transpose);
  const sheets = workbook.SheetNames.map((name) => {
    const sheetRows = readWorksheetRows(workbook.Sheets[name], transpose);
    const sheetColumnCount = sheetRows.reduce(
      (maxColumns, row) => Math.max(maxColumns, row.length),
      0,
    );
    const sheetHeaders = hasHeader
      ? Array.from({ length: sheetColumnCount }, (_, index) =>
          normalizeCellValue(sheetRows[0]?.[index]),
        )
      : Array.from(
          { length: sheetColumnCount },
          (_, index) => `Column ${index + 1}`,
        );
    const firstSheetDataRow = hasHeader ? 1 : 0;

    return {
      name,
      rows: sheetRows.slice(firstSheetDataRow).map((row) =>
        Object.fromEntries(
          sheetHeaders.map((header, index) => [header, normalizeCellValue(row[index])]),
        ),
      ),
    };
  });

  if (tableRows.length === 0) {
    return { headers: [], rows: [], rowCount: 0, sheetName, sheets };
  }

  const columnCount = tableRows.reduce(
    (maxColumns, row) => Math.max(maxColumns, row.length),
    0,
  );
  const headers = hasHeader
    ? Array.from({ length: columnCount }, (_, index) =>
        normalizeCellValue(tableRows[0][index]),
      )
    : Array.from({ length: columnCount }, (_, index) => `Column ${index + 1}`);
  const firstDataRow = hasHeader ? 1 : 0;
  const rows = tableRows.slice(firstDataRow, firstDataRow + previewRowCount).map((row) =>
    Array.from({ length: columnCount }, (_, index) => normalizeCellValue(row[index])),
  );

  return {
    headers,
    rows,
    rowCount: Math.max(tableRows.length - firstDataRow, 0),
    sheetName,
    sheets,
  };
}

/**
 * Propagates tabular payloads through outgoing edges. Downstream nodes receive
 * only the fields they need, keeping node-specific state isolated in data.
 */
function recalculateFlows(nodes, edges, tabularMemory) {
  const outgoingEdgesBySource = new Map();

  for (const edge of edges) {
    const outgoing = outgoingEdgesBySource.get(edge.source);
    if (outgoing) {
      outgoing.push(edge.target);
    } else {
      outgoingEdgesBySource.set(edge.source, [edge.target]);
    }
  }

  const payloadByNodeId = new Map();
  const queue = [];
  const visited = new Set();

  for (const node of nodes) {
    if (node.type !== 'tabularFile') {
      continue;
    }

    const preview = tabularMemory.get(node.id);
    if (!preview) {
      continue;
    }

    payloadByNodeId.set(node.id, preview);
    queue.push({ nodeId: node.id, payload: preview });
  }

  while (queue.length > 0) {
    const next = queue.shift();

    if (!next || visited.has(next.nodeId)) {
      continue;
    }

    visited.add(next.nodeId);
    const targets = outgoingEdgesBySource.get(next.nodeId) ?? [];

    for (const targetId of targets) {
      if (payloadByNodeId.has(targetId)) {
        continue;
      }

      payloadByNodeId.set(targetId, next.payload);
      queue.push({ nodeId: targetId, payload: next.payload });
    }
  }

  return nodes.map((node) => {
    const payload = payloadByNodeId.get(node.id);

    if (node.type === 'previewTabular') {
      return payload
        ? {
            ...node,
            data: {
              ...node.data,
              headers: payload.headers,
              rows: payload.rows,
            },
          }
        : {
            ...node,
            data: {
              ...node.data,
              headers: [],
              rows: [],
            },
          };
    }

    if (node.type === 'columnDescription' || node.type === 'headerSchema') {
      return payload
        ? {
            ...node,
            data: {
              ...node.data,
              fields: buildColumnDescriptionFields(payload.headers, node.data.fields),
            },
          }
        : {
            ...node,
            data: {
              ...node.data,
              fields: [],
            },
          };
    }

    if (node.type === 'roCrate') {
      return {
        ...node,
        data: {
          ...node.data,
          sheets: payload?.sheets ?? [],
        },
      };
    }

    return node;
  });
}

function getConnectedMetadataFormIds(nodes, edges, profileSearchNodeId) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));
  const metadataFormIds = new Set();

  for (const edge of edges) {
    const sourceIsProfileSearch = edge.source === profileSearchNodeId;
    const targetIsProfileSearch = edge.target === profileSearchNodeId;

    if (!sourceIsProfileSearch && !targetIsProfileSearch) {
      continue;
    }

    const connectedNodeId = sourceIsProfileSearch ? edge.target : edge.source;

    if (nodeTypesById.get(connectedNodeId) === 'metadataForm') {
      metadataFormIds.add(connectedNodeId);
    }
  }

  return [...metadataFormIds];
}

/**
 * Applies the selected Quantity Kind as a filter for connected Unit nodes.
 */
function propagateQuantityKindToUnits(nodes, edges) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));
  const nodeDataById = new Map(nodes.map((node) => [node.id, node.data]));
  const quantityKindByUnitId = new Map();

  for (const edge of edges) {
    if (
      nodeTypesById.get(edge.source) === 'quantityKind' &&
      nodeTypesById.get(edge.target) === 'unit'
    ) {
      quantityKindByUnitId.set(
        edge.target,
        nodeDataById.get(edge.source)?.selectedQuantityKind || null,
      );
    }
  }

  return nodes.map((node) => {
    if (node.type !== 'unit') {
      return node;
    }

    const quantityKind = quantityKindByUnitId.get(node.id);

    return {
      ...node,
      data: {
        ...node.data,
        quantityKindFilter: quantityKind?.qk || '',
        quantityKindLabel: quantityKind?.label || '',
      },
    };
  });
}

/**
 * Collects RDF content connected to RO-Crate nodes. The current metadata
 * producers emit Turtle, but the RO-Crate node keeps the existing jsonLdContent
 * property name because the export template expects that shape.
 */
function propagateROCrateInputs(nodes, edges) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));
  const nodeDataById = new Map(nodes.map((node) => [node.id, node.data]));
  const rdfInputsByNodeId = new Map();

  for (const edge of edges) {
    if (nodeTypesById.get(edge.target) !== 'roCrate') {
      continue;
    }

    const sourceType = nodeTypesById.get(edge.source);
    const sourceData = nodeDataById.get(edge.source) ?? {};
    const rdfContent = ['metadataForm', 'columnDescription', 'headerSchema'].includes(
      sourceType,
    )
      ? sourceData.serializedRdf
      : '';

    if (rdfContent) {
      const existingInputs = rdfInputsByNodeId.get(edge.target) ?? [];
      rdfInputsByNodeId.set(edge.target, [...existingInputs, rdfContent]);
    }
  }

  return nodes.map((node) => {
    if (node.type !== 'roCrate') {
      return node;
    }

    return {
      ...node,
      data: {
        ...node.data,
        jsonLdContent: {
          jsonLd: (rdfInputsByNodeId.get(node.id) ?? []).join('\n\n'),
        },
      },
    };
  });
}

/**
 * Passes the prepared RO-Crate inputs to connected Coscine nodes. The Coscine
 * node builds the ZIP only when the user starts an upload.
 */
function propagateCoscineInputs(nodes, edges) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));
  const nodeDataById = new Map(nodes.map((node) => [node.id, node.data]));
  const roCrateInputByCoscineId = new Map();
  const metadataInputsByCoscineId = new Map();

  for (const edge of edges) {
    const sourceType = nodeTypesById.get(edge.source);
    const targetType = nodeTypesById.get(edge.target);

    if (sourceType === 'roCrate' && targetType === 'coscine') {
      const sourceData = nodeDataById.get(edge.source) ?? {};
      roCrateInputByCoscineId.set(edge.target, {
        jsonLdContent: sourceData.jsonLdContent,
        sheets: sourceData.sheets ?? [],
      });
    }

    if (sourceType === 'coscine' && targetType === 'metadataForm') {
      const serializedRdf = nodeDataById.get(edge.target)?.serializedRdf || '';

      if (serializedRdf) {
        const existingInputs = metadataInputsByCoscineId.get(edge.source) ?? [];
        metadataInputsByCoscineId.set(edge.source, [...existingInputs, serializedRdf]);
      }
    }
  }

  return nodes.map((node) => {
    if (node.type !== 'coscine') {
      return node;
    }

    return {
      ...node,
      data: {
        ...node.data,
        roCrateInput: roCrateInputByCoscineId.has(node.id)
          ? {
              ...roCrateInputByCoscineId.get(node.id),
              metadataContent: (metadataInputsByCoscineId.get(node.id) ?? []).join('\n\n'),
            }
          : null,
      },
    };
  });
}

/**
 * Sends the selected Coscine resource's application-profile form to connected
 * Metadata Form nodes while preserving forms selected through AIMS.
 */
function propagateCoscineApplicationProfiles(nodes, edges) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));
  const nodeDataById = new Map(nodes.map((node) => [node.id, node.data]));
  const profileByMetadataFormId = new Map();

  for (const edge of edges) {
    if (
      nodeTypesById.get(edge.source) !== 'coscine' ||
      nodeTypesById.get(edge.target) !== 'metadataForm'
    ) {
      continue;
    }

    const profile = nodeDataById.get(edge.source)?.coscineApplicationProfile;

    if (profile?.shapes) {
      profileByMetadataFormId.set(edge.target, profile);
    }
  }

  return nodes.map((node) => {
    if (node.type !== 'metadataForm') {
      return node;
    }

    const profile = profileByMetadataFormId.get(node.id);

    if (profile) {
      return {
        ...node,
        data: {
          ...node.data,
          shapes: profile.shapes,
          shapesKey: profile.shapesKey,
          profileName: profile.name,
          profileBaseUri: profile.baseUri,
          shapesSource: 'coscine',
          coscineResourceName: profile.resourceName,
        },
      };
    }

    if (node.data.shapesSource !== 'coscine') {
      return node;
    }

    const {
      coscineResourceName,
      profileBaseUri,
      profileName,
      shapes,
      shapesKey,
      shapesSource,
      ...remainingData
    } = node.data;

    return {
      ...node,
      data: remainingData,
    };
  });
}

/**
 * Central recomputation pipeline for derived node data. Call this after any
 * node or edge change that may affect previews, RDF, units, or RO-Crate inputs.
 */
function deriveNodeData(nodes, edges, tabularMemory) {
  const flowNodes = recalculateFlows(nodes, edges, tabularMemory);
  const nodesWithUnits = propagateQuantityKindToUnits(flowNodes, edges);
  const nodesWithROCrate = propagateROCrateInputs(nodesWithUnits, edges);
  const nodesWithCoscineInputs = propagateCoscineInputs(nodesWithROCrate, edges);
  const nodesWithCoscineProfiles = propagateCoscineApplicationProfiles(
    nodesWithCoscineInputs,
    edges,
  );
  return nodesWithCoscineProfiles;
}

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  const [globalLanguage, setGlobalLanguage] = useState('en');
  const text = appText[globalLanguage] ?? appText.en;
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [savedLayouts, setSavedLayouts] = useState(() => readSavedLayouts());
  const [layoutName, setLayoutName] = useState('');
  const [selectedSavedLayout, setSelectedSavedLayout] = useState('');
  const [layoutStatus, setLayoutStatus] = useState('');
  const nodeIdCountRef = useRef(initialNodes.length);
  const nodeTypeCountsRef = useRef(buildNodeTypeCounts(initialNodes));
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const tabularMemoryRef = useRef(new Map());
  const tabularBuffersRef = useRef(new Map());
  const profileDefinitionRequestsRef = useRef(new Map());

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const onColumnDescriptionFieldsChange = useCallback(
    (nodeId, fields) => {
      const serializedRdf = serializeColumnDescriptionsToTurtle(fields);

      setNodes((currentNodes) => {
        const nodesWithFields = currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  fields,
                  serializedRdf,
                },
              }
            : node,
        );
        const nextNodes = deriveNodeData(
          nodesWithFields,
          edgesRef.current,
          tabularMemoryRef.current,
        );

        nodesRef.current = nextNodes;
        return nextNodes;
      });
    },
    [setNodes],
  );

  const onTabularLoaded = useCallback(
    (nodeId, fileName, buffer, hasHeader = true, transpose = false) => {
      const preview = parseTabularWorkbook(buffer, 5, hasHeader, transpose);
      tabularMemoryRef.current.set(nodeId, preview);
      tabularBuffersRef.current.set(nodeId, { fileName, buffer });

      setNodes((currentNodes) => {
        const nextNodes = deriveNodeData(
          currentNodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    fileName,
                    hasHeader,
                    transpose,
                    rowCount: preview.rowCount,
                    sheetName: preview.sheetName,
                  },
              }
              : node,
          ),
          edgesRef.current,
          tabularMemoryRef.current,
        );

        nodesRef.current = nextNodes;
        return nextNodes;
      });
    },
    [setNodes],
  );

  const onTabularHasHeaderChange = useCallback(
    (nodeId, hasHeader) => {
      const loadedFile = tabularBuffersRef.current.get(nodeId);

      if (loadedFile) {
        const node = nodesRef.current.find((candidate) => candidate.id === nodeId);
        onTabularLoaded(
          nodeId,
          loadedFile.fileName,
          loadedFile.buffer,
          hasHeader,
          node?.data.transpose === true,
        );
        return;
      }

      setNodes((currentNodes) => {
        const nextNodes = currentNodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, hasHeader } }
            : node,
        );
        nodesRef.current = nextNodes;
        return nextNodes;
      });
    },
    [onTabularLoaded, setNodes],
  );

  const onTabularTransposeChange = useCallback(
    (nodeId, transpose) => {
      const loadedFile = tabularBuffersRef.current.get(nodeId);
      const node = nodesRef.current.find((candidate) => candidate.id === nodeId);

      if (loadedFile) {
        onTabularLoaded(
          nodeId,
          loadedFile.fileName,
          loadedFile.buffer,
          node?.data.hasHeader !== false,
          transpose,
        );
        return;
      }

      setNodes((currentNodes) => {
        const nextNodes = currentNodes.map((candidate) =>
          candidate.id === nodeId
            ? { ...candidate, data: { ...candidate.data, transpose } }
            : candidate,
        );
        nodesRef.current = nextNodes;
        return nextNodes;
      });
    },
    [onTabularLoaded, setNodes],
  );

  const onProfileSelect = useCallback(
    async (profileSearchNodeId, profile) => {
      const metadataFormIds = getConnectedMetadataFormIds(
        nodesRef.current,
        edgesRef.current,
        profileSearchNodeId,
      );

      if (metadataFormIds.length === 0) {
        throw new Error('Connect this profile search node to a metadata form first.');
      }

      profileDefinitionRequestsRef.current.get(profileSearchNodeId)?.abort();

      const abortController = new AbortController();
      profileDefinitionRequestsRef.current.set(profileSearchNodeId, abortController);

      try {
        const profileDefinition = await fetchAimsApplicationProfileDefinition({
          profile,
          signal: abortController.signal,
        });

        if (profileDefinitionRequestsRef.current.get(profileSearchNodeId) !== abortController) {
          return;
        }

        const metadataFormIdSet = new Set(metadataFormIds);
        const shapesKey = `profile-${profileDefinition.baseUri}-${Date.now()}`;

        setNodes((currentNodes) => {
          const nextNodes = currentNodes.map((node) =>
            metadataFormIdSet.has(node.id)
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    shapes: profileDefinition.shapes,
                    shapesKey,
                    profileName: profileDefinition.name,
                    profileBaseUri: profileDefinition.baseUri,
                    shapesSource: 'aims',
                  },
                }
              : node,
          );

          nodesRef.current = nextNodes;
          return nextNodes;
        });
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }

        throw error;
      } finally {
        if (profileDefinitionRequestsRef.current.get(profileSearchNodeId) === abortController) {
          profileDefinitionRequestsRef.current.delete(profileSearchNodeId);
        }
      }
    },
    [setNodes],
  );

  const onMetadataRdfChange = useCallback(
    (nodeId, serializedRdf) => {
      setNodes((currentNodes) => {
        const nodesWithMetadata = currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  serializedRdf,
                },
              }
            : node,
        );
        const nextNodes = deriveNodeData(
          nodesWithMetadata,
          edgesRef.current,
          tabularMemoryRef.current,
        );

        nodesRef.current = nextNodes;
        return nextNodes;
      });
    },
    [setNodes],
  );

  const onCoscineApplicationProfileLoaded = useCallback(
    (nodeId, profileDefinition) => {
      setNodes((currentNodes) => {
        const nodesWithProfile = currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  coscineApplicationProfile: profileDefinition
                    ? {
                        ...profileDefinition,
                        shapesKey: `coscine-${profileDefinition.baseUri}-${profileDefinition.resourceId}-${Date.now()}`,
                      }
                    : null,
                },
              }
            : node,
        );
        const nextNodes = deriveNodeData(
          nodesWithProfile,
          edgesRef.current,
          tabularMemoryRef.current,
        );

        nodesRef.current = nextNodes;
        return nextNodes;
      });
    },
    [setNodes],
  );

  const onQuantityKindSelect = useCallback(
    (nodeId, quantityKind) => {
      setNodes((currentNodes) => {
        const nodesWithSelection = currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  selectedQuantityKind: quantityKind,
                },
              }
            : node,
        );
        const nextNodes = deriveNodeData(
          nodesWithSelection,
          edgesRef.current,
          tabularMemoryRef.current,
        );

        nodesRef.current = nextNodes;
        return nextNodes;
      });
    },
    [setNodes],
  );

  const onGlobalLanguageChange = useCallback(
    (language) => {
      setGlobalLanguage(language);
      document.documentElement.lang = language;

      setNodes((currentNodes) => {
        const nextNodes = currentNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            language,
          },
        }));

        nodesRef.current = nextNodes;
        return nextNodes;
      });
    },
    [setNodes],
  );

  Object.assign(nodeHandlers, {
    onTabularLoaded,
    onTabularHasHeaderChange,
    onTabularTransposeChange,
    onColumnDescriptionFieldsChange,
    onMetadataRdfChange,
    onProfileSelect,
    onCoscineApplicationProfileLoaded,
    onQuantityKindSelect,
  });

  const onConnect = useCallback(
    (connection) => {
      const nextEdges = addEdge(
        applySemanticEdgeStyle(connection, nodesRef.current),
        edgesRef.current,
      );
      const nextNodes = deriveNodeData(
        nodesRef.current,
        nextEdges,
        tabularMemoryRef.current,
      );

      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      setNodes(nextNodes);
      setEdges(nextEdges);
    },
    [setEdges, setNodes],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((currentEdges) => {
        const nextEdges = applyEdgeChanges(changes, currentEdges);
        edgesRef.current = nextEdges;

        setNodes((currentNodes) => {
          const nextNodes = deriveNodeData(currentNodes, nextEdges, tabularMemoryRef.current);
          nodesRef.current = nextNodes;
          return nextNodes;
        });

        return nextEdges;
      });
    },
    [setEdges, setNodes],
  );

  const onNodesDelete = useCallback((deletedNodes) => {
    for (const node of deletedNodes) {
      tabularMemoryRef.current.delete(node.id);
      tabularBuffersRef.current.delete(node.id);

      if (node.type === 'profileSearch') {
        profileDefinitionRequestsRef.current.get(node.id)?.abort();
        profileDefinitionRequestsRef.current.delete(node.id);
      }
    }
  }, []);

  const onDragStart = useCallback((event, template) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((event) => {
    if (!Array.from(event.dataTransfer.types).includes('application/reactflow')) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      if (!reactFlowInstance) {
        return;
      }

      const rawTemplate = event.dataTransfer.getData('application/reactflow');

      if (!rawTemplate) {
        return;
      }

      event.preventDefault();

      const template = JSON.parse(rawTemplate);
      nodeIdCountRef.current += 1;
      const nextTypeCount = (nodeTypeCountsRef.current[template.type] ?? 0) + 1;
      nodeTypeCountsRef.current[template.type] = nextTypeCount;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `node-${nodeIdCountRef.current}`,
        type: template.type,
        position,
        data: {
          label: `${template.label} ${nextTypeCount}`,
          language: globalLanguage,
        },
      };

      setNodes((currentNodes) => {
        const nextNodes = [...currentNodes, newNode];
        nodesRef.current = nextNodes;
        return nextNodes;
      });
    },
    [globalLanguage, reactFlowInstance, setNodes],
  );

  const saveCurrentLayout = useCallback(() => {
    const trimmedName = layoutName.trim();

    if (!trimmedName) {
      setLayoutStatus(text.layoutNameRequired);
      return;
    }

    const flowSnapshot = reactFlowInstance?.toObject?.();
    const nextLayout = {
      name: trimmedName,
      savedAt: new Date().toISOString(),
      nodes: nodesRef.current.map(cleanNodeForStorage),
      edges: edgesRef.current.map(cleanEdgeForStorage),
      viewport: flowSnapshot?.viewport ?? null,
    };
    const otherLayouts = savedLayouts.filter((layout) => layout.name !== trimmedName);
    const nextLayouts = [...otherLayouts, nextLayout].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    try {
      writeSavedLayouts(nextLayouts);
      setSavedLayouts(nextLayouts);
      setSelectedSavedLayout(trimmedName);
      setLayoutStatus(text.layoutSaved);
    } catch {
      setLayoutStatus(text.layoutLoadFailed);
    }
  }, [layoutName, reactFlowInstance, savedLayouts, text.layoutLoadFailed, text.layoutNameRequired, text.layoutSaved]);

  const loadSelectedLayout = useCallback(() => {
    if (!selectedSavedLayout) {
      setLayoutStatus(text.layoutSelectionRequired);
      return;
    }

    const savedLayout = savedLayouts.find((layout) => layout.name === selectedSavedLayout);

    if (!savedLayout || !Array.isArray(savedLayout.nodes) || !Array.isArray(savedLayout.edges)) {
      setLayoutStatus(text.layoutLoadFailed);
      return;
    }

    const restoredNodes = savedLayout.nodes.map(cleanNodeForStorage);
    const restoredEdges = restoreSavedEdges(savedLayout.edges, restoredNodes);
    const nextNodes = deriveNodeData(
      restoredNodes,
      restoredEdges,
      tabularMemoryRef.current,
    );

    nodeIdCountRef.current = getNextNodeIdCount(nextNodes);
    nodeTypeCountsRef.current = buildNodeTypeCounts(nextNodes);
    nodesRef.current = nextNodes;
    edgesRef.current = restoredEdges;
    setNodes(nextNodes);
    setEdges(restoredEdges);
    setLayoutName(savedLayout.name);
    setLayoutStatus(text.layoutLoaded);

    if (savedLayout.viewport && reactFlowInstance?.setViewport) {
      window.requestAnimationFrame(() => {
        reactFlowInstance.setViewport(savedLayout.viewport);
      });
    }
  }, [
    reactFlowInstance,
    savedLayouts,
    selectedSavedLayout,
    setEdges,
    setNodes,
    text.layoutLoadFailed,
    text.layoutLoaded,
    text.layoutSelectionRequired,
  ]);

  const deleteSelectedLayout = useCallback(() => {
    if (!selectedSavedLayout) {
      setLayoutStatus(text.layoutSelectionRequired);
      return;
    }

    const nextLayouts = savedLayouts.filter(
      (layout) => layout.name !== selectedSavedLayout,
    );

    try {
      writeSavedLayouts(nextLayouts);
      setSavedLayouts(nextLayouts);
      setSelectedSavedLayout('');
      setLayoutStatus(text.layoutDeleted);
    } catch {
      setLayoutStatus(text.layoutLoadFailed);
    }
  }, [
    savedLayouts,
    selectedSavedLayout,
    text.layoutDeleted,
    text.layoutLoadFailed,
    text.layoutSelectionRequired,
  ]);

  return (
    <div className="app-shell">
      <img className="app-logo" src={rwthCaadLogo} alt="RWTH CAAD" />
      <div className="global-language-selector" aria-label="Global language selection">
        {globalLanguageOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`global-language-selector__button${
              globalLanguage === option.value ? ' selected' : ''
            }`}
            onClick={() => onGlobalLanguageChange(option.value)}
            aria-pressed={globalLanguage === option.value}
            aria-label={option.label}
            title={option.label}
          >
            <img
              className="global-language-selector__icon"
              src={option.iconSrc}
              alt=""
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <aside className="sidebar">
        <p className="eyebrow">{text.sidebarHeading}</p>
        <p className="intro">{text.sidebarIntro}</p>
        <div className="node-palette">
          {nodeTemplates.map((template) => (
            <button
              key={template.label}
              type="button"
              draggable
              className={`drag-button${template.icon ? ' drag-button--with-icon' : ''}`}
              onDragStart={(event) => onDragStart(event, template)}
            >
              <span className="drag-button__content">
                {template.icon ? (
                  <img src={template.icon} alt="" className="drag-button__icon" />
                ) : null}
                <span>{template.label}</span>
              </span>
            </button>
          ))}
        </div>
        <section className="saved-layouts" aria-labelledby="saved-layouts-heading">
          <h2 id="saved-layouts-heading">{text.savedLayoutsHeading}</h2>
          <label className="saved-layouts__label" htmlFor="layout-name">
            {text.layoutNameLabel}
          </label>
          <div className="saved-layouts__row">
            <input
              id="layout-name"
              className="saved-layouts__input"
              type="text"
              value={layoutName}
              placeholder={text.layoutNamePlaceholder}
              onChange={(event) => setLayoutName(event.target.value)}
            />
            <button
              type="button"
              className="saved-layouts__button saved-layouts__button--primary"
              onClick={saveCurrentLayout}
            >
              {text.saveLayout}
            </button>
          </div>
          <select
            className="saved-layouts__select"
            value={selectedSavedLayout}
            onChange={(event) => setSelectedSavedLayout(event.target.value)}
          >
            <option value="" disabled={savedLayouts.length > 0}>
              {savedLayouts.length > 0 ? text.selectSavedLayout : text.noSavedLayouts}
            </option>
            {savedLayouts.map((layout) => (
              <option key={layout.name} value={layout.name}>
                {layout.name}
              </option>
            ))}
          </select>
          <div className="saved-layouts__actions">
            <button
              type="button"
              className="saved-layouts__button"
              onClick={loadSelectedLayout}
              disabled={savedLayouts.length === 0}
            >
              {text.loadLayout}
            </button>
            <button
              type="button"
              className="saved-layouts__button"
              onClick={deleteSelectedLayout}
              disabled={savedLayouts.length === 0}
            >
              {text.deleteLayout}
            </button>
          </div>
          {layoutStatus ? <p className="saved-layouts__status">{layoutStatus}</p> : null}
        </section>
        <div className="sidebar-footer">
          <img className="sidebar-footer__logo" src={nfdi4ingLogo} alt="NFDI4Ing" />
        </div>
      </aside>

      <main className="canvas" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={onNodesDelete}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          deleteKeyCode={['Backspace', 'Delete']}
          fitViewOptions={{ padding: 0.25, maxZoom: 0.9 }}
          fitView
        >
          <Controls />
          <Background gap={16} size={1} />
        </ReactFlow>
      </main>
    </div>
  );
}
