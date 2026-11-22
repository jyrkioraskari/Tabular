import * as XLSX from 'xlsx';
import { ROCrate } from 'ro-crate';
import JSZip from 'jszip';

const DEFAULT_CRATE_NAME = 'Research dataset';
const DEFAULT_CRATE_DESCRIPTION = 'Research dataset packaged as an RO-Crate.';
const DEFAULT_LICENSE_ID = 'https://creativecommons.org/licenses/by/4.0/';
export const UNSPECIFIED_DATASET_LICENSE = 'unspecified';
const RO_CRATE_VERSION = '1.3';
const RO_CRATE_SPEC_ID = `https://w3id.org/ro/crate/${RO_CRATE_VERSION}`;
const RO_CRATE_CONTEXT_ID = `${RO_CRATE_SPEC_ID}/context`;
const CSVW_CONTEXT_ID = 'http://www.w3.org/ns/csvw';
const CSVW_SPEC_ID = 'http://www.w3.org/TR/tabular-metadata/';
const CSVW_UNIT_MEASURE_PROPERTY =
  'http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure';
const QUDT_UNIT_PREFIX = 'http://qudt.org/vocab/unit/';

const EXCEL_MIME_TYPES = {
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  xlsb: 'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
};

function normalize(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function resolveLicenseId(licenseName) {
  if (/^https?:\/\//i.test(licenseName)) {
    return licenseName;
  }

  if (/^(cc[- ]?by[- ]?4(?:\.0)?|creative commons attribution 4\.0 international)$/i.test(licenseName)) {
    return DEFAULT_LICENSE_ID;
  }

  return '#license';
}

function serializeROCrateMetadata(crate) {
  const metadata = crate.toJSON();
  const localContext = { '@vocab': 'http://schema.org/' };

  metadata['@context'] = [RO_CRATE_CONTEXT_ID, localContext];

  const descriptor = metadata['@graph'].find(
    (entity) => entity['@id'] === 'ro-crate-metadata.json',
  );
  if (!descriptor) {
    throw new Error('RO-Crate metadata descriptor was not generated.');
  }

  descriptor.conformsTo = { '@id': RO_CRATE_SPEC_ID };
  return metadata;
}

export function slugifyCrateValue(value) {
  const slug = String(value ?? '')
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'dataset';
}

function csvwColumnName(value, index, usedNames) {
  const baseName = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '') || `column_${index + 1}`;
  const safeBaseName = /^[a-z_]/.test(baseName) ? baseName : `column_${baseName}`;
  let name = safeBaseName;
  let suffix = 2;

  while (usedNames.has(name)) {
    name = `${safeBaseName}_${suffix}`;
    suffix += 1;
  }

  usedNames.add(name);
  return name;
}

function sheetHeaders(sheet) {
  if (Array.isArray(sheet?.headers) && sheet.headers.length > 0) {
    return sheet.headers.map((header) => String(header));
  }

  const headers = [];
  const seen = new Set();
  for (const row of sheet?.rows ?? []) {
    for (const header of Object.keys(row ?? {})) {
      if (!seen.has(header)) {
        seen.add(header);
        headers.push(header);
      }
    }
  }
  return headers;
}

function csvwUnitIri(field) {
  const candidate = String(field?.unitUri || field?.unit || '').trim();
  if (/^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(candidate)) return candidate;

  const compactQudtUnit = candidate.match(/^qudtunit:([A-Za-z][A-Za-z0-9_-]*)$/);
  return compactQudtUnit ? `${QUDT_UNIT_PREFIX}${compactQudtUnit[1]}` : '';
}

function originalExcelPayload(sourceFile) {
  const originalName = String(sourceFile?.fileName ?? '').split(/[\\/]/).pop();
  const extension = originalName?.match(/\.([^.]+)$/)?.[1]?.toLocaleLowerCase();

  if (!originalName || !EXCEL_MIME_TYPES[extension] || sourceFile?.content == null) {
    return null;
  }

  const safeName = originalName.replace(/[\u0000-\u001f\u007f]/g, '_');
  return {
    fileName: `original_data/source/${safeName}`,
    content: sourceFile.content,
    mimeType: EXCEL_MIME_TYPES[extension],
  };
}

/**
 * Creates the standard JSON metadata document discovered next to a CSV as
 * `<csv-name>-metadata.json`. Columns are matched by position; `titles` keeps
 * the exact CSV header while `name` supplies a safe, unique template variable.
 */
