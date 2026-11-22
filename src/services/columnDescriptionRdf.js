/**
 * RDF serialization helpers for ColumnDescriptionNode. The exported serializer
 * turns column headers, terminology concepts, descriptions, and QUDT units
 * into Turtle resources that downstream RDF Store and RO-Crate nodes consume.
 */
const COLUMN_RESOURCE_PREFIX = 'https://example.org/tabular/column/';
const QUDT_UNIT_PREFIX = 'http://qudt.org/vocab/unit/';

function escapeTurtleString(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r');
}

function toColumnDescriptionId(header, index) {
  const normalizedHeader = String(header || `column-${index + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalizedHeader || `column-${index + 1}`;
}

function isAbsoluteIri(value) {
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(value) &&
    !/[\s<>"{}|^`\\]/.test(value)
  );
}

function toResourceIri(value) {
  const candidate = String(value || '').trim();
  return candidate && isAbsoluteIri(candidate) ? candidate : '';
}

function toLabelLiteral(value, language) {
  const escapedValue = escapeTurtleString(value);
  const normalizedLanguage = String(language || '').trim().toLowerCase();

  return /^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(normalizedLanguage)
    ? `"${escapedValue}"@${normalizedLanguage}`
    : `"${escapedValue}"^^xsd:string`;
}

function toUnitIri(field) {
  const candidate = String(field.unitUri || field.unit || '').trim();

  if (!candidate) {
    return '';
  }

  const absoluteIri = toResourceIri(candidate);

  if (absoluteIri) {
    return absoluteIri;
  }

  const compactQudtUnit = candidate.match(/^qudtunit:([A-Za-z][A-Za-z0-9_-]*)$/);

  if (compactQudtUnit) {
    return `${QUDT_UNIT_PREFIX}${compactQudtUnit[1]}`;
  }

  return '';
}

/**
 * Converts column-description form fields into Turtle consumed by RDF Store and
 * RO-Crate nodes. Empty descriptions are omitted, but every detected header is
 * still represented as a W3C CSVW Column resource.
 */
export function serializeColumnDescriptionsToTurtle(fields) {
  const rows = Array.isArray(fields) ? fields : [];
  const resourceLabels = new Map();
  const triples = rows
    .map((field, index) => {
      const header = String(field.header || `Column ${index + 1}`).trim();
      const description = String(field.description || '').trim();
      const descriptionIri = toResourceIri(field.descriptionUri);
      const unitIri = toUnitIri(field);
      const predicates = [
        '  a csvw:Column',
        `  csvw:name "${escapeTurtleString(header)}"^^xsd:string`,
      ];

      if (description) {
        predicates.push(
          `  dcterms:description "${escapeTurtleString(description)}"^^xsd:string`,
        );
      }

      if (descriptionIri) {
        predicates.push(
          `  csvw:propertyUrl "${escapeTurtleString(descriptionIri)}"^^csvw:uriTemplate`,
        );

        if (description) {
          resourceLabels.set(
            `${descriptionIri}\n${description}\n${field.descriptionLanguage || ''}`,
            `<${descriptionIri}> rdfs:label ${toLabelLiteral(
              description,
              field.descriptionLanguage,
            )} .`,
          );
        }
      }

      if (unitIri) {
        predicates.push(`  sdmx-attribute:unitMeasure <${unitIri}>`);

        const unitLabel = String(field.unit || '').trim();

        if (unitLabel) {
          resourceLabels.set(
            `${unitIri}\n${unitLabel}\n${field.unitLanguage || ''}`,
            `<${unitIri}> rdfs:label ${toLabelLiteral(unitLabel, field.unitLanguage)} .`,
          );
        }
      }

      return `<${COLUMN_RESOURCE_PREFIX}${toColumnDescriptionId(header, index)}-${index + 1}>\n${predicates.join(' ;\n')} .`;
    });

  return `@prefix csvw: <http://www.w3.org/ns/csvw#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix sdmx-attribute: <http://purl.org/linked-data/sdmx/2009/attribute#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

${[...triples, ...resourceLabels.values()].join('\n\n')}
`;
}
