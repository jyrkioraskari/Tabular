# Column annotations: developer guide

This page explains how column suggestions are built, applied, tested, and extended. For the researcher workflow, see [Describe columns](semantic-columns.md). For configuration and evaluation, see [Annotation suggestions](ANNOTATION_SUGGESTIONS.md).

## Run and compile

Use a current Node.js LTS release in the repository root:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/`. Build the production bundle and run all repository tests with:

```sh
npm run build
node --test tests/*.test.js
```

To exercise the server proxy and group memory, start the built application with `npm run serve` and open `http://localhost:4173/`. The reranker needs `ANNOTATION_RERANK_API_KEY` and `ANNOTATION_RERANK_MODEL` on that server. Local embedding may download its model on first use. On Windows, `npm run dist:windows` packages the application after the web build; see [Development and releases](development.md).

## Follow one column through the code

1. `src/App.jsx` passes the active workbook, sheet, headers, Terminology Service connection, and QUDT quantity kind to `ColumnDescriptionNode.jsx`. It also receives every field commit and updates RDF with `columnDescriptionRdf.js`.
2. `columnAnnotationQuery.js` builds the query from the researcher's description, header, sheet, neighboring headers, and associated notes. Measurement rows are not included.
3. `useColumnAnnotationSuggestions.js` starts requests after a short delay. It cancels obsolete requests and tags each result with an input fingerprint so a late result cannot apply to a new workbook, sheet, or edited column.
4. `annotationSuggestions.js` searches the Terminology Service across all vocabularies. `annotationReranker.js` reranks the shortlist and validates temporary IDs before resolving URIs. A bounded vocabulary snapshot remains available for explicit ontology ID calls such as evaluation.
5. `annotationUnits.js` resolves only units explicitly present in associated source text against QUDT. `annotationMemory.js` ranks previously applied choices from the browser or group memory.
6. `ColumnDescriptionNode.jsx` opens the selected column's comparison beside the editor. `ColumnAnnotationReview.jsx` shows source values, glossary candidates, and the current decision. It never commits a suggestion on its own.
7. `useColumnAnnotationMemory.js` is the commit path for accepted, manual, and dragged annotations. `ColumnAnnotationMemoryControls.jsx` manages opt-in browser storage.

## Acceptance policy

Selecting a column or viewing a candidate does not change `descriptionUri`. The researcher explicitly accepts a candidate or uses the existing manual search. The review remains available after acceptance so alternatives can be inspected without losing the accepted identifier. Browser restoration requires the “Remember column annotations in this browser” option; RO-Crate export uses the current annotation fields.

## Legacy automatic application policy

The semantic score is a cosine similarity, **not a calibrated probability**. `annotationAutoApply.js` and its tests remain for legacy evaluation, but the selected-column review does not call its automatic commit hook. Terminology Service fallback results remain for review.

The old selector remains available for evaluation of prior behavior. Its thresholds do not drive the selected-column review.

## Extend safely

| Change | Start here | Check |
| --- | --- | --- |
| New semantic embedding model | `annotationEmbeddings.js` | Update its model identifier so cached glossary vectors are invalidated; test retrieval cutoff and Hit@3. |
| New reranking provider or prompt | `annotationReranker.js` | Keep temporary IDs and response validation; test invented IDs and ambiguity. |
| Different automatic threshold | `annotationAutoApply.js` | Compare labelled retrieval recall, Hit@3, abstention, and auto-application precision before changing it. |
| Additional unit evidence | `annotationUnits.js` | Accept only a source reliably associated with the column; test ambiguous symbols and language. |
| Another memory source | `useColumnAnnotationMemory.js` and `annotationMemory.js` | Preserve opt-in behavior, URI identity, ambiguity handling across vocabularies, and conflicting unit checks. |
| New review control | `ColumnAnnotationReview.jsx` | Call the existing commit handlers so RDF export and memory see the same URI. |

The pure services accept injected lookup or model functions where practical. Add focused service tests in `tests/`; use the full build and test commands above before changing the UI. For labelled semantic evaluation, run `node scripts/evaluateAnnotations.mjs labelled-columns.json VOCABULARY_ID` against the configured application server. The report separates retrieval misses from reranking and abstention, and reports automatic application rate and precision for meanings. Unit auto-application needs a separate labelled unit set.
