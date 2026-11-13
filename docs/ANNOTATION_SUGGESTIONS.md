# Annotation suggestions

Connect a Terminology Service node to Column Descriptions and enter an ontology ID in that node. Suggestions start automatically when the table has column headers and refresh after header, description, sheet, workbook, or vocabulary changes. A researcher description is used as the primary meaning query when present; otherwise the header, sheet name, neighboring headers, and associated notes supply the query. A unit explicitly stated in a header can be suggested even when the description is blank. Meaning and Unit can be applied independently. Existing values require the explicit **Replace** action.

Only actionable proposals are shown. Unit proposals use German QUDT names when the interface is German and a German label exists; otherwise they use English names. Each proposal disappears after it is applied or dismissed.

When **Remember column annotations in this browser** is selected, applied meanings and units are saved as a browser-local history alongside the node's field copy. Later columns with similar wording or slightly different spelling can then show those choices for review, including header-only columns. These are never applied automatically. Meaning history stays within the same vocabulary; a unit with a conflicting explicit header symbol is not offered. Unchecking removes this node's saved copy and choices. **Clear remembered choices** removes the full browser history.

For a group using the same Tabular server, enter or generate a group code and enable **Use shared group memory**. New applied choices are then saved on the server for others with that code. **Share my saved choices** explicitly uploads older browser choices, and **Refresh shared choices** retrieves colleagues' newer choices. Group history is stored in `.tabular-group-memory` by default; set `TABULAR_GROUP_MEMORY_DIR` to use a persistent server data directory. The code is the access credential, so share it only with the intended group. A local desktop server does not synchronize with other computers; collaborators need to use the same hosted Tabular server.

The browser downloads `Xenova/all-MiniLM-L6-v2` on first semantic retrieval. Snapshots are limited to 1,000 ontology classes; larger or unavailable snapshots use Terminology Service search and are labelled as fallback. Reranking requires a server configured with `ANNOTATION_RERANK_API_KEY` and `ANNOTATION_RERANK_MODEL`. `ANNOTATION_RERANK_URL` can point to another OpenAI-compatible chat completions endpoint. Without a configured provider, suggestion requests show a retryable error; manual Terminology Service search remains available.

For labelled evaluation, prepare a JSON array with `description`, `header`, and `goldUri` for each column. Run the configured app server, then:

```sh
node scripts/evaluateAnnotations.mjs labelled-columns.json VOCABULARY_ID
```

The report includes recall at the retrieval cutoff (default 12), Hit@3 before and after reranking, a separate deterministic Terminology Service lexical baseline Hit@3, abstention rate, and per-column results. Evaluate the same labelled columns in both ranking paths. Measurement rows are never read for suggestions.
