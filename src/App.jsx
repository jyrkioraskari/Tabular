import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TabularFileNode from './nodes/TabularFileNode';
import PreviewTabularDataNode from './nodes/PreviewTabularDataNode';
import ColumnDescriptionNode from './nodes/ColumnDescriptionNode';
import MetadataFormNode from './nodes/MetadataFormNode';
import MetadataProfileSearchNode from './nodes/MetadataProfileSearchNode';
import ROCrateNode from './nodes/ROCrateNode';
import QuantityKindNode from './nodes/QuantityKindNode';
import UnitNode from './nodes/UnitNode';
import TerminologyNode, { TERMINOLOGY_LOGO_URL } from './nodes/TerminologyNode';
import CoscineNode from './nodes/CoscineNode';
import PythonNode from './nodes/PythonNode';
import N8nCommunityNode from './nodes/N8nCommunityNode';
import pythonLogo from './assets/python-logo.svg';
import n8nCommunityIcon from './assets/n8n-community.svg';
import { fetchAimsApplicationProfileDefinition } from './services/aimsApi';
import { serializeColumnDescriptionsToTurtle } from './services/columnDescriptionRdf';
<<<<<<< HEAD
import {
  downloadJsonFile,
  readJsonFile,
  sanitizeNodeData,
  serializeSelection,
  validateImportPayload,
} from './services/nodeExchange';
import {
  DEFAULT_PYTHON_NODE_CODE,
  collectPythonInputs,
  runPythonNode,
} from './services/pythonNodeClient';
import { serializeTabularDataInWorker } from './services/tabularDataRdfService';
import { parseTabularWorkbook } from './services/tabularWorkbook';
import { collectN8nInputs, runN8nNode } from './services/n8nNodeClient';
import { configuredDatasetLicense } from './services/roCrateExport';
=======
import { serializeTabularDataInWorker } from './services/tabularDataRdfService';
import { parseTabularWorkbook } from './services/tabularWorkbook';
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
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
  onTabularRdfConversionChange: undefined,
  onColumnDescriptionFieldsChange: undefined,
  onTerminologyVocabularyChange: undefined,
  onMetadataRdfChange: undefined,
  onProfileSelect: undefined,
  onCoscineApplicationProfileLoaded: undefined,
  onCoscineUploadStateChange: undefined,
<<<<<<< HEAD
  onDatasetLicenseChange: undefined,
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
  onQuantityKindSelect: undefined,
  onPythonCodeChange: undefined,
  onPythonRun: undefined,
  onPythonTrust: undefined,
  onN8nConfigChange: undefined,
  onN8nRun: undefined,
  getN8nInputs: undefined,
};

function TabularFileNodeType(props) {
  return (
    <TabularFileNode
      {...props}
      onTabularLoaded={nodeHandlers.onTabularLoaded}
      onHasHeaderChange={nodeHandlers.onTabularHasHeaderChange}
      onTransposeChange={nodeHandlers.onTabularTransposeChange}
      onRdfConversionChange={nodeHandlers.onTabularRdfConversionChange}
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

function TerminologyNodeType(props) {
  return <TerminologyNode {...props} onVocabularyChange={nodeHandlers.onTerminologyVocabularyChange} />;
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
      onUploadStateChange={nodeHandlers.onCoscineUploadStateChange}
    />
  );
}

function ROCrateNodeType(props) {
  return <ROCrateNode {...props} onLicenseChange={nodeHandlers.onDatasetLicenseChange} />;
}

function PythonNodeType(props) {
  return (
    <PythonNode
      {...props}
      onCodeChange={nodeHandlers.onPythonCodeChange}
      onRun={nodeHandlers.onPythonRun}
      onTrust={nodeHandlers.onPythonTrust}
    />
  );
}

function N8nCommunityNodeType(props) {
  return <N8nCommunityNode {...props}
    onConfigChange={nodeHandlers.onN8nConfigChange}
    onRun={nodeHandlers.onN8nRun}
    inputs={nodeHandlers.getN8nInputs?.(props.id) ?? {}} />;
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
  terminology: TerminologyNodeType,
<<<<<<< HEAD
  roCrate: ROCrateNodeType,
=======
  roCrate: ROCrateNode,
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
  coscine: CoscineNodeType,
  pythonScript: PythonNodeType,
  n8nCommunity: N8nCommunityNodeType,
};

const tabularPreviewEdgeStyle = { stroke: '#2563eb', strokeWidth: 2 };
const columnDescriptionRdfDebounceMs = 300;
/**
 * Highlights connections that carry workflow data between compatible nodes.
 * The styling is visual only; data propagation is handled by deriveNodeData().
 */
function getEdgeLabel(sourceType, targetType) {
<<<<<<< HEAD
  if (targetType === 'n8nCommunity') return 'n8n input';
  if (sourceType === 'n8nCommunity' && targetType === 'pythonScript') return 'n8n result';
  if (targetType === 'pythonScript') return 'python input';
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
  if (sourceType === 'metadataForm' && targetType === 'roCrate') return 'metadata';
  if (sourceType === 'metadataForm' && targetType === 'coscine') return 'metadata';
  if (sourceType === 'columnDescription' && targetType === 'roCrate') {
    return 'column description';
  }
  if (sourceType === 'headerSchema' && targetType === 'roCrate') {
    return 'column description';
  }
  if (
    sourceType === 'tabularFile' &&
    ['previewTabular', 'columnDescription', 'headerSchema', 'roCrate'].includes(
      targetType,
    )
  ) {
    return 'file';
  }
  if (sourceType === 'quantityKind' && targetType === 'unit') return 'unit';
  if (
    sourceType === 'terminology' &&
    ['columnDescription', 'headerSchema'].includes(targetType)
  ) {
    return 'terminology';
  }
  if (
    sourceType === 'unit' &&
    ['columnDescription', 'headerSchema'].includes(targetType)
  ) {
    return 'unit';
  }
  if (sourceType === 'profileSearch' && targetType === 'metadataForm') {
    return 'metadata profile';
  }
  if (sourceType === 'coscine' && targetType === 'metadataForm') {
    return 'metadata profile';
  }
  if (sourceType === 'roCrate' && targetType === 'coscine') return 'RO-Crate';
  return '';
}

function applySemanticEdgeStyle(edge, nodes, invalidated = false) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));
  const sourceType = nodeTypesById.get(edge.source);
  const targetType = nodeTypesById.get(edge.target);
  const label = getEdgeLabel(sourceType, targetType);

  if (
    (sourceType === 'tabularFile' &&
      ['previewTabular', 'columnDescription', 'headerSchema'].includes(
        targetType,
      )) ||
    (sourceType === 'profileSearch' && targetType === 'metadataForm') ||
    (sourceType === 'quantityKind' && targetType === 'unit') ||
    (sourceType === 'terminology' &&
      ['columnDescription', 'headerSchema'].includes(targetType)) ||
    (sourceType === 'unit' && ['columnDescription', 'headerSchema'].includes(targetType)) ||
    ([
      'tabularFile',
      'metadataForm',
      'columnDescription',
      'headerSchema',
    ].includes(sourceType) && targetType === 'roCrate') ||
    (sourceType === 'roCrate' && targetType === 'coscine') ||
    (sourceType === 'coscine' && targetType === 'metadataForm') ||
<<<<<<< HEAD
    (sourceType === 'metadataForm' && targetType === 'coscine') ||
    targetType === 'pythonScript' ||
    targetType === 'n8nCommunity'
=======
    (sourceType === 'metadataForm' && targetType === 'coscine')
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
  ) {
    const color = invalidated ? '#dc2626' : tabularPreviewEdgeStyle.stroke;
    return {
      ...edge,
      animated: !invalidated,
      label: invalidated ? `${label} (inactive)` : label,
      labelStyle: { fill: color, fontSize: 12, fontWeight: 600 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 4,
      style: {
        ...tabularPreviewEdgeStyle,
        stroke: color,
        strokeDasharray: invalidated ? '7 5' : undefined,
      },
    };
  }

  return edge;
}

function isSupportedConnection(connection, nodes, edges = []) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));
  const sourceType = nodeTypesById.get(connection.source);
  const targetType = nodeTypesById.get(connection.target);

  if (
    ['profileSearch', 'coscine'].includes(sourceType) &&
    targetType === 'metadataForm'
  ) {
    const alreadyHasProfileInput = edges.some(
      (edge) =>
        edge.target === connection.target &&
        ['profileSearch', 'coscine'].includes(nodeTypesById.get(edge.source)),
    );

    if (alreadyHasProfileInput) {
      return false;
    }
  }

<<<<<<< HEAD
  // Python script nodes are sinks: any node may feed them, they feed nothing.
  if (targetType === 'pythonScript') {
    return true;
  }
  if (targetType === 'n8nCommunity') {
    return Boolean(sourceType) && connection.source !== connection.target;
  }

=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
  return (
    (sourceType === 'tabularFile' &&
      ['previewTabular', 'columnDescription', 'headerSchema', 'roCrate'].includes(
        targetType,
      )) ||
    (['columnDescription', 'headerSchema'].includes(sourceType) &&
      targetType === 'roCrate') ||
    (sourceType === 'quantityKind' && targetType === 'unit') ||
    (sourceType === 'terminology' &&
      ['columnDescription', 'headerSchema'].includes(targetType)) ||
    (sourceType === 'unit' && ['columnDescription', 'headerSchema'].includes(targetType)) ||
    (sourceType === 'profileSearch' && targetType === 'metadataForm') ||
    (sourceType === 'metadataForm' && targetType === 'roCrate') ||
    (sourceType === 'metadataForm' && targetType === 'coscine') ||
    (sourceType === 'roCrate' && targetType === 'coscine') ||
    (sourceType === 'coscine' && targetType === 'metadataForm')
  );
}

function annotateMetadataFormProfileInputs(nodes, edges) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));
  const inputByFormId = new Map();

  // A Coscine resource profile takes precedence over an AIMS profile. The
  // retained AIMS edge is styled as inactive elsewhere in the workflow.
  for (const sourceType of ['profileSearch', 'coscine']) {
    for (const edge of edges) {
      if (
        nodeTypesById.get(edge.source) === sourceType &&
        nodeTypesById.get(edge.target) === 'metadataForm'
      ) {
        inputByFormId.set(
          edge.target,
          sourceType === 'coscine' ? 'Coscine' : 'Metadata Profile Search',
        );
      }
    }
  }

  return nodes.map((node) =>
    node.type === 'metadataForm'
      ? {
          ...node,
          data: {
            ...node.data,
            metadataProfileInput: inputByFormId.get(node.id) || '',
          },
        }
      : node,
  );
}

