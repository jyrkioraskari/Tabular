import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import {
  createCsvwMetadata,
  createROCratePackage,
} from '../src/services/roCrateExport.js';

test('creates valid-shaped CSVW metadata with stable unique column names', () => {
  const metadata = createCsvwMetadata({
    csvFileName: 'original_data/readings.csv',
    sheet: {
      name: 'Readings',
      rows: [{ 'Sensor value': '12', 'Sensor-value': '13', '3D axis': 'x' }],
    },
    columnDescriptions: [{
      header: 'Sensor value',
      description: 'Observed temperature',
      descriptionUri: 'https://example.org/temperature',
      unit: 'Degree Celsius',
      unitUri: 'http://qudt.org/vocab/unit/DEG_C',
    }],
  });

  assert.equal(metadata['@context'], 'http://www.w3.org/ns/csvw');
  assert.equal(metadata['@type'], 'Table');
  assert.equal(metadata.url, 'readings.csv');
  assert.deepEqual(
    metadata.tableSchema.columns.map((column) => column.name),
    ['sensor_value', 'sensor_value_2', 'column_3d_axis'],
  );
  assert.equal(metadata.tableSchema.columns[0].titles, 'Sensor value');
  assert.equal(metadata.tableSchema.columns[0].datatype, 'string');
  assert.equal(metadata.tableSchema.columns[0]['dc:description'], 'Observed temperature');
  assert.equal(metadata.tableSchema.columns[0].propertyUrl, 'https://example.org/temperature');
  assert.deepEqual(
    metadata.tableSchema.columns[0][
      'http://purl.org/linked-data/sdmx/2009/attribute#unitMeasure'
    ],
    { '@id': 'http://qudt.org/vocab/unit/DEG_C' },
  );
});

<<<<<<< HEAD
test('accepted E_mod identifier exports alongside unchanged measurement values', async () => {
  const sheet = { name: 'Measurements', headers: ['E_mod'], rows: [{ E_mod: '210' }, { E_mod: '205' }] };
  const identifier = 'https://example.org/materials/young-modulus';
  const { blob } = await createROCratePackage({
    jsonLdContent: { jsonLd: '@prefix ex: <https://example.org/> .\nex:s ex:p ex:o .\n' },
    datasetLicense: 'CC BY 4.0',
    sheets: [sheet],
    columnDescriptions: [{
      header: 'E_mod', description: 'Young modulus of steel', unit: 'GPa',
      descriptionUri: identifier,
    }],
  });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const csvw = JSON.parse(await zip.file('original_data/measurements.csv-metadata.json').async('string'));
  const csv = await zip.file('original_data/measurements.csv').async('string');
  assert.equal(csvw.tableSchema.columns[0].propertyUrl, identifier);
  assert.match(csv, /210/);
  assert.match(csv, /205/);
});

