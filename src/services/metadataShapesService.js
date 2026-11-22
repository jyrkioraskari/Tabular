import { DataFactory, Parser, Writer } from 'n3';
import jsonld from 'jsonld';
import { RdfXmlParser } from 'rdfxml-streaming-parser';

/**
 * Main-thread facade for the metadata shapes worker. It manages worker startup,
 * request IDs, pending promises, and a shared cached default-shapes request.
 */
let worker;
let nextRequestId = 0;
let defaultMetadataShapesRequest;

const pendingRequests = new Map();
const externalRdfRequests = new Map();
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const RDFS_IS_DEFINED_BY = 'http://www.w3.org/2000/01/rdf-schema#isDefinedBy';
const SKOS_IN_SCHEME = 'http://www.w3.org/2004/02/skos/core#inScheme';
const DCAM_MEMBER_OF = 'http://purl.org/dc/dcam/memberOf';
const VOCABULARY_MEMBERSHIP_PREDICATES = new Set([
  RDFS_IS_DEFINED_BY,
  SKOS_IN_SCHEME,
  DCAM_MEMBER_OF,
]);

const { namedNode, quad } = DataFactory;

function serializeTurtle(quads) {
  return new Promise((resolve, reject) => {
    const writer = new Writer({ format: 'text/turtle' });
    writer.addQuads(quads);
    writer.end((error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });
}

function serializeGraphAsTurtle(quads) {
  // The form consumes one merged graph. Class option lists do not depend on
  // graph names, so flatten named graphs while preserving RDF terms.
  return serializeTurtle(
    quads.map((item) => quad(item.subject, item.predicate, item.object)),
  );
}

function parseRdfXml(rdf) {
  return new Promise((resolve, reject) => {
    const parser = new RdfXmlParser();
    const quads = [];
    parser.on('data', (item) => quads.push(item));
    parser.once('error', reject);
    parser.once('end', () => resolve(quads));
    parser.end(rdf);
  });
}

async function normalizeExternalRdf(rdf, contentType = '') {
  const body = String(rdf ?? '').trim();
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();

  if (!body) {
    throw new Error('Metadata vocabulary returned an empty response.');
  }

  if (
    mediaType === 'application/pdf' ||
    body.startsWith('%PDF-') ||
    /^<!doctype\s+html|^<html\b/i.test(body)
  ) {
    throw new Error('Metadata vocabulary returned a document instead of RDF.');
  }

  let quads;
  const looksLikeJsonLd =
    mediaType === 'application/ld+json' ||
    ((mediaType === 'application/json' || /^[\[{]/.test(body)) &&
      /["']@(?:context|id|graph|type)["']\s*:/.test(body));

  if (looksLikeJsonLd) {
    let document;

    try {
      document = JSON.parse(body);
    } catch {
      throw new Error('Metadata vocabulary returned malformed JSON-LD.');
    }

    const nquads = await jsonld.toRDF(document, { format: 'application/n-quads' });
    quads = new Parser({ format: 'application/n-quads' }).parse(nquads);
  } else if (
    mediaType === 'application/rdf+xml' ||
    /^<\?xml\b/i.test(body) ||
    /^<rdf:RDF\b/i.test(body)
  ) {
    quads = await parseRdfXml(body);
  } else {
    const parserFormat =
      mediaType === 'application/trig'
        ? 'application/trig'
        : mediaType === 'application/n-quads'
          ? 'application/n-quads'
          : mediaType === 'application/n-triples'
            ? 'application/n-triples'
            : mediaType === 'text/n3'
              ? 'text/n3'
              : 'text/turtle';

    try {
      quads = new Parser({ format: parserFormat }).parse(body);
    } catch {
      throw new Error('Metadata vocabulary returned an unsupported or invalid RDF format.');
    }
  }

  if (!quads.length) {
    throw new Error('Metadata vocabulary did not contain any RDF statements.');
  }

  return serializeGraphAsTurtle(quads);
}

async function addCoscineVocabularyInstances(classUrl, rdf) {
  let quads;

  try {
    quads = new Parser().parse(rdf);
  } catch {
    // JSON-LD and RDF/XML remain usable by shacl-form; this compatibility
    // enrichment is only needed for Turtle vocabulary-definition classes.
    return rdf;
  }

  const alreadyHasInstances = quads.some(
    (item) => item.predicate.value === RDF_TYPE && item.object.value === classUrl,
  );

  if (alreadyHasInstances) {
    return rdf;
  }

  const candidateSubjects = new Map();

  for (const item of quads) {
    if (
      item.subject.termType === 'NamedNode' &&
      VOCABULARY_MEMBERSHIP_PREDICATES.has(item.predicate.value) &&
      item.object.value === classUrl
    ) {
      candidateSubjects.set(item.subject.value, item.subject);
    }
  }

  if (!candidateSubjects.size) {
    return rdf;
  }

  const instanceQuads = Array.from(candidateSubjects.values(), (subject) =>
    quad(subject, namedNode(RDF_TYPE), namedNode(classUrl)),
  );

  return `${rdf.trim()}\n\n# Coscine vocabulary-definition compatibility\n${await serializeTurtle(instanceQuads)}`;
}

/**
 * Vocabulary files imported by Coscine profiles do not always model their
 * selectable entries as rdf:type instances. DCMI Type uses dcam:memberOf,
 * while SKOS vocabularies commonly use skos:inScheme. Add the equivalent
 * instance statements expected by shacl-form without removing or rewriting
 * the vocabulary's original statements.
 */
async function normalizeVocabularyMemberships(rdf) {
  let quads;

  try {
    quads = new Parser().parse(rdf);
  } catch {
    return rdf;
  }

  const existingTypes = new Set(
    quads
      .filter(
        (item) =>
          item.subject.termType === 'NamedNode' &&
          item.predicate.value === RDF_TYPE &&
          item.object.termType === 'NamedNode',
      )
      .map((item) => `${item.subject.value}\u0000${item.object.value}`),
  );
  const addedTypes = new Map();

  for (const item of quads) {
    if (
      item.subject.termType !== 'NamedNode' ||
      item.object.termType !== 'NamedNode' ||
      !VOCABULARY_MEMBERSHIP_PREDICATES.has(item.predicate.value)
    ) {
      continue;
    }

    const key = `${item.subject.value}\u0000${item.object.value}`;

    if (!existingTypes.has(key)) {
      addedTypes.set(key, quad(item.subject, namedNode(RDF_TYPE), item.object));
    }
  }

  if (!addedTypes.size) {
    return rdf;
  }

  return `${rdf.trim()}\n\n# Vocabulary membership compatibility for metadata forms\n${await serializeTurtle(
    Array.from(addedTypes.values()),
  )}`;
}

/**
 * Loads dereferenceable RDF used by SHACL profiles. AIMS profiles commonly
 * carry choices inline with sh:in, while Coscine profiles also use sh:class
 * and owl:imports. Routing the latter through the local service avoids browser
 * CORS failures and keeps the two profile representations interoperable.
 */
export function fetchExternalMetadataRdf(url) {
  const normalizedUrl = String(url ?? '').trim();

  if (!normalizedUrl) {
    return Promise.reject(new Error('Cannot load an empty RDF resource URL.'));
  }

  if (!externalRdfRequests.has(normalizedUrl)) {
    const request = fetch(`/rdf-resource?url=${encodeURIComponent(normalizedUrl)}`, {
      headers: {
        Accept: [
          'text/turtle',
          'application/trig',
          'application/n-triples',
          'application/n-quads',
          'text/n3',
          'application/ld+json',
          'application/rdf+xml',
        ].join(', '),
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.message
              ? `${payload.message} (${payload.upstreamStatus || response.status}): ${normalizedUrl}`
              : `Unable to load metadata vocabulary (${response.status}): ${normalizedUrl}`,
          );
        }

        const contentType = response.headers.get('content-type') ?? '';

        if (contentType.includes('text/html')) {
          throw new Error(`Metadata vocabulary returned HTML instead of RDF: ${normalizedUrl}`);
        }

        const rdf = await normalizeExternalRdf(await response.text(), contentType);
        return normalizeVocabularyMemberships(rdf);
      })
      .catch((error) => {
        externalRdfRequests.delete(normalizedUrl);
        throw error;
      });

    externalRdfRequests.set(normalizedUrl, request);
  }

  return externalRdfRequests.get(normalizedUrl);
}

/**
 * shacl-form requests all sh:class vocabularies in one call. Load every
 * dereferenceable class graph, but keep the usable graphs when one vocabulary
 * endpoint is unavailable; owl:imports may still supply the missing class.
 */
export async function fetchExternalClassInstances(classes, { onError } = {}) {
  const classUrls = typeof classes === 'string' ? [classes] : Array.from(classes ?? []);
  const results = await Promise.allSettled(
    classUrls.map(async (classUrl) => {
      const rdf = await fetchExternalMetadataRdf(classUrl);
      return addCoscineVocabularyInstances(classUrl, rdf);
    }),
  );
  const loadedGraphs = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);

  const failures = results.flatMap((result, index) => result.status === 'rejected'
    ? [{ url: classUrls[index], error: result.reason }]
    : []);
  if (failures.length) onError?.(failures);

  if (!loadedGraphs.length && results.length) {
    throw results.find((result) => result.status === 'rejected').reason;
  }

  return loadedGraphs.join('\n\n');
}

/**
 * Lazily starts the metadata-shapes worker and resolves pending request
 * promises when the worker posts responses back.
 */
function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./metadataShapes.worker.js', import.meta.url), {
      type: 'module',
    });

    worker.addEventListener('message', (event) => {
      const { id, ok, shapes, error } = event.data ?? {};
      const pending = pendingRequests.get(id);

      if (!pending) {
        return;
      }

      pendingRequests.delete(id);

      if (ok) {
        pending.resolve(shapes);
      } else {
        pending.reject(new Error(error || 'Unable to load metadata shapes.'));
      }
    });

    worker.addEventListener('error', (event) => {
      const error = new Error(event.message || 'Metadata shapes worker failed.');

      for (const pending of pendingRequests.values()) {
        pending.reject(error);
      }

      pendingRequests.clear();
      worker?.terminate();
      worker = undefined;
    });
  }

  return worker;
}

function requestDefaultMetadataShapes() {
  const id = `metadata-shapes-${nextRequestId}`;
  nextRequestId += 1;

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    getWorker().postMessage({ id, type: 'metadata-shapes:get-default' });
  });
}

/**
 * Loads the default metadata shapes once and shares the in-flight promise across
 * Metadata Form nodes.
 */
export function fetchDefaultMetadataShapes() {
  if (!defaultMetadataShapesRequest) {
    defaultMetadataShapesRequest = requestDefaultMetadataShapes().catch((error) => {
      defaultMetadataShapesRequest = undefined;
      throw error;
    });
  }

  return defaultMetadataShapesRequest;
}
