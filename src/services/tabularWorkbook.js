import * as XLSX from 'xlsx';
import {
  inferLayeredHeaders,
  looksLikeHeaderRow,
  measurementPreambleLength,
  shouldTransposeTable,
} from './tableLayout.js';

function normalizeCellValue(value) {
  if (value == null) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value);
}

function headerCellNotes(worksheet, headers, transpose, layeredHeaders) {
  if (transpose || layeredHeaders || headers.length < 2) return headers.map(() => '');
  const rows = [];
  for (let row = 0; row < 30; row += 1) {
    const matches = headers.every((header, column) =>
      normalizeCellValue(worksheet[XLSX.utils.encode_cell({ r: row, c: column })]?.v).trim() === header,
    );
    if (matches) rows.push(row);
  }
  if (rows.length !== 1) return headers.map(() => '');
  return headers.map((_, column) => {
    const comments = worksheet[XLSX.utils.encode_cell({ r: rows[0], c: column })]?.c;
    return Array.isArray(comments) ? comments.map((comment) => comment.t).filter(Boolean).join(' ') : '';
  });
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

<<<<<<< HEAD
function uniqueColumnKeys(headers) {
  const reserved = new Set(headers);
  const used = new Set();
  return headers.map((header) => {
    let key = header;
    let suffix = 2;
    while (used.has(key)) {
      key = `${header}_${suffix}`;
      suffix += 1;
      while (reserved.has(key)) {
        key = `${header}_${suffix}`;
        suffix += 1;
      }
    }
    used.add(key);
    return key;
  });
}

=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
function readWorksheetRows(worksheet, transpose = false, skipRows = 0) {
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: transpose,
    defval: '',
    raw: false,
  });
  let usableRows;

  if (transpose) {
    let remainingRowsToSkip = skipRows;
    let firstDataIndex = rows.findIndex((row) => !isEmptyRow(row));
    while (firstDataIndex >= 0 && remainingRowsToSkip > 0) {
      firstDataIndex = rows.findIndex((row, index) => index > firstDataIndex && !isEmptyRow(row));
      remainingRowsToSkip -= 1;
    }
    const contiguousRows = firstDataIndex < 0 ? [] : rows.slice(firstDataIndex);
    const initialColumnCount = getEffectiveColumnCount(contiguousRows[0] ?? []);
    const stopIndex = contiguousRows.findIndex(
      (row) =>
        isEmptyRow(row) || getEffectiveColumnCount(row) !== initialColumnCount,
    );
    usableRows = contiguousRows.slice(0, stopIndex < 0 ? contiguousRows.length : stopIndex);
  } else {
    usableRows = rows.filter((row) => Array.isArray(row) && !isEmptyRow(row)).slice(skipRows);
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
 * - a small preview of the first detected data sheet
 * - all sheets as row objects for later RO-Crate CSV export
 */
export function parseTabularWorkbook(
  buffer,
  previewRowCount = 5,
  hasHeader,
  transpose,
) {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
  });
  if (workbook.SheetNames.length === 0) {
    return { headers: [], rows: [], rowCount: 0, sheetName: '', sheets: [], hasHeader: false, transpose: false };
  }

  const analyzedSheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rawRows = readWorksheetRows(sheet);
    const parameterRowCount = measurementPreambleLength(rawRows);
    const layeredHeaders = parameterRowCount ? null : inferLayeredHeaders(rawRows);
    const leadingRowCount = parameterRowCount || (
      layeredHeaders ? layeredHeaders.headerRowIndex + (transpose === true ? 1 : 0) : 0
    );
    const resolvedTranspose = transpose ?? (
      layeredHeaders ? false : shouldTransposeTable(rawRows.slice(leadingRowCount))
    );
    const effectiveLayeredHeaders = resolvedTranspose ? null : layeredHeaders;
    const tableRows = readWorksheetRows(sheet, resolvedTranspose, leadingRowCount);
    const resolvedHasHeader = hasHeader ?? (Boolean(effectiveLayeredHeaders) || looksLikeHeaderRow(tableRows));
    const columnCount = tableRows.reduce(
      (maxColumns, row) => Math.max(maxColumns, row.length),
      0,
    );
    const headers = Array.from({ length: columnCount }, (_, index) =>
      resolvedHasHeader
        ? effectiveLayeredHeaders?.headers[index] ||
          normalizeCellValue(tableRows[0]?.[index]).trim() || `Column ${index + 1}`
        : `Column ${index + 1}`,
    );
    const firstDataRow = resolvedHasHeader ? 1 : 0;
    const columnNotes = resolvedHasHeader
      ? headerCellNotes(sheet, headers, resolvedTranspose, effectiveLayeredHeaders)
      : headers.map(() => '');

    return {
      name,
      rawRows,
      tableRows,
      headers,
      columnNotes,
      firstDataRow,
      hasHeader: resolvedHasHeader,
      transpose: resolvedTranspose,
      parameterRowCount,
      layeredHeaders: effectiveLayeredHeaders,
    };
  });

  const firstSheet = analyzedSheets[0];
  const firstSheetLooksLikeReport =
    firstSheet.rawRows[0]?.filter((cell) => normalizeCellValue(cell).trim()).length <= 1 &&
    !firstSheet.hasHeader && !firstSheet.layeredHeaders;
  const selectedSheet = firstSheetLooksLikeReport
    ? analyzedSheets.slice(1)
      .filter((sheet) =>
        sheet.rawRows.length > firstSheet.rawRows.length * 2 &&
        (sheet.hasHeader || sheet.layeredHeaders),
      )
      .sort((a, b) => b.tableRows.length - a.tableRows.length)[0] || firstSheet
    : firstSheet;

  const sheets = analyzedSheets.flatMap((sheet) => {
    const { name, rawRows, tableRows, headers, firstDataRow, parameterRowCount, layeredHeaders } = sheet;

<<<<<<< HEAD
    const columnKeys = uniqueColumnKeys(headers);
    const dataSheet = {
      name,
      headers,
      columnKeys,
      rows: tableRows.slice(firstDataRow).map((row) =>
        Object.fromEntries(
          columnKeys.map((key, index) => [key, normalizeCellValue(row[index])]),
=======
    const dataSheet = {
      name,
      headers,
      rows: tableRows.slice(firstDataRow).map((row) =>
        Object.fromEntries(
          headers.map((header, index) => [header, normalizeCellValue(row[index])]),
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
        ),
      ),
    };
    if (parameterRowCount) {
      return [dataSheet, {
        name: `${name}_parameters`,
        headers: ['Parameter', 'Value'],
        rows: rawRows.slice(0, parameterRowCount).map((row) => ({
          Parameter: normalizeCellValue(row[0]),
          Value: normalizeCellValue(row[1]),
        })),
      }];
    }
    if (layeredHeaders) {
      return [dataSheet, {
        name: `${name}_header_details`,
        exportGroup: 'extras',
        headers: ['Row', 'Column', 'Value'],
        rows: rawRows.slice(0, layeredHeaders.headerRowIndex).flatMap((row, rowIndex) =>
          row.flatMap((cell, columnIndex) =>
            normalizeCellValue(cell).trim()
              ? [{ Row: rowIndex + 1, Column: headers[columnIndex] || `Column ${columnIndex + 1}`, Value: normalizeCellValue(cell) }]
              : [],
          ),
        ),
      }];
    }
    return [dataSheet];
  });

  const {
    name: sheetName,
    tableRows,
    headers,
    columnNotes,
    firstDataRow,
    hasHeader: resolvedHasHeader,
    transpose: resolvedTranspose,
    parameterRowCount,
    layeredHeaders,
  } = selectedSheet;
  const layoutNote = parameterRowCount
    ? `${parameterRowCount} measurement settings before data`
    : layeredHeaders
      ? `${layeredHeaders.headerRowIndex} header rows interpreted`
      : transpose == null && resolvedTranspose
        ? 'Rows rotated into columns automatically'
        : '';

  if (tableRows.length === 0) {
    return { headers: [], rows: [], rowCount: 0, sheetName, sheets, hasHeader: resolvedHasHeader, transpose: resolvedTranspose, parameterRowCount, layoutNote };
  }

  const rows = tableRows.slice(firstDataRow, firstDataRow + previewRowCount).map((row) =>
    headers.map((_, index) => normalizeCellValue(row[index])),
  );

  return {
    headers,
    columnNotes,
    rows,
    rowCount: Math.max(tableRows.length - firstDataRow, 0),
    sheetName,
    sheets,
    hasHeader: resolvedHasHeader,
    transpose: resolvedTranspose,
    parameterRowCount,
    layoutNote,
  };
}

