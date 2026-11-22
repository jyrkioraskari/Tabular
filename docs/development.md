# Development and releases

This page is for contributors. Researchers using the application should begin
with the [quick-start tutorial](../README.md).

## Run the development application

Use a current Node.js LTS release:

```sh
npm install
npm run dev
```

Open <http://localhost:5173/>.

## Test the production bundle

```sh
<<<<<<< HEAD
npm test
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
npm run build
npm run serve
```

Open <http://localhost:4173/>. To build the web bundle and launch Electron
during development, run:

```sh
npm run desktop
```

A Vite warning about chunks larger than 500 kB is expected because spreadsheet,
RDF, RO-Crate, and ZIP libraries are sizeable. It is not a build failure.

## npm install deprecation warnings

The annotation embedding dependency uses Transformers.js 4, which no longer
pulls in the older ONNX Runtime path to `boolean@3`. Some warnings still come
from current upstream dependency trees:

- `electron-builder` pulls `glob@7` and `inflight@1` through `@electron/asar`,
  and `rimraf@2` through its Windows installer dependencies.
- Electron 37 and Electron Builder each pull `boolean@3` through their own
  versions of `@electron/get` and `global-agent`. Updating Electron alone does
  not remove this warning.
- `shacl-engine` pulls `sparqljs@3` through Comunica and `sparqlalgebrajs`.

Do not override these transitive packages independently: their callers may
depend on the older APIs. Recheck the tree with
`npm ls --package-lock-only boolean glob rimraf sparqljs inflight --all` when
upgrading Electron, Electron Builder, or the SHACL form stack. An Electron
major upgrade also needs a Windows packaging smoke test.

## Build a Windows release

On a Windows build machine:

```sh
npm ci
npm run dist:windows
```

Artifacts are written to `release/`. Public executables should be signed with
the institution's code-signing certificate and tested on clean Windows 10 and
Windows 11 systems using a non-administrator account.
<<<<<<< HEAD
Before release, inspect the packaged `app.asar` for `server.js`, its imported
root modules, `LICENSE`, `THIRD_PARTY_LICENSES.md`, and
`THIRD_PARTY_PROVENANCE.md`. Resolve the asset origin questions recorded in
`THIRD_PARTY_PROVENANCE.md` before publishing a new binary.
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571

## Code map

For the complete suggestion, memory, and auto-application flow, see the [column annotation developer guide](column-annotation-developer-guide.md).

- `src/App.jsx` defines the canvas, connections, parsing, and data propagation.
- `src/nodes/` contains workflow node interfaces.
- `src/services/` contains metadata, vocabulary, RDF, RO-Crate, and Coscine
  logic.
<<<<<<< HEAD
- `src/services/nodeExchange.js` serializes, sanitizes, and validates JSON
  workflow/node exports and imports (shape and known-type checks only; shared
  files are never evaluated). Nodes of `untrustedTypes` (Python script nodes)
  are imported with `trusted: false` so imported code never auto-runs.
- `src/services/nodeLibrary.js` stores the local "My nodes" library in
  localStorage via `browserDrafts.js`.
- `pythonNodeServer.js` (repo root) exposes the loopback-only
  `POST /python-node/run` endpoint: it spawns an isolated `python3 -I`
  subprocess, feeds a `{ code, inputs, data }` JSON envelope on stdin, and
  returns the JSON the user script prints. Guarded by a custom header, a
  loopback Host check, size caps, and a kill timeout. `TABULAR_PYTHON_BIN`
  overrides the interpreter. `src/services/pythonNodeClient.js` is the
  renderer-side fetch client plus input collection; `src/nodes/PythonNode.jsx`
  is the node UI.
- `n8nNodeServer.js` (repo root) forwards an explicitly configured n8n webhook
  call from the loopback server. It validates the URL, uses a custom local
  request header, and bounds request size, response size, and wait time.
  `src/services/n8nNodeClient.js` collects connected node snapshots and calls
  the bridge; `src/nodes/N8nCommunityNode.jsx` is the canvas UI. Community
  packages execute in the user's n8n instance, not in Tabular.
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
- `server.js` serves the production bundle and provides loopback-only service
  proxies.
- `electron/main.js` starts the local server and desktop window.

## Check a change

Before handing off a change:

1. Run `npm run build`.
2. Exercise the affected workflow in the browser or Electron application.
3. Confirm that local data is not sent to an external service unexpectedly.
4. Update the relevant task page when user-visible behavior changes.

---

[Documentation guide](README.md) · [Repository README](../README.md)
