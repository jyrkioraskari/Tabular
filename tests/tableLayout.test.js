import assert from 'node:assert/strict';
import test from 'node:test';
import {
  looksLikeHeaderRow,
  measurementPreambleLength,
  shouldTransposeTable,
} from '../src/services/tableLayout.js';

test('keeps an ordinary table with column headers upright', () => {
  const rows = [
    ['Parameter', 'Sample A', 'Sample B'],
    ['Temperature', '20', '21'],
    ['Pressure', '101', '102'],
  ];

  assert.equal(shouldTransposeTable(rows), false);
  assert.equal(looksLikeHeaderRow(rows), true);
});

test('rotates parameter rows with measurements across the page', () => {
  const rows = [
    ['Temperature', '20', '21'],
    ['Pressure', '101', '102'],
    ['Humidity', '45', '47'],
  ];

  assert.equal(shouldTransposeTable(rows), true);
});

test('recognizes decimal commas in sideways measurements', () => {
  const rows = [
    ['Temperature', '20,1', '21,2'],
    ['Pressure', '101,3', '102,4'],
    ['Humidity', '45,5', '47,6'],
  ];

  assert.equal(shouldTransposeTable(rows), true);
});

test('keeps a parameter heading upright even when sample names are numeric', () => {
  const rows = [
    ['Parameter', '1', '2'],
    ['Temperature', '20', '21'],
    ['Pressure', '101', '102'],
  ];

  assert.equal(shouldTransposeTable(rows), false);
  assert.equal(looksLikeHeaderRow(rows), true);
});

test('recognizes a sparse measurement header without rotating', () => {
  const rows = [
    ['Temperature', '', ''],
    ['20', '21', '22'],
    ['23', '24', '25'],
  ];

  assert.equal(shouldTransposeTable(rows), false);
  assert.equal(looksLikeHeaderRow(rows), true);
});

test('leaves a numeric table without headers alone', () => {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  assert.equal(shouldTransposeTable(rows), false);
  assert.equal(looksLikeHeaderRow(rows), false);
});

test('accepts a header row with one blank leading cell', () => {
  const rows = [
    ['', 'id', 'score', 'group', 'age', 'weight', 'height', 'date', 'status', 'notes'],
    ['1', '5', '8', 'A', '20', '70', '175', '2024-01-01', 'ok', ''],
    ['2', '6', '9', 'B', '21', '71', '176', '2024-01-02', 'ok', ''],
  ];

  assert.equal(looksLikeHeaderRow(rows), true);
});

test('separates a measurement settings preamble from a wide numeric matrix', () => {
  const rows = [
    ['Version', '1'],
    ['Name', 'A1'],
    ['Unit', '%'],
    ['Samples', '8'],
    ['1', '2', '3', '4', '5', '6', '7', '8'],
    ['9', '10', '11', '12', '13', '14', '15', '16'],
    ['17', '18', '19', '20', '21', '22', '23', '24'],
  ];

  assert.equal(measurementPreambleLength(rows), 4);
  assert.equal(shouldTransposeTable(rows.slice(4)), false);
});
