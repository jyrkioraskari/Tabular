/** Build one column's evidence without reading measurement rows or neighboring values. */
export function buildColumnAnnotationQuery(fields, index, sheetName = '') {
  const field = fields[index] || {};
  return {
    description: field.description || '',
    header: field.header || '',
    sheetName,
    neighboringHeaders: [fields[index - 1]?.header, fields[index + 1]?.header].filter(Boolean),
    notes: field.notes || '',
  };
}

export function canRetrieveDescriptionMeaning(query, hasTerminologyInput) {
  return Boolean(hasTerminologyInput && String(query.description || '').trim());
}

/** Fingerprint only inputs that can change a proposal. Applied URIs are excluded. */
export function annotationInputFingerprint({ fields, workbookKey, sheetName, vocabularyId, language, quantityKind }) {
  return JSON.stringify({
    workbookKey,
    sheetName,
    vocabularyId,
    language,
    quantityKind,
    columns: fields.map((field) => [field.header, field.description, field.notes]),
  });
}