function styleWorkflowEdges(edges, nodes) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));
  const coscineFormIds = new Set(
    edges
      .filter(
        (edge) =>
          nodeTypesById.get(edge.source) === 'coscine' &&
          nodeTypesById.get(edge.target) === 'metadataForm',
      )
      .map((edge) => edge.target),
  );

  return edges.map((edge) =>
    applySemanticEdgeStyle(
      edge,
      nodes,
      nodeTypesById.get(edge.source) === 'profileSearch' &&
        coscineFormIds.has(edge.target),
    ),
  );
}

function protectCoscineMetadataConnections(changes, edges, nodes) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const removedEdgeIds = new Set(
    changes.filter((change) => change.type === 'remove').map((change) => change.id),
  );
  let rejectedRemoval = false;

  const allowedChanges = changes.filter((change) => {
    if (change.type !== 'remove') return true;

    const edge = edgeById.get(change.id);
    if (!edge) return true;

    const sourceType = nodeTypesById.get(edge.source);
    const targetType = nodeTypesById.get(edge.target);
    const coscineMetadataConnection =
      (sourceType === 'coscine' && targetType === 'metadataForm') ||
      (sourceType === 'metadataForm' && targetType === 'coscine');

    if (!coscineMetadataConnection) {
      return true;
    }

    const coscineNodeId = sourceType === 'coscine' ? edge.source : edge.target;

    const coscineIsStillUsed = edges.some(
      (candidate) =>
        !removedEdgeIds.has(candidate.id) &&
        candidate.target === coscineNodeId &&
        nodeTypesById.get(candidate.source) === 'roCrate',
    );

    if (coscineIsStillUsed) {
      rejectedRemoval = true;
      return false;
    }

    return true;
  });

  return { allowedChanges, rejectedRemoval };
}

function createWorkflowTemplate(templateType, language) {
  const nodes = [
    {
      id: 'template-tabular',
      type: 'tabularFile',
      position: { x: 520, y: 450 },
      data: {
        label: 'Tabular file 1',
        language,
        hasHeader: true,
        transpose: false,
      },
    },
    {
      id: 'template-preview',
      type: 'previewTabular',
      position: { x: 520, y: 60 },
      data: { label: 'Preview Tabular Data 1', language },
    },
    {
      id: 'template-columns',
      type: 'columnDescription',
<<<<<<< HEAD
      position: { x: 1080, y: 60 },
=======
      position: { x: 1040, y: 60 },
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
      data: { label: 'Column Descriptions 1', language, fields: [] },
    },
    {
      id: 'template-quantity-kinds',
      type: 'quantityKind',
      position: { x: 40, y: 760 },
      data: { label: 'Quantity Kinds 1', language },
    },
    {
      id: 'template-units',
      type: 'unit',
      position: { x: 520, y: 760 },
      data: { label: 'Units 1', language },
    },
    {
      id: 'template-terminology',
      type: 'terminology',
      position: { x: 40, y: 40 },
      data: { label: 'Terminology Service 1', language },
    },
    {
      id: 'template-metadata-form',
      type: 'metadataForm',
      position: { x: 1480, y: 760 },
      data: { label: 'Metadata Form 1', language },
    },
    {
      id: 'template-ro-crate',
      type: 'roCrate',
<<<<<<< HEAD
      // Column Descriptions can expand to 1100px while its review workspace is open.
      position: { x: 2320, y: 100 },
=======
      position: { x: 1650, y: 100 },
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
      data: { label: 'RO-Crate 1', language },
    },
  ];
  const edges = [
    { id: 'template-file-preview', source: 'template-tabular', target: 'template-preview' },
    { id: 'template-file-columns', source: 'template-tabular', target: 'template-columns' },
    { id: 'template-file-crate', source: 'template-tabular', target: 'template-ro-crate' },
    { id: 'template-columns-crate', source: 'template-columns', target: 'template-ro-crate' },
    {
      id: 'template-quantity-units',
      source: 'template-quantity-kinds',
      target: 'template-units',
    },
  ];

  if (templateType === 'coscine') {
    nodes.push({
      id: 'template-coscine',
      type: 'coscine',
      position: { x: 2400, y: 760 },
      data: { label: 'Coscine 1', language },
    });
    edges.push(
      {
        id: 'template-crate-coscine',
        source: 'template-ro-crate',
        target: 'template-coscine',
      },
      {
        id: 'template-coscine-form',
        source: 'template-coscine',
        target: 'template-metadata-form',
      },
      {
        id: 'template-form-coscine',
        source: 'template-metadata-form',
        target: 'template-coscine',
      },
    );
  } else {
    nodes.push({
      id: 'template-profile-search',
      type: 'profileSearch',
      position: { x: 1000, y: 760 },
      data: { label: 'Metadata Profile Search 1', language },
    });
    edges.push(
      {
        id: 'template-profile-form',
        source: 'template-profile-search',
        target: 'template-metadata-form',
      },
      {
        id: 'template-form-crate',
        source: 'template-metadata-form',
        target: 'template-ro-crate',
      },
    );
  }

  return { nodes, edges: styleWorkflowEdges(edges, nodes) };
}

const defaultStartupWorkflow = createWorkflowTemplate('coscine', 'en');

const nodeTemplates = [
  { type: 'tabularFile', label: 'Tabular file', icon: tabularFileIcon },
  { type: 'previewTabular', label: 'Preview Tabular Data', icon: spreadsheetIcon },
  { type: 'columnDescription', label: 'Column Descriptions', icon: tabularSchemaIcon },
  { type: 'terminology', label: 'Terminology Service', icon: TERMINOLOGY_LOGO_URL },
  {
    type: 'quantityKindAndUnit',
    label: 'Quantity Kinds + Units',
    icon: qudtAvatar,
  },
  { type: 'profileSearch', label: 'Metadata Profile Search', icon: aimsIcon },
  { type: 'metadataForm', label: 'Metadata Form', icon: metadataFormIcon },
  { type: 'roCrate', label: 'RO-Crate', icon: roCrateLogo },
  { type: 'coscine', label: 'Coscine', icon: coscineLogo },
  { type: 'pythonScript', label: 'Python script', icon: pythonLogo },
  { type: 'n8nCommunity', label: 'n8n community node', icon: n8nCommunityIcon },
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
<<<<<<< HEAD
    nodesHeading: 'Nodes',
    addNodeLabel: (label) => `Add ${label}`,
    templatesHeading: 'Workflow templates',
    templatesIntro: 'Choose a starting workflow. This replaces the current canvas.',
    workflowSharingLabel: 'Workflow sharing',
    exportWorkflow: 'Export workflow as JSON',
    exportPrivacyNote:
      'The exported file contains node settings and any text you entered; it does not contain the loaded spreadsheet data.',
    importFile: 'Import JSON…',
=======
    sidebarIntro: 'Drag a button into the canvas to create a node where you drop it.',
    templatesHeading: 'Workflow templates',
    templatesIntro: 'Choose a starting workflow. This replaces the current canvas.',
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
    coscineTemplate: 'Coscine workflow',
    coscineTemplateDescription: 'Prepare an RO-Crate and deposit it with Coscine metadata.',
    roCrateTemplate: 'RO-Crate workflow',
    roCrateTemplateDescription: 'Use Metadata Profile Search and package the result locally.',
    checklist: {
      heading: 'Next steps',
      file: 'Load file',
      filePending: 'Select a tabular file',
      columns: 'Describe columns',
      columnsPendingNoNode: 'Add a Column Descriptions node',
      columnsPendingNoFile: 'Waiting for a loaded file',
      columnsProgress: '{described} of {total} columns described',
      metadata: 'Complete metadata',
      metadataPending: 'Fill the metadata form until valid',
      metadataDone: 'Passed on automatically',
      crate: 'Prepare RO-Crate',
      cratePending: 'Waiting for connected inputs',
      crateDone: 'Ready to download',
      coscine: 'Deposit in Coscine',
      coscinePendingConnect: 'Waiting for RO-Crate inputs',
      coscinePendingToken: 'Enter API token and select a resource',
      coscineReady: 'Ready to upload',
      coscineDone: 'RO-Crate uploaded',
    },
  },
  de: {
    sidebarHeading: 'Management von tabellarischen Daten',
<<<<<<< HEAD
    nodesHeading: 'Knoten',
    addNodeLabel: (label) => `${label} hinzufügen`,
    templatesHeading: 'Workflow-Vorlagen',
    templatesIntro: 'Waehle einen Start-Workflow. Die aktuelle Arbeitsflaeche wird ersetzt.',
    workflowSharingLabel: 'Workflows teilen',
    exportWorkflow: 'Workflow als JSON exportieren',
    exportPrivacyNote:
      'Die exportierte Datei enthaelt Knoteneinstellungen und eingegebene Texte, aber nicht die geladenen Tabellendaten.',
    importFile: 'JSON importieren…',
=======
    sidebarIntro:
      'Ziehe eine Schaltfläche auf die Arbeitsfläche, um an der Stelle, an der du sie ablegst, einen Knoten zu erstellen.',
    templatesHeading: 'Workflow-Vorlagen',
    templatesIntro: 'Waehle einen Start-Workflow. Die aktuelle Arbeitsflaeche wird ersetzt.',
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
    coscineTemplate: 'Coscine-Workflow',
    coscineTemplateDescription: 'RO-Crate vorbereiten und mit Coscine-Metadaten ablegen.',
    roCrateTemplate: 'RO-Crate-Workflow',
    roCrateTemplateDescription: 'Metadata Profile Search nutzen und das Ergebnis lokal paketieren.',
    checklist: {
      heading: 'Naechste Schritte',
      file: 'Datei laden',
      filePending: 'Waehle eine tabellarische Datei',
      columns: 'Spalten beschreiben',
      columnsPendingNoNode: 'Fuege einen Column-Descriptions-Knoten hinzu',
      columnsPendingNoFile: 'Warte auf eine geladene Datei',
      columnsProgress: '{described} von {total} Spalten beschrieben',
      metadata: 'Metadaten ausfuellen',
      metadataPending: 'Fuelle das Metadatenformular bis es gueltig ist',
      metadataDone: 'Wird automatisch uebergeben',
      crate: 'RO-Crate vorbereiten',
      cratePending: 'Wartet auf verbundene Eingaben',
      crateDone: 'Bereit zum Herunterladen',
      coscine: 'In Coscine ablegen',
      coscinePendingConnect: 'Wartet auf RO-Crate-Eingaben',
      coscinePendingToken: 'API-Token eingeben und Ressource waehlen',
      coscineReady: 'Bereit zum Hochladen',
      coscineDone: 'RO-Crate hochgeladen',
    },
  },
};

