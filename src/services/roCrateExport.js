import * as XLSX from 'xlsx';
import { ROCrate } from 'ro-crate';
import JSZip from 'jszip';

const DEFAULT_CRATE_NAME = 'Research dataset';
const DEFAULT_CRATE_DESCRIPTION = 'Research dataset packaged as an RO-Crate.';
const DEFAULT_LICENSE_NAME = 'Creative Commons Attribution 4.0 International';
const DEFAULT_LICENSE_ID = 'https://creativecommons.org/licenses/by/4.0/';
const RO_CRATE_VERSION = '1.3';
const RO_CRATE_SPEC_ID = `https://w3id.org/ro/crate/${RO_CRATE_VERSION}`;
const RO_CRATE_CONTEXT_ID = `${RO_CRATE_SPEC_ID}/context`;

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

/**
 * Builds a browser-downloadable RO-Crate ZIP. Each payload file is added both
 * to the ZIP and to ro-crate-metadata.json as a File entity.
 */
export async function createROCrateZip(options = {}) {
  const {
    files = [],
    crateName = DEFAULT_CRATE_NAME,
    description = DEFAULT_CRATE_DESCRIPTION,
    datasetLicense = DEFAULT_LICENSE_NAME,
  } = options;

  const crate = new ROCrate();

  const normalizedCrateName = String(crateName ?? '').trim() || DEFAULT_CRATE_NAME;
  const normalizedDescription =
    String(description ?? '').trim() || DEFAULT_CRATE_DESCRIPTION;
  const normalizedLicense =
    String(datasetLicense ?? '').trim() || DEFAULT_LICENSE_NAME;
  const licenseId = resolveLicenseId(normalizedLicense);

  crate.rootDataset.name = normalizedCrateName;
  crate.rootDataset.description = normalizedDescription;
  crate.rootDataset.datePublished = new Date().toISOString().split('T')[0];

  const license = {
    '@id': licenseId,
    '@type': 'CreativeWork',
    name: normalizedLicense,
    description: `${normalizedLicense} license.`,
  };
  crate.addEntity(license);
  crate.rootDataset.license = { '@id': licenseId };

  const zip = new JSZip();
  const fileRefs = [];

  for (const f of files) {
    crate.addEntity({
      '@id': f.fileName,
      '@type': 'File',
      name: f.fileName,
      encodingFormat: f.mimeType ?? 'application/octet-stream',
      contentSize: String(new Blob([f.content]).size),
    });

    fileRefs.push({ '@id': f.fileName });
    zip.file(f.fileName, f.content);
  }

  if (fileRefs.length > 0) {
    crate.rootDataset.hasPart = fileRefs;
  }

  const metadata = serializeROCrateMetadata(crate);
  zip.file('ro-crate-metadata.json', `${JSON.stringify(metadata, null, 2)}\n`);

  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

export async function createROCratePackage({ jsonLdContent, sheets = [] } = {}) {
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
  const datasetLicense = config.license || DEFAULT_LICENSE_NAME;
  const sheetCsvFiles = sheets.map((sheet, index) => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    return {
      fileName: `original_data/${slugifyCrateValue(sheet.name || `sheet_${index + 1}`)}.csv`,
      content: csvContent,
      mimeType: 'text/csv',
    };
  });

  const blob = await createROCrateZip({
    files: [
      {
        fileName: 'metadata.ttl',
        content: jsonLdContent.jsonLd,
        mimeType: 'text/turtle',
      },
      ...sheetCsvFiles,
    ],
    crateName: datasetTitle,
    description: datasetDescription,
    datasetLicense,
  });

  return {
    blob,
    fileName: `${datasetId}.zip`,
  };
}