export function createCsvwMetadata({
  csvFileName,
  sheet,
  columnDescriptions = [],
} = {}) {
  const headers = sheetHeaders(sheet);
  const normalizedColumnDescriptions = Array.isArray(columnDescriptions)
    ? columnDescriptions
    : [];
  const descriptionsByHeader = new Map(
    normalizedColumnDescriptions.map((field) => [
      String(field?.header ?? ''),
      field,
    ]),
  );
  const usedNames = new Set();
  const columns = headers.map((header, index) => {
    const indexedField = normalizedColumnDescriptions[index];
    const field = indexedField?.header === header
      ? indexedField
      : descriptionsByHeader.get(header) ?? indexedField ?? {};
    const description = String(field.description ?? '').trim();
    const propertyUrl = String(field.descriptionUri ?? '').trim();
    const unitIri = csvwUnitIri(field);
    const column = {
      name: csvwColumnName(header, index, usedNames),
      titles: header,
      datatype: 'string',
    };

    if (description) column['dc:description'] = description;
    if (/^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(propertyUrl)) {
      column.propertyUrl = propertyUrl;
    }
    if (unitIri) {
      column[CSVW_UNIT_MEASURE_PROPERTY] = { '@id': unitIri };
    }
    return column;
  });

  return {
    '@context': CSVW_CONTEXT_ID,
    '@type': 'Table',
    url: String(csvFileName).split('/').pop(),
    'dc:title': String(sheet?.name ?? '').trim() || 'Tabular data',
    tableSchema: { columns },
  };
}

/**
 * Reads an optional export_config sheet. The parser accepts common two-column
 * key/value layouts and normalizes keys to snake_case for template lookups.
 */
export function parseROCrateConfig(rows = []) {
  return rows.reduce((config, row) => {
    const entries = Object.entries(row);
    const keyEntry =
      entries.find(([key]) => normalize(key) === 'key') ??
      entries.find(([key]) => normalize(key) === 'name') ??
      entries.find(([key]) => normalize(key) === 'field') ??
      entries[0];
    const valueEntry =
      entries.find(([key]) => normalize(key) === 'value') ??
      entries.find(([key]) => normalize(key) === 'content') ??
      entries[1];
    const key = normalize(keyEntry?.[1] ?? keyEntry?.[0]).replace(/[\s-]+/g, '_');

    if (key) {
      config[key] = valueEntry?.[1] ?? '';
    }

    return config;
  }, {});
}

export function configuredDatasetLicense(sheets = []) {
  const configSheet = (Array.isArray(sheets) ? sheets : [])
    .find((sheet) => normalize(sheet?.name) === 'export_config');
  return String(parseROCrateConfig(configSheet?.rows ?? []).license ?? '').trim();
}

/**
 * Builds a browser-downloadable RO-Crate ZIP. Each payload file is added both
 * to the ZIP and to ro-crate-metadata.json as a File entity.
 */