/**
 * Creates editable column-description rows from spreadsheet headers while
 * preserving any descriptions and units already entered for unchanged headers.
 */
function buildColumnDescriptionFields(headers, previousFields = [], columnNotes = []) {
<<<<<<< HEAD
  const usedPreviousIndexes = new Set();

  return headers.map((header, index) => {
    let previousIndex = previousFields[index]?.header === header && !usedPreviousIndexes.has(index)
      ? index
      : -1;
    if (previousIndex < 0) {
      previousIndex = previousFields.findIndex((field, candidateIndex) =>
        field.header === header && !usedPreviousIndexes.has(candidateIndex));
    }
    if (previousIndex >= 0) usedPreviousIndexes.add(previousIndex);
    const existing = previousFields[previousIndex];
=======
  const previousByHeader = new Map(
    previousFields.map((field) => [field.header, field]),
  );

  return headers.map((header, index) => {
    const existing = previousByHeader.get(header);
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571

    return {
      header,
      notes: columnNotes[index] || '',
      description: existing?.description ?? '',
      descriptionUri: existing?.descriptionUri ?? '',
      descriptionLanguage: existing?.descriptionLanguage ?? '',
      unit: existing?.unit ?? '',
      unitUri: existing?.unitUri ?? '',
      unitLanguage: existing?.unitLanguage ?? '',
    };
  });
}

function buildNodeTypeCounts(nodes) {
  return nodes.reduce((counts, node) => {
    counts[node.type] = (counts[node.type] ?? 0) + 1;
    return counts;
  }, {});
}

function countDescribedColumns(nodes) {
  let total = 0;
  let described = 0;

  for (const node of nodes) {
    if (node.type !== 'columnDescription' && node.type !== 'headerSchema') {
      continue;
    }

    const fields = Array.isArray(node.data.fields) ? node.data.fields : [];

    for (const field of fields) {
      total += 1;
      const hasDescription =
        (field.description ?? '').trim() !== '' || (field.descriptionUri ?? '') !== '';

      if (hasDescription) {
        described += 1;
      }
    }
  }

  return { total, described };
}

/**
 * Derives the workflow-level checklist from the current graph state. Each step
 * reports done/pending and the node the user should act on, so the UI can
 * point to the current blocker instead of making the user inspect every node.
 * A step is done when its workflow state is complete or the user has checked
 * it off manually through checkedStepKeys.
 */
function buildWorkflowChecklist(nodes, checklistText, checkedStepKeys = new Set()) {
  const steps = [];

  const tabularNodes = nodes.filter((node) => node.type === 'tabularFile');
  const loadedTabularNode = tabularNodes.find((node) => node.data.fileName) ?? null;
  steps.push({
    key: 'file',
    label: checklistText.file,
    detail: loadedTabularNode ? loadedTabularNode.data.fileName : checklistText.filePending,
    autoDone: Boolean(loadedTabularNode),
    focusNodeId:
      (tabularNodes.find((node) => !node.data.fileName) ?? tabularNodes[0])?.id ?? null,
  });

  const columnNodes = nodes.filter(
    (node) => node.type === 'columnDescription' || node.type === 'headerSchema',
  );
  const { total, described } = countDescribedColumns(nodes);
  let columnsDetail;
  let columnsDone = false;

  if (columnNodes.length === 0) {
    columnsDetail = checklistText.columnsPendingNoNode;
  } else if (total === 0) {
    columnsDetail = checklistText.columnsPendingNoFile;
  } else {
    columnsDetail = checklistText.columnsProgress
      .replace('{described}', String(described))
      .replace('{total}', String(total));
    columnsDone = described === total;
  }

  steps.push({
    key: 'columns',
    label: checklistText.columns,
    detail: columnsDetail,
    autoDone: columnsDone,
    focusNodeId: columnNodes[0]?.id ?? null,
  });

  const metadataFormNodes = nodes.filter((node) => node.type === 'metadataForm');
  const savedMetadataForm =
    metadataFormNodes.find((node) => (node.data.serializedRdf ?? '').trim() !== '') ?? null;
  steps.push({
    key: 'metadata',
    label: checklistText.metadata,
    detail: savedMetadataForm ? checklistText.metadataDone : checklistText.metadataPending,
    autoDone: Boolean(savedMetadataForm),
    focusNodeId: metadataFormNodes[0]?.id ?? null,
  });

  const crateNodes = nodes.filter((node) => node.type === 'roCrate');
  const readyCrateNode =
<<<<<<< HEAD
    crateNodes.find((node) =>
      (node.data.jsonLdContent?.jsonLd ?? '').trim() !== '' &&
      Boolean(configuredDatasetLicense(node.data.sheets) || node.data.datasetLicense)) ?? null;
=======
    crateNodes.find((node) => (node.data.jsonLdContent?.jsonLd ?? '').trim() !== '') ?? null;
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
  steps.push({
    key: 'crate',
    label: checklistText.crate,
    detail: readyCrateNode ? checklistText.crateDone : checklistText.cratePending,
    autoDone: Boolean(readyCrateNode),
    focusNodeId: crateNodes[0]?.id ?? null,
  });

  for (const coscineNode of nodes.filter((node) => node.type === 'coscine')) {
    const uploadState = coscineNode.data.coscineUploadState ?? {};
    const crateReady = Boolean(
      (coscineNode.data.roCrateInput?.jsonLdContent?.jsonLd ?? '').trim(),
<<<<<<< HEAD
    ) && Boolean(configuredDatasetLicense(coscineNode.data.roCrateInput?.sheets)
      || coscineNode.data.roCrateInput?.datasetLicense);
=======
    );
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
    const metadataReady = Boolean(
      (coscineNode.data.roCrateInput?.metadataContent ?? '').trim(),
    );

    let detail;
    if (uploadState.uploadState === 'uploaded') {
      detail = checklistText.coscineDone;
    } else if (!crateReady || !metadataReady) {
      detail = checklistText.coscinePendingConnect;
    } else if (!uploadState.hasToken || !uploadState.hasSelectedResource) {
      detail = checklistText.coscinePendingToken;
    } else {
      detail = checklistText.coscineReady;
    }

    steps.push({
      key: `coscine-${coscineNode.id}`,
      label: checklistText.coscine,
      detail,
      autoDone: uploadState.uploadState === 'uploaded',
      focusNodeId: coscineNode.id,
    });
  }

  const withManualChecks = steps.map((step) => ({
    ...step,
    done: step.autoDone || checkedStepKeys.has(step.key),
  }));
  const firstOpenIndex = withManualChecks.findIndex((step) => !step.done);

  return withManualChecks.map((step, index) => ({
    ...step,
    status: step.done ? 'done' : index === firstOpenIndex ? 'current' : 'pending',
  }));
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

    const sourcePayload = { ...preview, sourceIdentity: `${node.id}:${node.data.fileName || ''}` };
    payloadByNodeId.set(node.id, sourcePayload);
    queue.push({ nodeId: node.id, payload: sourcePayload });
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
              fields: buildColumnDescriptionFields(payload.headers, node.data.fields, payload.columnNotes),
<<<<<<< HEAD
              rows: payload.rows,
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
              sheetName: payload.sheetName,
              workbookKey: `${payload.sourceIdentity}:${payload.sheetName}:${payload.headers.join('|')}:${(payload.columnNotes || []).join('|')}`,
            },
          }
        : {
            ...node,
            data: {
              ...node.data,
              fields: [],
<<<<<<< HEAD
              rows: [],
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
              sheetName: '',
              workbookKey: '',
            },
          };
    }

    if (node.type === 'roCrate') {
      return {
        ...node,
        data: {
          ...node.data,
          sheets: payload?.sheets ?? [],
          sourceFile: payload?.sourceFile ?? null,
<<<<<<< HEAD
          selectedSheetName: payload?.sheetName ?? '',
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
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
  const rdfSourcesByNodeId = new Map();
  const columnDescriptionsByNodeId = new Map();

  for (const edge of edges) {
    if (nodeTypesById.get(edge.target) !== 'roCrate') {
      continue;
    }

    const sourceType = nodeTypesById.get(edge.source);
    const sourceData = nodeDataById.get(edge.source) ?? {};
    const producesRdf = ['metadataForm', 'columnDescription', 'headerSchema'].includes(sourceType)
      || (sourceType === 'tabularFile' && sourceData.convertDataToRdf === true);

    if (!producesRdf) {
      continue;
    }

    const rdfContent = ['metadataForm', 'columnDescription', 'headerSchema'].includes(sourceType)
      ? sourceData.serializedRdf
      : sourceData.serializedDataRdf;
    const defaultLabel = {
      metadataForm: 'Metadata Form',
      columnDescription: 'Column Descriptions',
      headerSchema: 'Column Descriptions',
      tabularFile: 'Tabular file',
    }[sourceType];
    const sources = rdfSourcesByNodeId.get(edge.target) ?? new Map();
    sources.set(edge.source, {
      label: sourceData.label || defaultLabel,
      content: rdfContent?.trim() ? rdfContent : '',
    });
    rdfSourcesByNodeId.set(edge.target, sources);

    if (
      ['columnDescription', 'headerSchema'].includes(sourceType) &&
      Array.isArray(sourceData.fields)
    ) {
      columnDescriptionsByNodeId.set(edge.target, sourceData.fields);
    }
  }

  return nodes.map((node) => {
    if (node.type !== 'roCrate') {
      return node;
    }

    const rdfSources = [...(rdfSourcesByNodeId.get(node.id)?.values() ?? [])];

    return {
      ...node,
      data: {
        ...node.data,
        jsonLdContent: {
          jsonLd: rdfSources.map((source) => source.content).filter(Boolean).join('\n\n'),
        },
        pendingRdfInputs: rdfSources
          .filter((source) => !source.content)
          .map((source) => source.label),
        csvwColumnDescriptions: columnDescriptionsByNodeId.get(node.id) ?? [],
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
        columnDescriptions: sourceData.csvwColumnDescriptions ?? [],
        sourceFile: sourceData.sourceFile ?? null,
<<<<<<< HEAD
        selectedSheetName: sourceData.selectedSheetName ?? '',
        datasetLicense: sourceData.datasetLicense ?? '',
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
      });
    }

    if (sourceType === 'metadataForm' && targetType === 'coscine') {
      const serializedRdf = nodeDataById.get(edge.source)?.serializedRdf || '';

      if (serializedRdf) {
        const existingInputs = metadataInputsByCoscineId.get(edge.target) ?? [];
        metadataInputsByCoscineId.set(edge.target, [...existingInputs, serializedRdf]);
      }
    }
  }

  // Older saved layouts used the profile edge in both directions. Keep them
  // functional until the workflow is reconnected and gains the explicit
  // Metadata Form -> Coscine edge.
  for (const edge of edges) {
    if (
      nodeTypesById.get(edge.source) === 'coscine' &&
      nodeTypesById.get(edge.target) === 'metadataForm' &&
      !metadataInputsByCoscineId.has(edge.source)
    ) {
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
          coscineResourceId: profile.resourceId,
          coscineResourceName: profile.resourceName,
        },
      };
    }

    if (node.data.shapesSource !== 'coscine') {
      return node;
    }

    const {
      coscineResourceId,
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
 * Marks Column Description nodes that are connected to a Terminology Service
 * or Units node. The node uses these flags to enable per-column autocomplete
 * (terminology concepts and QUDT units) next to the existing drag-and-drop.
 */
function annotateColumnDescriptionServiceInputs(nodes, edges) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));
  const nodeDataById = new Map(nodes.map((node) => [node.id, node.data]));
  const terminologyColumnNodeIds = new Set();
  const vocabularyByColumnNodeId = new Map();
  const unitInputByColumnNodeId = new Map();

  for (const edge of edges) {
    const sourceType = nodeTypesById.get(edge.source);
    const targetType = nodeTypesById.get(edge.target);

    if (targetType !== 'columnDescription' && targetType !== 'headerSchema') {
      continue;
    }

    if (sourceType === 'terminology') {
      terminologyColumnNodeIds.add(edge.target);
      vocabularyByColumnNodeId.set(edge.target, nodeDataById.get(edge.source)?.selectedVocabularyId || '');
    }

    if (sourceType === 'unit') {
      const sourceData = nodeDataById.get(edge.source) ?? {};
      unitInputByColumnNodeId.set(edge.target, {
        quantityKindFilter: sourceData.quantityKindFilter || '',
        quantityKindLabel: sourceData.quantityKindLabel || '',
      });
    }
  }

  return nodes.map((node) => {
    if (node.type !== 'columnDescription' && node.type !== 'headerSchema') {
      return node;
    }

    return {
      ...node,
      data: {
        ...node.data,
        terminologyInput: terminologyColumnNodeIds.has(node.id),
        selectedVocabularyId: vocabularyByColumnNodeId.get(node.id) || '',
        unitInput: unitInputByColumnNodeId.get(node.id) ?? null,
      },
    };
  });
}

