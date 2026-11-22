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

<<<<<<< HEAD
export function canRetrieveDescriptionMeaning(query, hasTerminologyInput, vocabularyId) {
  return Boolean(hasTerminologyInput && vocabularyId && String(query.description || '').trim());
}

=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
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