=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
test('packages discoverable CSVW metadata and links it from RO-Crate', async () => {
  const { blob } = await createROCratePackage({
    jsonLdContent: { jsonLd: '@prefix ex: <https://example.org/> .\nex:s ex:p ex:o .\n' },
    sourceFile: {
      fileName: '../Experiment 01.xlsx',
      content: new Uint8Array([80, 75, 3, 4]),
    },
    sheets: [
      {
        name: 'Measurements',
        headers: ['Time', 'Value'],
        rows: [{ Time: '0', Value: '42' }],
      },
      {
        name: 'Measurements!',
        headers: ['Note'],
        rows: [],
      },
      {
        name: 'Measurements_header_details',
        exportGroup: 'extras',
        headers: ['Row', 'Column', 'Value'],
        rows: [{ Row: '1', Column: 'Value', Value: 'Sensor A' }],
      },
    ],
    columnDescriptions: [{ header: 'Time', description: 'Elapsed time' }],
<<<<<<< HEAD
    datasetLicense: 'CC BY 4.0',
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
  });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const csvwPath = 'original_data/measurements.csv-metadata.json';

  assert.ok(zip.file('original_data/measurements.csv'));
  assert.ok(zip.file(csvwPath));
  assert.ok(zip.file('original_data/measurements-2.csv'));
  assert.ok(zip.file('original_data/measurements-2.csv-metadata.json'));
  assert.ok(zip.file('original_data/extras/measurements-header-details.csv'));
  assert.equal(
    zip.file('original_data/extras/measurements-header-details.csv-metadata.json'),
    null,
  );
  assert.equal(zip.file('extras/measurements-header-details.csv'), null);
  assert.equal(zip.file('original_data/measurements-header-details.csv'), null);
  assert.ok(zip.file('original_data/source/Experiment 01.xlsx'));
  assert.deepEqual(
    [...await zip.file('original_data/source/Experiment 01.xlsx').async('uint8array')],
    [80, 75, 3, 4],
  );

  const csvw = JSON.parse(await zip.file(csvwPath).async('string'));
  assert.equal(csvw.url, 'measurements.csv');
  assert.deepEqual(csvw.tableSchema.columns.map((column) => column.titles), ['Time', 'Value']);

  const crate = JSON.parse(await zip.file('ro-crate-metadata.json').async('string'));
  const csvEntity = crate['@graph'].find(
    (entity) => entity['@id'] === 'original_data/measurements.csv',
  );
  const csvwEntity = crate['@graph'].find((entity) => entity['@id'] === csvwPath);
  assert.deepEqual(csvEntity.subjectOf, { '@id': csvwPath });
  assert.deepEqual(csvEntity.isBasedOn, {
    '@id': 'original_data/source/Experiment 01.xlsx',
  });
  assert.equal(csvwEntity.encodingFormat, 'application/csvm+json');
  assert.deepEqual(csvwEntity.about, { '@id': 'original_data/measurements.csv' });
  assert.deepEqual(csvwEntity.conformsTo, {
    '@id': 'http://www.w3.org/TR/tabular-metadata/',
  });
  assert.ok(crate['@graph'].some(
    (entity) => entity['@id'] === 'http://www.w3.org/TR/tabular-metadata/',
  ));
  const sourceEntity = crate['@graph'].find(
    (entity) => entity['@id'] === 'original_data/source/Experiment 01.xlsx',
  );
  assert.equal(
    sourceEntity.encodingFormat,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
});
<<<<<<< HEAD

test('exports duplicate headers and annotates the selected sheet by position', async () => {
  const { blob } = await createROCratePackage({
    jsonLdContent: { jsonLd: '@prefix ex: <https://example.org/> .\nex:s ex:p ex:o .\n' },
    sheets: [
      { name: 'Report', headers: ['Note'], columnKeys: ['Note'], rows: [{ Note: 'Summary' }] },
      {
        name: 'Data', headers: ['A', 'A'], columnKeys: ['A', 'A_2'],
        rows: [{ A: 'left', A_2: 'right' }],
      },
    ],
    selectedSheetName: 'Data',
    columnDescriptions: [
      { header: 'A', description: 'First measurement' },
      { header: 'A', description: 'Second measurement' },
    ],
    datasetLicense: 'unspecified',
  });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.equal(await zip.file('original_data/data.csv').async('string'), 'A,A\nleft,right');
  const dataMetadata = JSON.parse(await zip.file('original_data/data.csv-metadata.json').async('string'));
  assert.deepEqual(dataMetadata.tableSchema.columns.map((column) => column['dc:description']),
    ['First measurement', 'Second measurement']);
  const reportMetadata = JSON.parse(await zip.file('original_data/report.csv-metadata.json').async('string'));
  assert.equal(reportMetadata.tableSchema.columns[0]['dc:description'], undefined);
  const crate = JSON.parse(await zip.file('ro-crate-metadata.json').async('string'));
  assert.equal(crate['@graph'].find((entity) => entity['@id'] === './').license, undefined);
});

test('requires a deliberate licence choice when export_config has none', async () => {
  const input = {
    jsonLdContent: { jsonLd: '@prefix ex: <https://example.org/> .\nex:s ex:p ex:o .\n' },
    sheets: [{ name: 'Data', headers: ['A'], rows: [{ A: '1' }] }],
  };
  await assert.rejects(createROCratePackage(input), /Choose a dataset licence/);
  const { blob } = await createROCratePackage({ ...input, datasetLicense: 'CC BY 4.0' });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const crate = JSON.parse(await zip.file('ro-crate-metadata.json').async('string'));
  assert.deepEqual(crate['@graph'].find((entity) => entity['@id'] === './').license,
    { '@id': 'https://creativecommons.org/licenses/by/4.0/' });
});
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
