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

1. `src/App.jsx` passes the active workbook, sheet, headers, connected vocabulary, and QUDT quantity kind to `ColumnDescriptionNode.jsx`. It also receives every field commit and updates RDF with `columnDescriptionRdf.js`.
2. `columnAnnotationQuery.js` builds the query from the researcher's description, header, sheet, neighboring headers, and associated notes. Measurement rows are not included.
3. `useColumnAnnotationSuggestions.js` starts requests after a short delay. It cancels obsolete requests and tags each result with an input fingerprint so a late result cannot apply to a new workbook, sheet, vocabulary, or edited column.
4. `annotationSuggestions.js` retrieves candidates from a bounded vocabulary snapshot using `annotationEmbeddings.js`. If the snapshot is unavailable, it searches the Terminology Service. `annotationReranker.js` reranks the shortlist and validates temporary IDs before resolving URIs.
5. `annotationUnits.js` resolves only units explicitly present in associated source text against QUDT. `annotationMemory.js` ranks previously applied choices from the browser or group memory.
6. `annotationAutoApply.js` selects strong, unambiguous choices. `useAutoApplyColumnAnnotations.js` batches them into one field commit and remembers when a researcher manually overrides a column.
7. `useColumnAnnotationMemory.js` is the single commit path for automatic, manual, and dragged annotations. `ColumnAnnotationReview.jsx` displays choices that still need review; `ColumnAnnotationMemoryControls.jsx` manages opt-in storage.

## Automatic application policy

The semantic score is a cosine similarity, **not a calibrated probability**. The current conservative rule applies a meaning only when the source is a semantic vocabulary snapshot, reranking supports exactly one candidate, reranking reports no ambiguity, and its similarity is at least `AUTO_SEMANTIC_SCORE` (`0.72`). Terminology Service fallback results remain for review.

A memory choice can apply when the description or header match is strong and no similarly ranked history item points to a different URI. This includes small spelling differences. Meaning memory stays within the selected vocabulary; conflicting explicit unit symbols are rejected. If a strong semantic result disagrees with memory, both stay for review. A uniquely resolved unit from an explicit source field can apply automatically. If a memory unit conflicts with that explicit unit, neither is applied automatically.

Existing meaning links and unit values are never replaced automatically. An automatic meaning link preserves the researcher's description. An automatic unit changes only the unit fields. The table displays the applied name with **Change**, without an edit field; **Change** opens the editable search control. Dragging a replacement also works. Once a researcher edits or replaces a column's value, automatic application is blocked for that column and annotation kind until the workbook, sheet, vocabulary, or header changes. Remaining uncertain suggestions stay in the review panel.

## Extend safely

| Change | Start here | Check |
| --- | --- | --- |
| New semantic embedding model | `annotationEmbeddings.js` | Update its model identifier so cached glossary vectors are invalidated; test retrieval cutoff and Hit@3. |
| New reranking provider or prompt | `annotationReranker.js` | Keep temporary IDs and response validation; test invented IDs and ambiguity. |
| Different automatic threshold | `annotationAutoApply.js` | Compare labelled retrieval recall, Hit@3, abstention, and auto-application precision before changing it. |
| Additional unit evidence | `annotationUnits.js` | Accept only a source reliably associated with the column; test ambiguous symbols and language. |
| Another memory source | `useColumnAnnotationMemory.js` and `annotationMemory.js` | Preserve opt-in behavior, URI identity, vocabulary restrictions, and conflicting unit checks. |
| New review control | `ColumnAnnotationReview.jsx` | Call the existing commit handlers so RDF export and memory see the same URI. |

The pure services accept injected lookup or model functions where practical. Add focused service tests in `tests/`; use the full build and test commands above before changing the UI. For labelled semantic evaluation, run `node scripts/evaluateAnnotations.mjs labelled-columns.json VOCABULARY_ID` against the configured application server. The report separates retrieval misses from reranking and abstention, and reports automatic application rate and precision for meanings. Unit auto-application needs a separate labelled unit set.
