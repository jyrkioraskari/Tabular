# TabularRDM advanced topics

This guide contains detailed background, less common workflows,
troubleshooting, and developer information. For a first export, begin with the
[quick-start README](README.md).

## Preparing tabular data

Tabular data is arranged in rows and columns. CSV and TSV files are plain-text
tables; Excel and OpenDocument files can contain multiple worksheets as well as
formatting and formulas. TabularRDM accepts CSV, TSV, TXT, XLS, XLSX, XLSM,
XLSB, ODS, and HTML tables. It reads workbook values and does not execute Excel
macros.

A reusable research table normally has:

- one observation, measurement, or record per row;
- one variable per column;
- one header row at the top, with a unique and non-empty name for every column;
- consistent values in each column, such as numbers, dates, or identifiers;
- units, abbreviations, codes, and missing-value conventions that are
  documented; and
- no decorative title rows, merged cells, totals, or unrelated tables in the
  data area.

Keep identifiers such as `00123` as text, use unambiguous dates such as
`2026-08-25`, and save CSV files as UTF-8 where possible. TabularRDM previews
only the first worksheet, but it retains every worksheet for RO-Crate export.

### Headers and rotated tables

**First row contains headers** is enabled whenever a new file is selected. Turn
it off for a headerless table; TabularRDM then generates `Column 1`, `Column 2`,
and similar names.

If field names run down the first column, select **Rotate rows into columns**.
Rotation stops at the first empty row or when the number of populated cells
changes. This option can help with a small transposed table, but it cannot turn
an arbitrary formatted report into tidy data.

The course presentation illustrates this with a sheet whose first rows contain
`Version`, `Name`, `Unit`, `Datatype`, and `Samplerate`. Without restructuring
or rotation, those values appear as records rather than useful column headers.
For complex reports, make a clean copy in Excel or LibreOffice before import.

### Multiple worksheets and values

The preview and column-description nodes use the first worksheet. When a
Tabular file node is connected to RO-Crate, every worksheet is exported as a
CSV under `original_data/`. Formulas, formatting, macros, charts, and other
workbook features are not preserved in those CSV files.

## Interface reference

The sidebar is a palette of workflow nodes; the area on the right is the
canvas. Drag a palette button onto the canvas to create a node. Connect nodes by
dragging from the round handle on the right of a source to the handle on the
left of its destination. Animated blue lines mark connections that carry
workflow data.

You can:

- drag nodes to rearrange the workflow;
- pan and zoom the canvas with the mouse or the controls in its lower-left
  corner;
- remove a selected node or connection with <kbd>Delete</kbd> or
  <kbd>Backspace</kbd>;
- switch the interface and vocabulary labels between English and German with
  the buttons in the upper-right corner; and
- open context-sensitive help with the `i` button on a node.

### Saved layouts

Enter a layout name and select **Save** to store the current workflow in the
browser. Select a saved entry and use **Load** or **Delete** as needed. A saved
layout is local browser state: it is not an export of the research dataset and
should not be treated as a backup.

## Metadata, units, and RDF

TabularRDM creates two complementary kinds of metadata:

- **Column metadata** explains each variable and its unit.
- **Dataset metadata** describes the collection as a whole, including its
  title, description, licence, dates, and other profile-specific fields.

Both are serialised as RDF. RDF represents information as linked
subject–predicate–object statements, often called triples. TabularRDM displays
the combined triples in the RO-Crate node using the human-readable Turtle
syntax.

### QUDT quantity kinds and units

QUDT is a controlled vocabulary for quantities and units. Connecting
**Quantity Kinds → Units** filters the unit list to the selected kind. For the
presentation's temperature example:

1. Enter `temperature` in **Quantity Kinds**.
2. Select **Celsius temperature**.
3. Drag **Degree Celsius** from **Units** to the intended Unit field in
   **Column Descriptions**.

The drag operation records both the display label and the QUDT URI, which is
less ambiguous than typing a symbol such as `C` manually. Column descriptions
are serialised automatically and have no Save button.

### AIMS metadata profiles

An application profile defines which metadata fields are expected and which
are required. To use a profile from AIMS:

1. Add **Metadata Profile Search** and **Metadata Form**.
2. Connect **Metadata Profile Search → Metadata Form**.
3. Search for a suitable profile; the presentation uses `RO-kit`.
4. Select the intended result to load its SHACL form.
5. Complete every required field marked with an asterisk and select **Save**.

Saving a valid form emits its RDF to connected RO-Crate nodes. Choose metadata
and a licence that accurately describe the real dataset rather than retaining
tutorial examples unchanged.

## RO-Crate details and export settings

An RO-Crate is a portable package for research data and its metadata. Its
standard JSON-LD catalogue describes the dataset, its files, and their
relationships in a machine-readable form.

For a full local export, connect:

- **Tabular file → RO-Crate** for all worksheets;
- **Column Descriptions → RO-Crate** for column RDF; and
- **Metadata Form → RO-Crate** for dataset RDF.

The generated ZIP contains:

- `ro-crate-metadata.json`, an RO-Crate 1.3 JSON-LD catalogue;
- `metadata.ttl`, containing the connected RDF metadata; and
- one CSV for every workbook sheet under `original_data/`.

The RO-Crate node shows the number of loaded triples and a Turtle preview.
**Download Turtle** saves `metadata.ttl` separately; **Download RO-Crate** saves
the complete ZIP.

