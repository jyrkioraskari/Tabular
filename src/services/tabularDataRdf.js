/**
 * Serializes workbook rows using the W3C CSV on the Web RDF model. Values stay
 * as strings because the source workbook does not provide reliable datatypes.
 */

function escapeTurtleString(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r');
}

function slugify(value, fallback) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || fallback;
}

function encodeFragment(value, fallback) {
  return encodeURIComponent(String(value || fallback).trim());
}

export function serializeTabularDataToTurtle(sheets = [], { onProgress } = {}) {
  const normalizedSheets = Array.isArray(sheets) ? sheets : [];
  const blocks = [];
  const totalRows = normalizedSheets.reduce(
    (sum, sheet) => sum + (Array.isArray(sheet?.rows) ? sheet.rows.length : 0),
    0,
  );
  let processedRows = 0;
  let lastReportedPercent = -1;

  const reportProgress = () => {
    if (typeof onProgress !== 'function') return;

    const percent = totalRows === 0
      ? 100
      : Math.min(100, Math.floor((processedRows / totalRows) * 100));

    if (percent !== lastReportedPercent) {
      lastReportedPercent = percent;
      onProgress({ processedRows, totalRows, percent });
    }
  };

  reportProgress();

  normalizedSheets.forEach((sheet, sheetIndex) => {
    const sheetSlug = slugify(sheet.name, `sheet-${sheetIndex + 1}`);
    const tableIri = `https://example.org/tabular/data/${sheetSlug}`;
    const rows = Array.isArray(sheet.rows) ? sheet.rows : [];

    const rowLinks = rows.map(
      (_, rowIndex) => `<${tableIri}#row-${rowIndex + 1}>`,
    );
    const tablePredicates = [
      '  a csvw:Table',
      `  dcterms:title "${escapeTurtleString(sheet.name || `Sheet ${sheetIndex + 1}`)}"^^xsd:string`,
    ];

    if (rowLinks.length > 0) {
      tablePredicates.push(`  csvw:row ${rowLinks.join(', ')}`);
    }

    blocks.push(`<${tableIri}>\n${tablePredicates.join(' ;\n')} .`);

    rows.forEach((row, rowIndex) => {
      const rowIri = `${tableIri}#row-${rowIndex + 1}`;
      const recordIri = `${tableIri}#record-${rowIndex + 1}`;
      const rowPredicates = [
        '  a csvw:Row',
        `  csvw:rownum "${rowIndex + 1}"^^xsd:integer`,
        `  csvw:describes <${recordIri}>`,
      ];
      blocks.push(`<${rowIri}>\n${rowPredicates.join(' ;\n')} .`);

      const valuePredicates = Object.entries(row || {})
        .filter(([, value]) => value != null && String(value) !== '')
        .map(
          ([header, value], columnIndex) =>
            `  <${tableIri}#${encodeFragment(header, `column-${columnIndex + 1}`)}> "${escapeTurtleString(value)}"^^xsd:string`,
        );

      if (valuePredicates.length > 0) {
        blocks.push(`<${recordIri}>\n${valuePredicates.join(' ;\n')} .`);
      }

      processedRows += 1;
      reportProgress();
    });
  });

  if (blocks.length === 0) {
    reportProgress();
    return '';
  }

  return `@prefix csvw: <http://www.w3.org/ns/csvw#> .\n@prefix dcterms: <http://purl.org/dc/terms/> .\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n${blocks.join('\n\n')}\n`;
}