function propagateProfileSearchValidity(nodes, edges) {
  const nodeTypesById = new Map(nodes.map((node) => [node.id, node.type]));
  const coscineFormIds = new Set(
    edges
      .filter(
        (edge) =>
          nodeTypesById.get(edge.source) === 'coscine' &&
          nodeTypesById.get(edge.target) === 'metadataForm',
      )
      .map((edge) => edge.target),
  );

  return nodes.map((node) => {
    if (node.type !== 'profileSearch') return node;

    const invalidated = edges.some(
      (edge) => edge.source === node.id && coscineFormIds.has(edge.target),
    );

    return {
      ...node,
      data: {
        ...node.data,
        invalidated,
      },
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
  const nodesWithServiceInputs = annotateColumnDescriptionServiceInputs(nodesWithUnits, edges);
  const nodesWithROCrate = propagateROCrateInputs(nodesWithServiceInputs, edges);
  const nodesWithCoscineInputs = propagateCoscineInputs(nodesWithROCrate, edges);
  const nodesWithCoscineProfiles = propagateCoscineApplicationProfiles(
    nodesWithCoscineInputs,
    edges,
  );
  const nodesWithProfileValidity = propagateProfileSearchValidity(
    nodesWithCoscineProfiles,
    edges,
  );
  return annotateMetadataFormProfileInputs(nodesWithProfileValidity, edges);
}

function FitWorkflowView({ request }) {
  const { fitView, getNodes, viewportInitialized } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const fittedRequestIdRef = useRef(-1);

  useEffect(() => {
    if (!nodesInitialized || !viewportInitialized || fittedRequestIdRef.current === request.id) {
      return undefined;
    }

    const currentNodeIds = new Set(getNodes().map((node) => node.id));
    if (
      currentNodeIds.size !== request.nodeIds.length ||
      request.nodeIds.some((id) => !currentNodeIds.has(id))
    ) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      fitView({ padding: 0.2, maxZoom: 0.85, duration: request.id === 0 ? 0 : 350 });
      fittedRequestIdRef.current = request.id;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [fitView, getNodes, nodesInitialized, request, viewportInitialized]);

  return null;
}

export default function App() {
  const [startupWorkflow] = useState(() => defaultStartupWorkflow);
  const [nodes, setNodes, onNodesChange] = useNodesState(startupWorkflow.nodes);
  const [edges, setEdges] = useEdgesState(startupWorkflow.edges);
  const [globalLanguage, setGlobalLanguage] = useState('en');
  const [checkedStepKeys, setCheckedStepKeys] = useState(() => new Set());
  const text = appText[globalLanguage] ?? appText.en;
  const workflowSteps = buildWorkflowChecklist(nodes, text.checklist, checkedStepKeys);
  const canvasRef = useRef(null);
  const checklistRef = useRef(null);
  const [checklistFits, setChecklistFits] = useState(false);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const checklist = checklistRef.current;
    if (!canvas || !checklist) return undefined;

    const updateChecklistFit = () => {
<<<<<<< HEAD
      setChecklistFits(checklist.offsetWidth <= canvas.clientWidth - 24);
=======
      // Leave space on both sides for the language selector and a clear margin.
      setChecklistFits(checklist.offsetWidth <= canvas.clientWidth - 220);
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
    };
    const observer = new ResizeObserver(updateChecklistFit);
    observer.observe(canvas);
    observer.observe(checklist);
    updateChecklistFit();
    return () => observer.disconnect();
  }, []);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [fitRequest, setFitRequest] = useState(() => ({
    id: 0,
    nodeIds: startupWorkflow.nodes.map((node) => node.id),
  }));
  const [connectionNotice, setConnectionNotice] = useState(null);
<<<<<<< HEAD
  const importInputRef = useRef(null);
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
  const nodeIdCountRef = useRef(startupWorkflow.nodes.length);
  const nodeTypeCountsRef = useRef(buildNodeTypeCounts(startupWorkflow.nodes));
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const tabularMemoryRef = useRef(new Map());
  const tabularBuffersRef = useRef(new Map());
  const tabularRdfConversionsRef = useRef(new Map());
  const columnDescriptionRdfTimersRef = useRef(new Map());
  const profileDefinitionRequestsRef = useRef(new Map());
  const pythonRunsRef = useRef(new Map());
  const n8nRunsRef = useRef(new Map());
  const pythonFingerprintsRef = useRef(new Map());

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    if (!connectionNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setConnectionNotice(null), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [connectionNotice]);

  useEffect(
    () => () => {
      for (const controller of tabularRdfConversionsRef.current.values()) {
        controller.abort();
      }
      tabularRdfConversionsRef.current.clear();
<<<<<<< HEAD
      for (const controller of pythonRunsRef.current.values()) {
        controller.abort();
      }
      for (const controller of n8nRunsRef.current.values()) {
        controller.abort();
      }
      pythonRunsRef.current.clear();
      n8nRunsRef.current.clear();
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
      for (const timeoutId of columnDescriptionRdfTimersRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      columnDescriptionRdfTimersRef.current.clear();
    },
    [],
  );

  const startTabularRdfConversion = useCallback(
    (nodeId, sheets) => {
      tabularRdfConversionsRef.current.get(nodeId)?.abort();
      const controller = new AbortController();
      const conversionId = `${Date.now()}-${Math.random()}`;
      tabularRdfConversionsRef.current.set(nodeId, controller);

      const updateConversionData = (conversionData, derive = false) => {
        if (tabularRdfConversionsRef.current.get(nodeId) !== controller) {
          return;
        }

        setNodes((currentNodes) => {
          const updatedNodes = currentNodes.map((node) =>
            node.id === nodeId &&
            (!node.data.rdfConversionId || node.data.rdfConversionId === conversionId)
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    rdfConversionId: conversionId,
                    ...conversionData,
                  },
                }
              : node,
          );
          const nextNodes = derive
            ? deriveNodeData(updatedNodes, edgesRef.current, tabularMemoryRef.current)
            : updatedNodes;
          nodesRef.current = nextNodes;
          return nextNodes;
        });
      };

      updateConversionData({
        rdfConversionState: 'running',
        rdfConversionProgress: 0,
        rdfConversionError: '',
      });

      serializeTabularDataInWorker(sheets, {
        signal: controller.signal,
        onProgress: ({ percent }) => {
          updateConversionData({ rdfConversionProgress: percent });
        },
      })
        .then((serializedDataRdf) => {
          updateConversionData(
            {
              serializedDataRdf,
              rdfConversionState: 'complete',
              rdfConversionProgress: 100,
              rdfConversionError: '',
            },
            true,
          );
        })
        .catch((error) => {
          if (error?.name !== 'AbortError') {
            updateConversionData({
              serializedDataRdf: '',
              rdfConversionState: 'error',
              rdfConversionError:
                error?.message || 'Could not convert the tabular data to RDF.',
            });
          }
        })
        .finally(() => {
          if (tabularRdfConversionsRef.current.get(nodeId) === controller) {
            tabularRdfConversionsRef.current.delete(nodeId);
          }
        });
    },
    [setNodes],
  );

  const onColumnDescriptionFieldsChange = useCallback(
    (nodeId, fields) => {
      setNodes((currentNodes) => {
        const nodesWithFields = currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  fields,
                },
              }
            : node,
        );
        nodesRef.current = nodesWithFields;
        return nodesWithFields;
      });

      window.clearTimeout(columnDescriptionRdfTimersRef.current.get(nodeId));
      const timeoutId = window.setTimeout(() => {
        columnDescriptionRdfTimersRef.current.delete(nodeId);
        setNodes((currentNodes) => {
          const currentNode = currentNodes.find((node) => node.id === nodeId);

          if (!currentNode) {
            return currentNodes;
          }

          const serializedRdf = serializeColumnDescriptionsToTurtle(currentNode.data.fields);
          const nodesWithRdf = currentNodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, serializedRdf } }
              : node,
          );
          const nextNodes = deriveNodeData(
            nodesWithRdf,
            edgesRef.current,
            tabularMemoryRef.current,
          );

          nodesRef.current = nextNodes;
          return nextNodes;
        });
      }, columnDescriptionRdfDebounceMs);
      columnDescriptionRdfTimersRef.current.set(nodeId, timeoutId);
    },
    [setNodes],
  );

  const onTerminologyVocabularyChange = useCallback((nodeId, selectedVocabularyId) => {
    setNodes((currentNodes) => {
      const updated = currentNodes.map((node) => node.id === nodeId
        ? { ...node, data: { ...node.data, selectedVocabularyId } }
        : node);
      const derived = annotateColumnDescriptionServiceInputs(updated, edgesRef.current);
      nodesRef.current = derived;
      return derived;
    });
  }, [setNodes]);

  const onTabularLoaded = useCallback(
    (nodeId, fileName, buffer, hasHeader, transpose, manualTranspose = false, manualHeader = false) => {
      tabularRdfConversionsRef.current.get(nodeId)?.abort();
      tabularRdfConversionsRef.current.delete(nodeId);
      const preview = parseTabularWorkbook(buffer, 5, hasHeader, transpose);
      const sourceNode = nodesRef.current.find((node) => node.id === nodeId);
      const shouldConvertToRdf = sourceNode?.data.convertDataToRdf === true;
      const sourceFile = /\.(xls|xlsx|xlsm|xlsb)$/i.test(fileName)
        ? { fileName, content: buffer }
        : null;
      tabularMemoryRef.current.set(nodeId, { ...preview, sourceFile });
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
                    hasHeader: preview.hasHeader,
                    hasHeaderManuallySet: manualHeader || sourceNode?.data.hasHeaderManuallySet === true,
                    transpose: preview.transpose,
                    transposeManuallySet: manualTranspose || sourceNode?.data.transposeManuallySet === true,
                    rowCount: preview.rowCount,
                    parameterRowCount: preview.parameterRowCount,
                    layoutNote: preview.layoutNote,
                    sheetName: preview.sheetName,
                    serializedDataRdf: '',
                    rdfConversionId: '',
                    rdfConversionState: shouldConvertToRdf ? 'queued' : '',
                    rdfConversionProgress: 0,
                    rdfConversionError: '',
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

      if (shouldConvertToRdf) {
        startTabularRdfConversion(nodeId, preview.sheets);
      }
    },
    [setNodes, startTabularRdfConversion],
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
          node?.data.transposeManuallySet === true,
          true,
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
          node?.data.hasHeaderManuallySet ? node?.data.hasHeader === true : undefined,
          transpose,
          true,
        );
        return;
      }

      setNodes((currentNodes) => {
        const nextNodes = currentNodes.map((candidate) =>
          candidate.id === nodeId
            ? { ...candidate, data: { ...candidate.data, transpose, transposeManuallySet: true } }
            : candidate,
        );
        nodesRef.current = nextNodes;
        return nextNodes;
      });
    },
    [onTabularLoaded, setNodes],
  );

  const onTabularRdfConversionChange = useCallback(
    (nodeId, convertDataToRdf) => {
      const preview = tabularMemoryRef.current.get(nodeId);
      tabularRdfConversionsRef.current.get(nodeId)?.abort();
      tabularRdfConversionsRef.current.delete(nodeId);

      setNodes((currentNodes) => {
        const updatedNodes = currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  convertDataToRdf,
                  serializedDataRdf: '',
                  rdfConversionId: '',
                  rdfConversionState: convertDataToRdf && preview ? 'queued' : '',
                  rdfConversionProgress: 0,
                  rdfConversionError: '',
                },
              }
            : node,
        );
        const nextNodes = deriveNodeData(
          updatedNodes,
          edgesRef.current,
          tabularMemoryRef.current,
        );
        nodesRef.current = nextNodes;
        return nextNodes;
      });

      if (convertDataToRdf && preview) {
        startTabularRdfConversion(nodeId, preview.sheets);
      }
    },
    [setNodes, startTabularRdfConversion],
  );

  const onProfileSelect = useCallback(
    async (profileSearchNodeId, profile) => {
      const profileSearchNode = nodesRef.current.find(
        (node) => node.id === profileSearchNodeId,
      );
      if (profileSearchNode?.data.invalidated) {
        throw new Error(
          'This profile link is inactive because Coscine supplies the metadata form profile.',
        );
      }

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

  const onCoscineUploadStateChange = useCallback(
    (nodeId, uploadState) => {
      setNodes((currentNodes) => {
        const nextNodes = currentNodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, coscineUploadState: uploadState } }
            : node,
        );
        nodesRef.current = nextNodes;
        return nextNodes;
      });
    },
    [setNodes],
  );

