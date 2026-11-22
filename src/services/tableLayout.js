function cellText(value) {
  return value == null ? '' : String(value).trim();
}

function isNumeric(value) {
  const text = cellText(value);
  return text !== '' && !Number.isNaN(Number(text.replace(',', '.')));
}

function effectiveColumnCount(row) {
  for (let index = row.length - 1; index >= 0; index -= 1) {
    if (cellText(row[index])) return index + 1;
  }
  return 0;
}

function filledCellCount(row) {
  return row.filter((cell) => cellText(cell)).length;
}

const parameterColumnHeadings = new Set([
  'parameter', 'measurement', 'variable', 'quantity', 'property',
  'metric', 'analyte', 'feature', 'name', 'label', 'item',
  'time', 'date', 'timestamp', 'id', 'sample',
  'messgroesse', 'messgröße', 'eigenschaft',
]);

export function looksLikeHeaderRow(rows) {
  if (rows.length === 0) return false;

  const columnCount = rows.reduce(
    (maxColumns, row) => Math.max(maxColumns, effectiveColumnCount(row)),
    0,
  );
  const names = Array.from({ length: columnCount }, (_, index) => cellText(rows[0][index]));
  const filledNames = names.filter(Boolean);
  const uniqueNames = filledNames.length >= 2 &&
    filledNames.length / names.length >= 0.9 &&
    new Set(filledNames.map((name) => name.toLocaleLowerCase())).size === filledNames.length;
  const completeHeaders = uniqueNames && (
    filledNames.every((name) => !isNumeric(name)) ||
    parameterColumnHeadings.has(names[0].toLocaleLowerCase())
  );

  if (completeHeaders) return true;

  // Some measurement sheets name only the first column in row one. Keep that
  // label and give the remaining, unnamed columns generated names.
  const firstRow = rows[0];
  const dataRows = rows.slice(1, 4);
  return columnCount > 1 &&
    firstRow.filter((cell) => cellText(cell)).length === 1 &&
    Boolean(cellText(firstRow[0])) &&
    !isNumeric(firstRow[0]) &&
    dataRows.length >= 2 &&
    dataRows.every((row) => effectiveColumnCount(row) > 1 && isNumeric(row[0]));
}

export function measurementPreambleLength(rows) {
  const limit = Math.min(rows.length - 3, 30);
  for (let index = 3; index <= limit; index += 1) {
    const settings = rows.slice(0, index);
    const labels = settings.map((row) => cellText(row[0]).toLocaleLowerCase());
    if (
      settings.some((row) => !cellText(row[0]) || isNumeric(row[0]) ||
        !cellText(row[1]) || filledCellCount(row) > 3) ||
      new Set(labels).size !== labels.length
    ) {
      return 0;
    }

    const dataRows = rows.slice(index, index + 3);
    if (dataRows.every((row) => {
      const populated = row.filter((cell) => cellText(cell));
      return populated.length >= 8 &&
        populated.filter(isNumeric).length / populated.length >= 0.8;
    })) {
      return index;
    }
  }
  return 0;
}

export function inferLayeredHeaders(rows) {
  const limit = Math.min(rows.length - 3, 8);
  for (let index = 1; index <= limit; index += 1) {
    const candidate = rows[index];
    const dataRows = rows.slice(index + 1, index + 4);
    const width = effectiveColumnCount(dataRows[0]);
    if (width < 8 || dataRows.some((row) => {
      const populated = row.filter((cell) => cellText(cell));
      return effectiveColumnCount(row) !== width || populated.length < 8 ||
        populated.filter(isNumeric).length / populated.length < 0.75;
    })) continue;

    const candidateCells = Array.from({ length: width }, (_, column) => cellText(candidate[column]));
    const filled = candidateCells.filter(Boolean);
    const sparseLabels = filled.length >= 2 && filled.length <= 3 &&
      candidateCells.slice(0, filled.length).every(Boolean) &&
      candidateCells.slice(filled.length).every((value) => !value) &&
      filled.every((value) => !isNumeric(value));
    const numericIdentifiers = !candidateCells[0] && !candidateCells[1] &&
      filled.length >= 8 && filled.filter(isNumeric).length / filled.length >= 0.8 &&
      new Set(filled).size === filled.length;
    if (!sparseLabels && !numericIdentifiers) continue;

    const metadataRows = rows.slice(0, index);
    if (!metadataRows.some((row) => cellText(row[0]) && !isNumeric(row[0]))) continue;

    let descriptorRow = null;
    if (sparseLabels) {
      descriptorRow = metadataRows
        .filter((row) => cellText(row[0]))
        .map((row) => ({
          row,
          values: row.slice(filled.length, width).map(cellText).filter(Boolean),
        }))
        .filter(({ values }) => values.length >= width - filled.length - 1 &&
          new Set(values.map((value) => value.toLocaleLowerCase())).size === values.length)
        .at(-1)?.row ?? null;
      if (!descriptorRow) continue;
    }

    const headers = candidateCells.map((name, column) => {
      if (name) return numericIdentifiers && isNumeric(name) ? `Test ${name}` : name;
      const descriptor = cellText(descriptorRow?.[column]);
      return descriptor ? `${cellText(descriptorRow[0])} ${descriptor}` : `Column ${column + 1}`;
    });

    return { headerRowIndex: index, headers };
  }
  return null;
}

export function shouldTransposeTable(rows) {
  const sample = rows.slice(0, 12);
  if (sample.length < 3) return false;

  const columnCount = effectiveColumnCount(sample[0]);
  if (columnCount < 2 || sample.some((row) => effectiveColumnCount(row) !== columnCount)) {
    return false;
  }

  const parameterNames = sample.map((row) => cellText(row[0]));
  if (
    parameterColumnHeadings.has(parameterNames[0].toLocaleLowerCase()) ||
    parameterNames.some((name) => !name || isNumeric(name)) ||
    new Set(parameterNames.map((name) => name.toLocaleLowerCase())).size !== sample.length
  ) {
    return false;
  }

  // A normal header row has text across the top. Rotate only when the first
  // row itself already contains measurements after its parameter name.
  const firstRowMeasurements = sample[0].slice(1, columnCount);
  if (firstRowMeasurements.filter(isNumeric).length < Math.ceil(firstRowMeasurements.length / 2)) {
    return false;
  }

  const measurements = sample.flatMap((row) => row.slice(1, columnCount));
  return measurements.filter(isNumeric).length / measurements.length >= 0.7;
}