export async function createROCrateZip(options = {}) {
  const {
    files = [],
    crateName = DEFAULT_CRATE_NAME,
    description = DEFAULT_CRATE_DESCRIPTION,
    datasetLicense,
  } = options;

  const crate = new ROCrate();

  const normalizedCrateName = String(crateName ?? '').trim() || DEFAULT_CRATE_NAME;
  const normalizedDescription =
    String(description ?? '').trim() || DEFAULT_CRATE_DESCRIPTION;
  const normalizedLicense = String(datasetLicense ?? '').trim();
  if (!normalizedLicense) {
    throw new Error('Choose a dataset licence before creating the RO-Crate.');
  }

  crate.rootDataset.name = normalizedCrateName;
  crate.rootDataset.description = normalizedDescription;
  crate.rootDataset.datePublished = new Date().toISOString().split('T')[0];

  if (normalizedLicense !== UNSPECIFIED_DATASET_LICENSE) {
    const licenseId = resolveLicenseId(normalizedLicense);
    crate.addEntity({
      '@id': licenseId,
      '@type': 'CreativeWork',
      name: normalizedLicense,
      description: `${normalizedLicense} license.`,
    });
    crate.rootDataset.license = { '@id': licenseId };
  }

  const zip = new JSZip();
  const fileRefs = [];

  for (const f of files) {
    crate.addEntity({
      '@id': f.fileName,
      '@type': 'File',
      name: f.fileName,
      encodingFormat: f.mimeType ?? 'application/octet-stream',
      contentSize: String(new Blob([f.content]).size),
      ...(f.roCrateMetadata ?? {}),
    });

    fileRefs.push({ '@id': f.fileName });
    zip.file(f.fileName, f.content);
  }

  if (fileRefs.length > 0) {
    crate.rootDataset.hasPart = fileRefs;
  }

  if (files.some((file) => file.mimeType === 'application/csvm+json')) {
    crate.addEntity({
      '@id': CSVW_SPEC_ID,
      '@type': 'CreativeWork',
      name: 'W3C Metadata Vocabulary for Tabular Data',
    });
  }

  const metadata = serializeROCrateMetadata(crate);
  zip.file('ro-crate-metadata.json', `${JSON.stringify(metadata, null, 2)}\n`);

  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

export async function createROCratePackage({
  jsonLdContent,
  sheets = [],
  columnDescriptions = [],
  sourceFile = null,
  selectedSheetName = '',
  datasetLicense = '',
} = {}) {
  if (!jsonLdContent?.jsonLd) {
    throw new Error('Connect RDF content to build an RO-Crate first.');
  }

  const sheetMap = new Map();
  for (const sheet of sheets) sheetMap.set(normalize(sheet.name), sheet);
  const configRows = sheetMap.get('export_config')?.rows ?? [];
  const config = parseROCrateConfig(configRows);

  const datasetId = slugifyCrateValue(
    config.dataset_id || config.dataset_name || 'dataset',
  );
  const datasetTitle =
    config.dataset_title || config.dataset_label || config.title || datasetId;
  const datasetDescription =
    config.dataset_description || config.description || DEFAULT_CRATE_DESCRIPTION;
  const resolvedLicense = String(config.license || datasetLicense).trim();
  if (!resolvedLicense) {
    throw new Error('Choose a dataset licence before creating the RO-Crate.');
  }
  const excelPayload = originalExcelPayload(sourceFile);
  const usedFileNames = new Set();
  const sheetFiles = sheets.flatMap((sheet, index) => {
    const headers = sheetHeaders(sheet);
    const columnKeys = Array.isArray(sheet.columnKeys) && sheet.columnKeys.length === headers.length
      ? sheet.columnKeys
      : headers;
    const worksheet = XLSX.utils.aoa_to_sheet([
      headers,
      ...sheet.rows.map((row) => columnKeys.map((key) => row[key] ?? '')),
    ]);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const baseSlug = slugifyCrateValue(sheet.name || `sheet_${index + 1}`);
    let slug = baseSlug;
    let suffix = 2;
    while (usedFileNames.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    usedFileNames.add(slug);

    const exportDirectory = sheet.exportGroup === 'extras'
      ? 'original_data/extras'
      : 'original_data';
    const csvFileName = `${exportDirectory}/${slug}.csv`;

    if (sheet.exportGroup === 'extras') {
      return [{
        fileName: csvFileName,
        content: csvContent,
        mimeType: 'text/csv',
        roCrateMetadata: {
          ...(excelPayload ? { isBasedOn: { '@id': excelPayload.fileName } } : {}),
        },
      }];
    }

    const csvwFileName = `${csvFileName}-metadata.json`;
    const csvwMetadata = createCsvwMetadata({
      csvFileName,
      sheet: { ...sheet, headers },
      columnDescriptions: sheet.name === (selectedSheetName || sheets[0]?.name)
        ? columnDescriptions
        : [],
    });

    return [{
      fileName: csvFileName,
      content: csvContent,
      mimeType: 'text/csv',
      roCrateMetadata: {
        subjectOf: { '@id': csvwFileName },
        ...(excelPayload ? { isBasedOn: { '@id': excelPayload.fileName } } : {}),
      },
    }, {
      fileName: csvwFileName,
      content: `${JSON.stringify(csvwMetadata, null, 2)}\n`,
      mimeType: 'application/csvm+json',
      roCrateMetadata: {
        about: { '@id': csvFileName },
        conformsTo: { '@id': CSVW_SPEC_ID },
      },
    }];
  });

  const blob = await createROCrateZip({
    files: [
      {
        fileName: 'metadata.ttl',
        content: jsonLdContent.jsonLd,
        mimeType: 'text/turtle',
      },
      ...(excelPayload ? [excelPayload] : []),
      ...sheetFiles,
    ],
    crateName: datasetTitle,
    description: datasetDescription,
    datasetLicense: resolvedLicense,
  });

  return {
    blob,
    fileName: `${datasetId}.zip`,
  };
}