<<<<<<< HEAD
  const onDatasetLicenseChange = useCallback((nodeId, datasetLicense) => {
    setNodes((currentNodes) => {
      const changedNodes = currentNodes.map((node) => node.id === nodeId
        ? { ...node, data: { ...node.data, datasetLicense } }
        : node);
      const nextNodes = deriveNodeData(changedNodes, edgesRef.current, tabularMemoryRef.current);
      nodesRef.current = nextNodes;
      return nextNodes;
    });
  }, [setNodes]);

=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
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

<<<<<<< HEAD
  const getN8nInputs = useCallback((nodeId) => collectN8nInputs(
    nodesRef.current, edgesRef.current, nodeId, tabularMemoryRef.current,
  ), []);

  const onN8nConfigChange = useCallback((nodeId, patch) => {
    n8nRunsRef.current.get(nodeId)?.abort();
    n8nRunsRef.current.delete(nodeId);
    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => node.id === nodeId
        ? { ...node, data: {
          ...node.data,
          ...patch,
          ...(patch.communityNodeName !== undefined
            ? { label: patch.communityNodeName.trim() || 'n8n community node' }
            : {}),
          n8nStatus: '', n8nError: '', n8nOutput: undefined,
        } }
        : node);
      nodesRef.current = nextNodes;
      return nextNodes;
    });
  }, [setNodes]);

  const onN8nRun = useCallback(async (nodeId) => {
    const node = nodesRef.current.find((candidate) => candidate.id === nodeId);
    if (!node || node.type !== 'n8nCommunity') return;
    const inputs = getN8nInputs(nodeId);
    const controller = new AbortController();
    n8nRunsRef.current.get(nodeId)?.abort();
    n8nRunsRef.current.set(nodeId, controller);
    const patchNode = (patch) => setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((candidate) => candidate.id === nodeId
        ? { ...candidate, data: { ...candidate.data, ...patch } }
        : candidate);
      nodesRef.current = nextNodes;
      return nextNodes;
    });
    if (Object.keys(inputs).length === 0) {
      patchNode({ n8nStatus: 'error', n8nError: 'Connect an input node before running.', n8nOutput: undefined });
      n8nRunsRef.current.delete(nodeId);
      return;
    }
    patchNode({ n8nStatus: 'running', n8nError: '', n8nOutput: undefined });
    try {
      const output = await runN8nNode({
        webhookUrl: node.data.webhookUrl,
        authHeaderName: node.data.authHeaderName,
        authHeaderValue: node.data.authHeaderValue,
        communityNode: {
          name: node.data.communityNodeName,
          package: node.data.communityPackage,
        },
        inputs,
        signal: controller.signal,
      });
      if (n8nRunsRef.current.get(nodeId) !== controller) return;
      patchNode({ n8nStatus: 'done', n8nError: '', n8nOutput: output });
    } catch (error) {
      if (n8nRunsRef.current.get(nodeId) !== controller) return;
      if (error?.name !== 'AbortError') {
        patchNode({ n8nStatus: 'error', n8nError: error?.message || 'n8n failed.', n8nOutput: undefined });
      }
    } finally {
      if (n8nRunsRef.current.get(nodeId) === controller) n8nRunsRef.current.delete(nodeId);
    }
  }, [getN8nInputs, setNodes]);