The course presentation shows a separate **RDF Store** node. In the current
application, its triple count, Turtle preview, and Turtle download are
integrated into **RO-Crate**, so that extra node is no longer needed.

### Custom export settings

Add a worksheet named `export_config` with `key` and `value` columns to control
the ZIP filename and basic crate description. Recognised keys are:

```text
dataset_id
dataset_name
dataset_title
dataset_label
title
dataset_description
description
license
```

Example:

| key | value |
| --- | --- |
| dataset_id | drilling-run-07 |
| dataset_title | Drilling machine run 07 |
| dataset_description | Temperature and rotation measurements from run 07. |
| license | CC BY 4.0 |

`dataset_id` or `dataset_name` determines the ZIP filename. The title is chosen
from `dataset_title`, `dataset_label`, or `title`, in that order. Defaults are
used for omitted settings. The `export_config` worksheet is itself included as
a CSV in the crate.

## RWTH Coscine in detail

Coscine is RWTH Aachen University's research data management platform. It
organises data in projects and resources, applies metadata application
profiles, controls access, and supports sharing and preservation workflows.
TabularRDM can load a resource's profile and upload an RO-Crate to it.

### Prerequisites

Before using the integration, create or obtain:

- a Coscine account;
- a Coscine project and resource;
- write permission for that resource; and
- a Coscine API token.

The selected resource must have an application profile. Treat the API token as
a password: do not share it, put it in screenshots, or commit it to a
repository.

### Connections and upload

1. Add **Coscine** and a dedicated **Metadata Form** to the canvas.
2. Connect **Coscine → Metadata Form**. Coscine sends the selected resource's
   application profile to this form.
3. Connect **Metadata Form → RO-Crate** so its saved RDF is included.
4. Connect **RO-Crate → Coscine** so the package can be uploaded.
5. Keep **Tabular file → RO-Crate** connected so the data files are included.
6. Enter the API token in **API token**. It may be entered with or without the
   `Bearer ` prefix.
7. Select **Load resources**, then choose a writable destination from
   **Resource**. The associated metadata form loads automatically.
8. Complete all required fields in that form and select **Save**.
9. When the Coscine node reports that the package and metadata are ready,
   select **Upload RO-Crate**.

TabularRDM builds the ZIP, writes metadata for the file, and uploads it to the
selected resource. The status shows the uploaded filename when the operation
succeeds. Nothing is uploaded until **Upload RO-Crate** is selected.

If the upload button is disabled, verify that:

- a token and resource are selected;
- RO-Crate is connected and has RDF content; and
- the Metadata Form connected from Coscine has been completed and saved.

## Privacy, security, and troubleshooting

Loading and previewing a local spreadsheet does not send that spreadsheet to
QUDT, AIMS, or Coscine. QUDT unit lookup, AIMS profile search, and Coscine
integration require internet access. Data is sent to Coscine only when you
explicitly start an upload.

On Windows, obtain the portable executable from the official
[TabularRDM releases page](https://github.com/jyrkioraskari/TabularRDM/releases).
If Microsoft SmartScreen appears, compare the published SHA-256 checksum before
continuing. Contact course staff or IT support if no checksum is available or
the values differ.

Common problems:

- **The wrong row is used as headers:** make row 1 contain only column names,
  or adjust **First row contains headers**.
- **Rows and columns are reversed:** try **Rotate rows into columns**, or make a
  tidy copy of the source.
- **A CSV appears as one column:** resave it as XLSX or as a UTF-8,
  comma-separated CSV.
- **Accented characters look wrong:** resave the CSV using UTF-8.
- **A workbook cannot be read:** remove password protection and save a fresh
  XLSX copy.
- **Online lists do not load:** check the internet connection, institutional
  VPN, and proxy settings. Local preview remains available.
- **Coscine rejects an upload:** confirm write access, the selected resource,
  its application profile, and whether the API token is still valid.
- **The Windows application is blocked:** verify the checksum, try the portable
  application from a writable folder, or ask IT support.

When requesting support, include the TabularRDM version, operating system, file
type, the step that failed, and a screenshot without confidential data or API
tokens.

## Developer notes

Use a current Node.js LTS release. Install dependencies and start the Vite
development server with:

```sh
npm install
npm run dev
```

The development application is available at <http://localhost:5173/>.

Build and serve the production web bundle with:

```sh
npm run build
npm run serve
```

The production application is then available at <http://localhost:4173/>. To
build the web bundle and launch the Electron application during development,
use:

```sh
npm run desktop
```

### Windows releases

On a Windows build machine, create the installer and portable release with:

```sh
npm ci
npm run dist:windows
```

Artifacts are written to `release/`. Public executables should be signed with
the institution's Windows code-signing certificate and tested on clean Windows
10 and Windows 11 systems using a non-administrator account. The configured
portable filename for version 1.0.0 and x64 is
`TabularRDM-1.0.0-x64-Portable.exe`.

### Code map

- `src/App.jsx` defines the canvas, node templates, connections, parsing, and
  data propagation.
- `src/nodes/` contains the user-interface nodes.
- `src/services/` contains metadata, vocabulary, RO-Crate, and Coscine logic.
- `server.js` serves the production bundle and provides loopback-only proxies
  for QUDT, AIMS, and Coscine.
- `electron/main.js` starts the local server and desktop window.

A Vite warning about chunks larger than 500 kB is expected because spreadsheet,
RDF, RO-Crate, and ZIP libraries are sizeable; it is not a build failure.

---

[Back to the quick start](README.md)
