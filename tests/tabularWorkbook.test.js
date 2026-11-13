import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import { parseTabularWorkbook } from '../src/services/tabularWorkbook.js';

function workbookBuffer(sheets) {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

test('associates a header cell comment only with its column', () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([['Force', 'Time'], [12, 3], [14, 4]]);
  sheet.A1.c = [{ a: 'Researcher', t: 'Actuator force [kN]' }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Experiment');
  const parsed = parseTabularWorkbook(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  assert.deepEqual(parsed.columnNotes, ['Actuator force [kN]', '']);
});

test('automatically rotates parameter rows and honors a manual override', () => {
  const buffer = workbookBuffer({ Data: [
    ['Temperature', 20, 21],
    ['Pressure', 101, 102],
    ['Humidity', 45, 47],
  ] });

  const inferred = parseTabularWorkbook(buffer);
  assert.equal(inferred.transpose, true);
  assert.deepEqual(inferred.headers, ['Temperature', 'Pressure', 'Humidity']);
  assert.deepEqual(inferred.rows[0], ['20', '101', '45']);

  const overridden = parseTabularWorkbook(buffer, 5, false, false);
  assert.equal(overridden.transpose, false);
  assert.equal(overridden.hasHeader, false);
  assert.deepEqual(overridden.rows[0], ['Temperature', '20', '21']);
});

test('separates measurement settings from numeric data and preserves them for export', () => {
  const buffer = workbookBuffer({ Data: [
    ['Version', '1'],
    ['Name', 'A1'],
    ['Unit', '%'],
    ['Samples', '8'],
    [1, 2, 3, 4, 5, 6, 7, 8],
    [9, 10, 11, 12, 13, 14, 15, 16],
    [17, 18, 19, 20, 21, 22, 23, 24],
  ] });

  const parsed = parseTabularWorkbook(buffer);
  assert.equal(parsed.rowCount, 3);
  assert.equal(parsed.hasHeader, false);
  assert.deepEqual(parsed.rows[0], ['1', '2', '3', '4', '5', '6', '7', '8']);
  assert.deepEqual(parsed.sheets[1], {
    name: 'Data_parameters',
    headers: ['Parameter', 'Value'],
    rows: [
      { Parameter: 'Version', Value: '1' },
      { Parameter: 'Name', Value: 'A1' },
      { Parameter: 'Unit', Value: '%' },
      { Parameter: 'Samples', Value: '8' },
    ],
  });
});

test('uses a measurement sheet after a report and names columns from layered headers', () => {
  const buffer = workbookBuffer({
    Report: [['Instrument'], ['Project', 'Test'], ['Notes', 'A']],
    Measurements: [
      ['Cell Type', '', '', 'Co', 'Co', 'Co', 'Co', 'Co'],
      ['well', '', '', 'C10', 'B10', 'C9', 'B9', 'G4'],
      ['Date', 'Time', 'Elapsed', '', '', '', '', ''],
      ['2024-06-27', 0, 0, 181, 174, 187, 190, 195],
      ['2024-06-27', 15, 0.25, 183, 181, 194, 188, 197],
      ['2024-06-27', 30, 0.5, 190, 185, 200, 194, 199],
      ['2024-06-27', 45, 0.75, 193, 187, 202, 197, 201],
      ['2024-06-27', 60, 1, 195, 190, 205, 199, 204],
      ['2024-06-27', 75, 1.25, 197, 192, 207, 201, 206],
      ['2024-06-27', 90, 1.5, 199, 194, 209, 203, 208],
    ],
  });

  const parsed = parseTabularWorkbook(buffer);
  assert.equal(parsed.sheetName, 'Measurements');
  assert.equal(parsed.hasHeader, true);
  assert.deepEqual(parsed.headers.slice(0, 5), ['Date', 'Time', 'Elapsed', 'well C10', 'well B10']);
  assert.equal(parsed.rowCount, 7);
  assert.ok(parsed.sheets.some(
    (sheet) =>
      sheet.name === 'Measurements_header_details' && sheet.exportGroup === 'extras',
  ));
});