=======
  Object.assign(nodeHandlers, {
    onTabularLoaded,
    onTabularHasHeaderChange,
    onTabularTransposeChange,
    onTabularRdfConversionChange,
    onColumnDescriptionFieldsChange,
    onTerminologyVocabularyChange,
    onMetadataRdfChange,
    onProfileSelect,
    onCoscineApplicationProfileLoaded,
    onCoscineUploadStateChange,
    onQuantityKindSelect,
  });
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571

  const onConnect = useCallback(
    (connection) => {
      let workingNodes = nodesRef.current;
      const nodeTypesById = new Map(
        workingNodes.map((node) => [node.id, node.type]),
      );
      let nextEdges = addEdge(connection, edgesRef.current);

      if (
        nodeTypesById.get(connection.source) === 'roCrate' &&
        nodeTypesById.get(connection.target) === 'coscine'
      ) {
        const connectedFormId = nextEdges.find(
          (edge) =>
            edge.target === connection.source &&
            nodeTypesById.get(edge.source) === 'metadataForm',
        )?.source;
        let metadataFormId =
          connectedFormId ||
          workingNodes.find((node) => node.type === 'metadataForm')?.id;

        if (!metadataFormId) {
          nodeIdCountRef.current += 1;
          nodeTypeCountsRef.current.metadataForm =
            (nodeTypeCountsRef.current.metadataForm ?? 0) + 1;
          metadataFormId = `node-${nodeIdCountRef.current}`;
          const coscineNode = workingNodes.find(
            (node) => node.id === connection.target,
          );
          workingNodes = [
            ...workingNodes,
            {
              id: metadataFormId,
              type: 'metadataForm',
              position: {
                x: (coscineNode?.position.x ?? 0) + 420,
                y: coscineNode?.position.y ?? 0,
              },
              data: {
                label: `Metadata Form ${nodeTypeCountsRef.current.metadataForm}`,
                language: globalLanguage,
              },
            },
          ];
          nodeTypesById.set(metadataFormId, 'metadataForm');
        }

        const alreadyConnected = nextEdges.some(
          (edge) =>
            edge.source === connection.target && edge.target === metadataFormId,
        );

        if (metadataFormId && !alreadyConnected) {
          nextEdges = addEdge(
            {
              id: `auto-${connection.target}-${metadataFormId}`,
              source: connection.target,
              target: metadataFormId,
            },
            nextEdges,
          );
        }

        const metadataFeedsCoscine = nextEdges.some(
          (edge) =>
            edge.source === metadataFormId && edge.target === connection.target,
        );
        if (metadataFormId && !metadataFeedsCoscine) {
          nextEdges = addEdge(
            {
              id: `auto-${metadataFormId}-${connection.target}`,
              source: metadataFormId,
              target: connection.target,
            },
            nextEdges,
          );
        }
      }

      nextEdges = styleWorkflowEdges(nextEdges, workingNodes);
      const nextNodes = deriveNodeData(
        workingNodes,
        nextEdges,
        tabularMemoryRef.current,
      );

      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      setNodes(nextNodes);
      setEdges(nextEdges);
    },
    [globalLanguage, setEdges, setNodes],
  );

  const isValidConnection = useCallback(
    (connection) =>
      isSupportedConnection(connection, nodesRef.current, edgesRef.current),
    [],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      const { allowedChanges, rejectedRemoval } =
        protectCoscineMetadataConnections(
          changes,
          edgesRef.current,
          nodesRef.current,
        );

      if (rejectedRemoval) {
        setConnectionNotice({
          id: Date.now(),
          message:
            'Coscine needs its Metadata Form connection while it is connected to an RO-Crate. Disconnect Coscine from the RO-Crate first.',
        });
      }

      setEdges((currentEdges) => {
        const nextEdges = styleWorkflowEdges(
          applyEdgeChanges(allowedChanges, currentEdges),
          nodesRef.current,
        );
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
      window.clearTimeout(columnDescriptionRdfTimersRef.current.get(node.id));
      columnDescriptionRdfTimersRef.current.delete(node.id);
      tabularRdfConversionsRef.current.get(node.id)?.abort();
      tabularRdfConversionsRef.current.delete(node.id);
      tabularMemoryRef.current.delete(node.id);
      tabularBuffersRef.current.delete(node.id);

      if (node.type === 'profileSearch') {
        profileDefinitionRequestsRef.current.get(node.id)?.abort();
        profileDefinitionRequestsRef.current.delete(node.id);
      }

      pythonRunsRef.current.get(node.id)?.abort();
      pythonRunsRef.current.delete(node.id);
      pythonFingerprintsRef.current.delete(node.id);
      n8nRunsRef.current.get(node.id)?.abort();
      n8nRunsRef.current.delete(node.id);
    }
  }, []);

  const onDragStart = useCallback((event, template) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const focusStepNode = useCallback(
    (nodeId) => {
      if (!nodeId || !reactFlowInstance) {
        return;
      }

      reactFlowInstance.fitView({
        nodes: [{ id: nodeId }],
        duration: 400,
        padding: 0.3,
        maxZoom: 1,
      });
    },
    [reactFlowInstance],
  );

  const toggleStepChecked = useCallback((stepKey) => {
    setCheckedStepKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      if (nextKeys.has(stepKey)) {
        nextKeys.delete(stepKey);
      } else {
        nextKeys.add(stepKey);
      }

      return nextKeys;
    });
  }, []);

  const handleStepClick = useCallback(
    (step) => {
      focusStepNode(step.focusNodeId);

      // Checking a completed step would be a no-op, so only incomplete steps
      // respond to the manual check toggle.
      if (!step.autoDone) {
        toggleStepChecked(step.key);
      }
    },
    [focusStepNode, toggleStepChecked],
  );

  const onDragOver = useCallback((event) => {
    const types = Array.from(event.dataTransfer.types);
    if (!types.includes('application/reactflow')) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const addTemplateAtPosition = useCallback(
    (template, position) => {
      if (template.type === 'quantityKindAndUnit') {
        const quantityKindCount = (nodeTypeCountsRef.current.quantityKind ?? 0) + 1;
        const unitCount = (nodeTypeCountsRef.current.unit ?? 0) + 1;
        nodeTypeCountsRef.current.quantityKind = quantityKindCount;
        nodeTypeCountsRef.current.unit = unitCount;

        nodeIdCountRef.current += 1;
        const quantityKindId = `node-${nodeIdCountRef.current}`;
        nodeIdCountRef.current += 1;
        const unitId = `node-${nodeIdCountRef.current}`;
        const addedNodes = [
          {
            id: quantityKindId,
            type: 'quantityKind',
            position,
            data: {
              label: `Quantity Kinds ${quantityKindCount}`,
              language: globalLanguage,
            },
          },
          {
            id: unitId,
            type: 'unit',
            position: { x: position.x + 440, y: position.y },
            data: {
              label: `Units ${unitCount}`,
              language: globalLanguage,
            },
          },
        ];
        const workingNodes = [...nodesRef.current, ...addedNodes];
        const nextEdges = styleWorkflowEdges(
          [
            ...edgesRef.current,
            {
              id: `auto-${quantityKindId}-${unitId}`,
              source: quantityKindId,
              target: unitId,
            },
          ],
          workingNodes,
        );
        const nextNodes = deriveNodeData(
          workingNodes,
          nextEdges,
          tabularMemoryRef.current,
        );

        nodesRef.current = nextNodes;
        edgesRef.current = nextEdges;
        setNodes(nextNodes);
        setEdges(nextEdges);
        return;
      }

<<<<<<< HEAD
=======
      const rawTemplate = event.dataTransfer.getData('application/reactflow');

      if (!rawTemplate) {
        return;
      }

      event.preventDefault();

      const template = JSON.parse(rawTemplate);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (template.type === 'quantityKindAndUnit') {
        const quantityKindCount = (nodeTypeCountsRef.current.quantityKind ?? 0) + 1;
        const unitCount = (nodeTypeCountsRef.current.unit ?? 0) + 1;
        nodeTypeCountsRef.current.quantityKind = quantityKindCount;
        nodeTypeCountsRef.current.unit = unitCount;

        nodeIdCountRef.current += 1;
        const quantityKindId = `node-${nodeIdCountRef.current}`;
        nodeIdCountRef.current += 1;
        const unitId = `node-${nodeIdCountRef.current}`;
        const addedNodes = [
          {
            id: quantityKindId,
            type: 'quantityKind',
            position,
            data: {
              label: `Quantity Kinds ${quantityKindCount}`,
              language: globalLanguage,
            },
          },
          {
            id: unitId,
            type: 'unit',
            position: { x: position.x + 440, y: position.y },
            data: {
              label: `Units ${unitCount}`,
              language: globalLanguage,
            },
          },
        ];
        const workingNodes = [...nodesRef.current, ...addedNodes];
        const nextEdges = styleWorkflowEdges(
          [
            ...edgesRef.current,
            {
              id: `auto-${quantityKindId}-${unitId}`,
              source: quantityKindId,
              target: unitId,
            },
          ],
          workingNodes,
        );
        const nextNodes = deriveNodeData(
          workingNodes,
          nextEdges,
          tabularMemoryRef.current,
        );

        nodesRef.current = nextNodes;
        edgesRef.current = nextEdges;
        setNodes(nextNodes);
        setEdges(nextEdges);
        return;
      }

>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
      nodeIdCountRef.current += 1;
      const nextTypeCount = (nodeTypeCountsRef.current[template.type] ?? 0) + 1;
      nodeTypeCountsRef.current[template.type] = nextTypeCount;

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
<<<<<<< HEAD
    [globalLanguage, setEdges, setNodes],
  );

  const onDrop = useCallback((event) => {
    if (!reactFlowInstance) return;
    const rawTemplate = event.dataTransfer.getData('application/reactflow');
    if (!rawTemplate) return;
    let template;
    try {
      template = JSON.parse(rawTemplate);
    } catch {
      return;
    }
    event.preventDefault();
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    addTemplateAtPosition(template, position);
  }, [addTemplateAtPosition, reactFlowInstance]);

  const addTemplateAtCanvasCenter = useCallback((template) => {
    if (!reactFlowInstance || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const offset = (nodeIdCountRef.current % 6) * 28;
    const position = reactFlowInstance.screenToFlowPosition({
      x: rect.left + rect.width / 2 + offset,
      y: rect.top + rect.height / 2 + offset,
    });
    addTemplateAtPosition(template, position);
  }, [addTemplateAtPosition, reactFlowInstance]);

  const handleExportWorkflow = useCallback(() => {
    const payload = {
      ...serializeSelection({
        nodes: nodesRef.current,
        edges: edgesRef.current,
        name: 'workflow',
      }),
      kind: 'workflow',
    };
    downloadJsonFile('tabular-workflow.json', payload);
  }, []);

  const handleImportFile = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !reactFlowInstance) {
        return;
      }

      let payload;
      try {
        payload = await readJsonFile(file);
      } catch (error) {
        setConnectionNotice({ id: Date.now(), message: error?.message || 'Import failed.' });
        return;
      }

      const result = validateImportPayload(payload, {
        knownTypes: Object.keys(nodeTypes),
        isValidConnection: isSupportedConnection,
        existingNodeIds: nodesRef.current.map((node) => node.id),
        untrustedTypes: ['pythonScript'],
      });

      if (result.error) {
        setConnectionNotice({ id: Date.now(), message: result.error });
        return;
      }
      if (result.nodes.length === 0) {
        setConnectionNotice({
          id: Date.now(),
          message: 'The file contains no nodes with known types. Nothing was imported.',
        });
        return;
      }

      let placedNodes = result.nodes;
      if (payload.kind === 'node' && placedNodes.length === 1 && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const center = reactFlowInstance.screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
        placedNodes = placedNodes.map((node) => ({ ...node, position: center }));
      }

      const workingNodes = [...nodesRef.current, ...placedNodes];
      const nextEdges = styleWorkflowEdges([...edgesRef.current, ...result.edges], workingNodes);
      const nextNodes = deriveNodeData(workingNodes, nextEdges, tabularMemoryRef.current);

      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      nodeTypeCountsRef.current = buildNodeTypeCounts(nextNodes);
      setNodes(nextNodes);
      setEdges(nextEdges);
      setFitRequest((current) => ({
        id: current.id + 1,
        nodeIds: nextNodes.map((node) => node.id),
      }));

      const summary = `Imported ${result.nodes.length} node${
        result.nodes.length === 1 ? '' : 's'
      } and ${result.edges.length} connection${result.edges.length === 1 ? '' : 's'}.`;
      setConnectionNotice({
        id: Date.now(),
        message: result.warnings.length ? `${summary} ${result.warnings.join(' ')}` : summary,
      });
    },
    [reactFlowInstance, setEdges, setNodes],
  );

  /**
   * Runs one Python node on the local server and writes status/output back
   * into its data. Auto-runs are skipped for untrusted (imported) nodes and
   * when the code+inputs fingerprint has not changed, so the effect that
   * triggers them cannot loop.
   */
  const runPythonNodeNow = useCallback(async (nodeId, { manual = false } = {}) => {
    const node = nodesRef.current.find((candidate) => candidate.id === nodeId);
    if (!node || node.type !== 'pythonScript') return;
    if (!manual && node.data.trusted === false) return;

    const code =
      typeof node.data.code === 'string' && node.data.code.trim()
        ? node.data.code
        : DEFAULT_PYTHON_NODE_CODE;
    const inputs = collectPythonInputs(
      nodesRef.current,
      edgesRef.current,
      nodeId,
      tabularMemoryRef.current,
    );
    const config = sanitizeNodeData(node.data);
    delete config.pythonOutput;
    delete config.pythonError;
    delete config.pythonStatus;
    const fingerprint = JSON.stringify({ code, inputs, config });

    if (!manual && pythonFingerprintsRef.current.get(nodeId) === fingerprint) return;
    pythonFingerprintsRef.current.set(nodeId, fingerprint);

    pythonRunsRef.current.get(nodeId)?.abort();
    const controller = new AbortController();
    pythonRunsRef.current.set(nodeId, controller);

    const patchNode = (patch) => {
      setNodes((currentNodes) => {
        const nextNodes = currentNodes.map((candidate) =>
          candidate.id === nodeId
            ? { ...candidate, data: { ...candidate.data, ...patch } }
            : candidate,
        );
        nodesRef.current = nextNodes;
        return nextNodes;
      });
    };

    patchNode({ pythonStatus: 'running', pythonError: '' });

    try {
      const output = await runPythonNode({ code, inputs, data: config, signal: controller.signal });
      if (pythonRunsRef.current.get(nodeId) !== controller) return;
      patchNode({
        pythonStatus: 'done',
        pythonError: '',
        pythonOutput: sanitizeNodeData(output),
      });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      if (pythonRunsRef.current.get(nodeId) !== controller) return;
      patchNode({
        pythonStatus: 'error',
        pythonError: error?.message || 'The script failed.',
        pythonOutput: undefined,
      });
    }
  }, []);

  useEffect(() => {
    const pythonNodes = nodes.filter((node) => node.type === 'pythonScript');
    if (pythonNodes.length === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      for (const node of pythonNodes) {
        runPythonNodeNow(node.id);
      }
    }, 600);
    return () => window.clearTimeout(timeoutId);
  }, [nodes, edges, runPythonNodeNow]);

  const onPythonCodeChange = useCallback(
    (nodeId, code) => {
      pythonFingerprintsRef.current.delete(nodeId);
      setNodes((currentNodes) => {
        const nextNodes = currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  code,
                  pythonStatus: '',
                  pythonError: '',
                  pythonOutput: undefined,
                },
              }
            : node,
        );
        nodesRef.current = nextNodes;
        return nextNodes;
      });
    },
    [setNodes],
  );

  const onPythonRun = useCallback(
    (nodeId) => {
      runPythonNodeNow(nodeId, { manual: true });
    },
    [runPythonNodeNow],
  );

  const onPythonTrust = useCallback(
    (nodeId) => {
      setNodes((currentNodes) => {
        const nextNodes = currentNodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, trusted: true } } : node,
        );
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
    onTabularRdfConversionChange,
    onColumnDescriptionFieldsChange,
    onTerminologyVocabularyChange,
    onMetadataRdfChange,
    onProfileSelect,
    onCoscineApplicationProfileLoaded,
    onCoscineUploadStateChange,
    onDatasetLicenseChange,
    onQuantityKindSelect,
    onPythonCodeChange,
    onPythonRun,
    onPythonTrust,
    onN8nConfigChange,
    onN8nRun,
    getN8nInputs,
  });

  const applyWorkflowTemplate = useCallback(
    (templateType) => {
      const previousNodes = nodesRef.current;

      // Capture the previous workflow's work before the refs are cleared, so
      // it can be carried over into the new template where the node types match.
      const previousTabularNode =
        previousNodes.find((node) => node.type === 'tabularFile' && node.data.fileName) ??
        previousNodes.find((node) => node.type === 'tabularFile') ??
        null;
      const previousTabularBuffer = previousTabularNode
        ? tabularBuffersRef.current.get(previousTabularNode.id)
        : undefined;
      const previousTabularPreview = previousTabularNode
        ? tabularMemoryRef.current.get(previousTabularNode.id)
        : undefined;
      const previousColumnNode = previousNodes.find(
        (node) =>
          ['columnDescription', 'headerSchema'].includes(node.type) &&
          Array.isArray(node.data.fields) &&
          node.data.fields.length > 0,
      );
      const previousColumnRdf = previousColumnNode &&
        columnDescriptionRdfTimersRef.current.has(previousColumnNode.id)
        ? serializeColumnDescriptionsToTurtle(previousColumnNode.data.fields)
        : previousColumnNode?.data.serializedRdf ?? '';
      const previousProfileFormNode = previousNodes.find(
        (node) =>
          node.type === 'metadataForm' &&
          node.data.shapesSource === 'aims' &&
          node.data.shapes,
      );
      const previousMetadataRdfNode = previousNodes.find(
        (node) => node.type === 'metadataForm' && (node.data.serializedRdf ?? '').trim() !== '',
      );
      const previousCoscineProfile = previousNodes.find(
        (node) => node.type === 'coscine' && node.data.coscineApplicationProfile,
      )?.data.coscineApplicationProfile;
      const previousQuantityKindNode = previousNodes.find(
        (node) => node.type === 'quantityKind' && node.data.selectedQuantityKind,
      );
      const shouldConvertToRdf = previousTabularNode?.data.convertDataToRdf === true;

      for (const controller of tabularRdfConversionsRef.current.values()) {
        controller.abort();
      }
      for (const controller of profileDefinitionRequestsRef.current.values()) {
        controller.abort();
      }
      for (const controller of pythonRunsRef.current.values()) {
        controller.abort();
      }
      for (const controller of n8nRunsRef.current.values()) {
        controller.abort();
      }
      pythonRunsRef.current.clear();
      pythonFingerprintsRef.current.clear();
      n8nRunsRef.current.clear();
      for (const timeoutId of columnDescriptionRdfTimersRef.current.values()) {
        window.clearTimeout(timeoutId);
      }

      tabularRdfConversionsRef.current.clear();
      columnDescriptionRdfTimersRef.current.clear();
      profileDefinitionRequestsRef.current.clear();
      tabularMemoryRef.current.clear();
      tabularBuffersRef.current.clear();

      if (previousTabularBuffer) {
        tabularBuffersRef.current.set('template-tabular', previousTabularBuffer);
      }
      if (previousTabularPreview) {
        tabularMemoryRef.current.set('template-tabular', previousTabularPreview);
      }

      const template = createWorkflowTemplate(templateType, globalLanguage);
      const templateNodesWithCarryOver = template.nodes.map((node) => {
        if (node.id === 'template-tabular' && previousTabularNode && previousTabularBuffer) {
          return {
            ...node,
            data: {
              ...node.data,
              fileName: previousTabularNode.data.fileName,
              hasHeader: previousTabularNode.data.hasHeader !== false,
              hasHeaderManuallySet: previousTabularNode.data.hasHeaderManuallySet === true,
              transpose: previousTabularNode.data.transpose === true,
              transposeManuallySet: previousTabularNode.data.transposeManuallySet === true,
              convertDataToRdf: shouldConvertToRdf,
              rowCount: previousTabularNode.data.rowCount,
              parameterRowCount: previousTabularNode.data.parameterRowCount,
              layoutNote: previousTabularNode.data.layoutNote,
              sheetName: previousTabularNode.data.sheetName,
              rdfConversionState: shouldConvertToRdf ? 'queued' : '',
            },
          };
        }

        if (node.id === 'template-columns' && previousColumnNode) {
          return {
            ...node,
            data: {
              ...node.data,
              fields: previousColumnNode.data.fields,
              serializedRdf: previousColumnRdf,
            },
          };
        }

        if (node.id === 'template-metadata-form') {
          return {
            ...node,
            data: {
              ...node.data,
              ...(previousMetadataRdfNode
                ? {
                    carriedValuesRdf: previousMetadataRdfNode.data.serializedRdf,
                    serializedRdf: previousMetadataRdfNode.data.serializedRdf,
                  }
                : {}),
              ...(previousProfileFormNode
                ? {
                    shapes: previousProfileFormNode.data.shapes,
                    shapesKey: previousProfileFormNode.data.shapesKey,
                    profileName: previousProfileFormNode.data.profileName,
                    profileBaseUri: previousProfileFormNode.data.profileBaseUri,
                    shapesSource: 'aims',
                  }
                : {}),
            },
          };
        }

        if (node.id === 'template-coscine' && previousCoscineProfile) {
          return {
            ...node,
            data: {
              ...node.data,
              coscineApplicationProfile: previousCoscineProfile,
              preselectedResourceKey: `${previousCoscineProfile.projectId}:${previousCoscineProfile.resourceId}`,
            },
          };
        }

        if (node.id === 'template-quantity-kinds' && previousQuantityKindNode) {
          return {
            ...node,
            data: {
              ...node.data,
              selectedQuantityKind: previousQuantityKindNode.data.selectedQuantityKind,
            },
          };
        }

        return node;
      });
      const nextNodes = deriveNodeData(
        templateNodesWithCarryOver,
        template.edges,
        tabularMemoryRef.current,
      );

=======
    [globalLanguage, reactFlowInstance, setEdges, setNodes],
  );

  const applyWorkflowTemplate = useCallback(
    (templateType) => {
      const previousNodes = nodesRef.current;

      // Capture the previous workflow's work before the refs are cleared, so
      // it can be carried over into the new template where the node types match.
      const previousTabularNode =
        previousNodes.find((node) => node.type === 'tabularFile' && node.data.fileName) ??
        previousNodes.find((node) => node.type === 'tabularFile') ??
        null;
      const previousTabularBuffer = previousTabularNode
        ? tabularBuffersRef.current.get(previousTabularNode.id)
        : undefined;
      const previousTabularPreview = previousTabularNode
        ? tabularMemoryRef.current.get(previousTabularNode.id)
        : undefined;
      const previousColumnNode = previousNodes.find(
        (node) =>
          ['columnDescription', 'headerSchema'].includes(node.type) &&
          Array.isArray(node.data.fields) &&
          node.data.fields.length > 0,
      );
      const previousColumnRdf = previousColumnNode &&
        columnDescriptionRdfTimersRef.current.has(previousColumnNode.id)
        ? serializeColumnDescriptionsToTurtle(previousColumnNode.data.fields)
        : previousColumnNode?.data.serializedRdf ?? '';
      const previousProfileFormNode = previousNodes.find(
        (node) =>
          node.type === 'metadataForm' &&
          node.data.shapesSource === 'aims' &&
          node.data.shapes,
      );
      const previousMetadataRdfNode = previousNodes.find(
        (node) => node.type === 'metadataForm' && (node.data.serializedRdf ?? '').trim() !== '',
      );
      const previousCoscineProfile = previousNodes.find(
        (node) => node.type === 'coscine' && node.data.coscineApplicationProfile,
      )?.data.coscineApplicationProfile;
      const previousQuantityKindNode = previousNodes.find(
        (node) => node.type === 'quantityKind' && node.data.selectedQuantityKind,
      );
      const shouldConvertToRdf = previousTabularNode?.data.convertDataToRdf === true;

      for (const controller of tabularRdfConversionsRef.current.values()) {
        controller.abort();
      }
      for (const controller of profileDefinitionRequestsRef.current.values()) {
        controller.abort();
      }
      for (const timeoutId of columnDescriptionRdfTimersRef.current.values()) {
        window.clearTimeout(timeoutId);
      }

      tabularRdfConversionsRef.current.clear();
      columnDescriptionRdfTimersRef.current.clear();
      profileDefinitionRequestsRef.current.clear();
      tabularMemoryRef.current.clear();
      tabularBuffersRef.current.clear();

      if (previousTabularBuffer) {
        tabularBuffersRef.current.set('template-tabular', previousTabularBuffer);
      }
      if (previousTabularPreview) {
        tabularMemoryRef.current.set('template-tabular', previousTabularPreview);
      }

      const template = createWorkflowTemplate(templateType, globalLanguage);
      const templateNodesWithCarryOver = template.nodes.map((node) => {
        if (node.id === 'template-tabular' && previousTabularNode && previousTabularBuffer) {
          return {
            ...node,
            data: {
              ...node.data,
              fileName: previousTabularNode.data.fileName,
              hasHeader: previousTabularNode.data.hasHeader !== false,
              hasHeaderManuallySet: previousTabularNode.data.hasHeaderManuallySet === true,
              transpose: previousTabularNode.data.transpose === true,
              transposeManuallySet: previousTabularNode.data.transposeManuallySet === true,
              convertDataToRdf: shouldConvertToRdf,
              rowCount: previousTabularNode.data.rowCount,
              parameterRowCount: previousTabularNode.data.parameterRowCount,
              layoutNote: previousTabularNode.data.layoutNote,
              sheetName: previousTabularNode.data.sheetName,
              rdfConversionState: shouldConvertToRdf ? 'queued' : '',
            },
          };
        }

        if (node.id === 'template-columns' && previousColumnNode) {
          return {
            ...node,
            data: {
              ...node.data,
              fields: previousColumnNode.data.fields,
              serializedRdf: previousColumnRdf,
            },
          };
        }

        if (node.id === 'template-metadata-form') {
          return {
            ...node,
            data: {
              ...node.data,
              ...(previousMetadataRdfNode
                ? {
                    carriedValuesRdf: previousMetadataRdfNode.data.serializedRdf,
                    serializedRdf: previousMetadataRdfNode.data.serializedRdf,
                  }
                : {}),
              ...(previousProfileFormNode
                ? {
                    shapes: previousProfileFormNode.data.shapes,
                    shapesKey: previousProfileFormNode.data.shapesKey,
                    profileName: previousProfileFormNode.data.profileName,
                    profileBaseUri: previousProfileFormNode.data.profileBaseUri,
                    shapesSource: 'aims',
                  }
                : {}),
            },
          };
        }

        if (node.id === 'template-coscine' && previousCoscineProfile) {
          return {
            ...node,
            data: {
              ...node.data,
              coscineApplicationProfile: previousCoscineProfile,
              preselectedResourceKey: `${previousCoscineProfile.projectId}:${previousCoscineProfile.resourceId}`,
            },
          };
        }

        if (node.id === 'template-quantity-kinds' && previousQuantityKindNode) {
          return {
            ...node,
            data: {
              ...node.data,
              selectedQuantityKind: previousQuantityKindNode.data.selectedQuantityKind,
            },
          };
        }

        return node;
      });
      const nextNodes = deriveNodeData(
        templateNodesWithCarryOver,
        template.edges,
        tabularMemoryRef.current,
      );

>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
      nodeIdCountRef.current = nextNodes.length;
      nodeTypeCountsRef.current = buildNodeTypeCounts(nextNodes);
      nodesRef.current = nextNodes;
      edgesRef.current = template.edges;
      setNodes(nextNodes);
      setEdges(template.edges);
      setConnectionNotice(null);
      setCheckedStepKeys(new Set());
      setFitRequest((current) => ({
        id: current.id + 1,
        nodeIds: nextNodes.map((node) => node.id),
      }));

      if (shouldConvertToRdf && previousTabularPreview) {
        startTabularRdfConversion('template-tabular', previousTabularPreview.sheets);
      }
    },
    [
      globalLanguage,
      setEdges,
      setNodes,
      startTabularRdfConversion,
    ],
  );

  return (
    <div className="app-shell">
<<<<<<< HEAD
      <header className="app-header">
        <div className="app-header__top">
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
        </div>
      </header>
      <aside className="sidebar">
        <h1 className="sidebar-title">{text.sidebarHeading}</h1>
=======
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
      {connectionNotice ? (
        <div className="connection-notice" role="status" aria-live="polite">
          <span className="connection-notice__icon" aria-hidden="true">!</span>
          <p>{connectionNotice.message}</p>
          <button
            type="button"
            className="connection-notice__dismiss"
            onClick={() => setConnectionNotice(null)}
            aria-label="Dismiss connection notice"
          >
            ×
          </button>
        </div>
      ) : null}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img className="app-logo" src={rwthCaadLogo} alt="RWTH CAAD" />
          <p className="eyebrow">{text.sidebarHeading}</p>
        </div>
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
        <section className="workflow-templates" aria-labelledby="workflow-templates-heading">
          <h2 id="workflow-templates-heading">{text.templatesHeading}</h2>
          <p className="workflow-templates__intro">{text.templatesIntro}</p>
          <button
            type="button"
            className="workflow-template-card"
            title={text.coscineTemplateDescription}
            onClick={() => applyWorkflowTemplate('coscine')}
          >
            <span className="workflow-template-card__logos" aria-hidden="true">
              <img src={roCrateLogo} alt="" />
              <span>→</span>
              <img src={coscineLogo} alt="" />
            </span>
            <span className="workflow-template-card__title">{text.coscineTemplate}</span>
          </button>
          <button
            type="button"
            className="workflow-template-card"
            title={text.roCrateTemplateDescription}
            onClick={() => applyWorkflowTemplate('ro-crate')}
          >
            <span className="workflow-template-card__logos" aria-hidden="true">
              <img src={aimsIcon} alt="" />
              <span>→</span>
              <img src={roCrateLogo} alt="" />
            </span>
            <span className="workflow-template-card__title">{text.roCrateTemplate}</span>
          </button>
        </section>
<<<<<<< HEAD
        <section className="node-exchange" aria-label={text.workflowSharingLabel}>
          <div className="node-exchange__buttons">
            <button
              type="button"
              className="node-exchange__button"
              onClick={handleExportWorkflow}
              title={text.exportPrivacyNote}
            >
              {text.exportWorkflow}
            </button>
            <button
              type="button"
              className="node-exchange__button"
              onClick={() => importInputRef.current?.click()}
            >
              {text.importFile}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleImportFile}
            />
          </div>
        </section>
        <div className="sidebar-node-scroll">
          <section className="nodes-section" aria-labelledby="nodes-heading">
            <h2 id="nodes-heading">{text.nodesHeading}</h2>
            <div className="node-palette">
              {nodeTemplates.map((template) => (
                <button
                  key={template.type}
                  type="button"
                  draggable
                  className="drag-button drag-button--with-icon"
                  onDragStart={(event) => onDragStart(event, template)}
                  onClick={() => addTemplateAtCanvasCenter(template)}
                >
                  <span className="drag-button__content">
                    <img src={template.icon} alt="" className="drag-button__icon" />
                    <span>{text.addNodeLabel(template.label)}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
=======
        <p className="intro">{text.sidebarIntro}</p>
        <div className="sidebar-node-scroll">
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
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
        </div>
        <div className="sidebar-footer">
          <img className="sidebar-footer__logo" src={nfdi4ingLogo} alt="NFDI4Ing" />
        </div>
      </aside>

      <main className="canvas" ref={canvasRef} onDrop={onDrop} onDragOver={onDragOver}>
<<<<<<< HEAD
        {connectionNotice ? (
          <div className="connection-notice" role="status" aria-live="polite">
            <span className="connection-notice__icon" aria-hidden="true">!</span>
            <p>{connectionNotice.message}</p>
            <button
              type="button"
              className="connection-notice__dismiss"
              onClick={() => setConnectionNotice(null)}
              aria-label="Dismiss connection notice"
            >
              ×
            </button>
          </div>
        ) : null}
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
        <nav
          ref={checklistRef}
          className={`workflow-checklist${checklistFits ? '' : ' workflow-checklist--hidden'}`}
          aria-label={text.checklist.heading}
          aria-hidden={!checklistFits}
          inert={checklistFits ? undefined : ''}
        >
          <span className="workflow-checklist__heading">{text.checklist.heading}</span>
          <ol className="workflow-checklist__steps">
            {workflowSteps.map((step, index) => (
              <li key={step.key}>
                <button
                  type="button"
                  className={`workflow-checklist__step workflow-checklist__step--${step.status}`}
                  onClick={() => handleStepClick(step)}
                  disabled={!step.focusNodeId}
                  aria-current={step.status === 'current' ? 'step' : undefined}
                  aria-pressed={step.done ? true : undefined}
                  title={step.detail}
                >
                  <span className="workflow-checklist__step-index">{index + 1}</span>
                  <span className="workflow-checklist__step-text">
                    <span className="workflow-checklist__step-label">{step.label}</span>
                    <span className="workflow-checklist__step-detail">{step.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          minZoom={0.1}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={onNodesDelete}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onInit={setReactFlowInstance}
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <FitWorkflowView request={fitRequest} />
          <Controls />
          <Background gap={16} size={1} />
        </ReactFlow>
      </main>
    </div>
  );
}
