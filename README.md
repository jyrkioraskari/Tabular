# TabularRDM

TabularRDM helps researchers turn a CSV or spreadsheet into a documented,
machine-readable research dataset. On a visual canvas, you can inspect the
table, explain its columns, assign standard units, add dataset metadata, and
export the result as an RO-Crate ZIP file or upload it to RWTH Coscine.

![The TabularRDM workflow canvas](screen.png)

## Why research data management matters

Research data management (RDM) is the organised handling of data throughout a
research project: planning how data will be collected, naming and structuring
files, documenting their meaning, controlling access, backing them up, and
preparing them for sharing or long-term preservation. Good RDM makes results
easier to understand, reproduce, find, and reuse—not only by other researchers,
but also by your future self.

TabularRDM concentrates on one part of that process: adding useful metadata to
tabular research data. Metadata is “data about data”. It records, for example,
what a dataset is called, what its columns mean, which units were used, who may
reuse it, and when it was published.

## What is tabular data?

Tabular data is arranged in rows and columns. CSV and TSV files are plain-text
tables; Excel and OpenDocument files can contain one or more worksheets as well
as formatting and formulas. TabularRDM accepts CSV, TSV, TXT, XLS, XLSX, XLSM,
XLSB, ODS, and HTML tables. It reads cell values and does not execute Excel
macros.

A reusable research table normally has:

- one observation, measurement, or record per row;
- one variable per column;
- one header row at the top, with a unique and non-empty name for every column;
- consistent values in each column, such as numbers, dates, or identifiers;
- units and abbreviations that are stated explicitly;
- a documented convention for missing values; and
- no decorative title rows, merged cells, totals, or unrelated tables inside
  the data area.

Keep identifiers such as `00123` as text, use unambiguous date formats such as
`2026-08-25`, and save CSV files as UTF-8 where possible. If a preview looks
wrong, first open the source in Excel or LibreOffice and make a clean copy with
a single header row. TabularRDM previews the first worksheet; all worksheets
are retained and converted to CSV when an RO-Crate is exported.

## Start TabularRDM

### Windows: portable application

The easiest option on Windows is
`TabularRDM-1.0.0-x64-Portable.exe`. Download it from the location supplied by
your course or institution, place it in a folder where you have write access,
and double-click it. It does not need to be installed, and administrator rights
are normally not required.

If Microsoft SmartScreen appears, use only a trusted institutional download and
compare the file's published SHA-256 checksum before continuing. Ask the course
staff or your IT support if no checksum is available or the values differ.

### Linux, macOS, or running from source

Install Node.js 18 or newer (a current LTS release is recommended), download or
clone this repository, and run the following commands in its directory:

```sh
npm install
npm run dev
```

Then open <http://localhost:5173/> in a browser. Stop the development server
with <kbd>Ctrl</kbd>+<kbd>C</kbd> in the terminal.

Loading and previewing a local file does not upload it. QUDT unit lookup, AIMS
metadata-profile search, and Coscine integration need an internet connection.

## Understand the user interface

The left sidebar is a palette of workflow nodes; the large area on the right is
the canvas. Drag a palette button onto the canvas to create a node. Connect
nodes by dragging from the round handle on the right of a source node to the
handle on the left of its destination. The animated blue line shows that data
is flowing through the connection.

You can move nodes, pan and zoom the canvas, and delete a selected node or
connection with <kbd>Delete</kbd> or <kbd>Backspace</kbd>. The `i` button on each
node opens short context-sensitive help. The language buttons in the upper
right switch the interface and vocabulary labels between English and German.
“Saved layouts” stores and restores the arrangement and configuration of a
workflow in the current browser; it is not a dataset export or backup.

## Guided workflow

### 1. Load the file and show its columns

1. Use the existing **Tabular file** and **Preview Tabular Data** nodes, or drag
   new ones from the sidebar.
2. Connect **Tabular file → Preview Tabular Data**.
3. In **Tabular file**, select **Select tabular file** and choose your CSV or
   spreadsheet.
4. Leave **First row contains headers** selected for a normal table. Clear it if
   the file has no header row; TabularRDM will display `Column 1`, `Column 2`,
   and so on.
5. Check the first five data rows in the preview. Scroll horizontally inside
   the node to see columns that do not fit.

If the source is arranged vertically—for example, field names run down the
first column—select **Rotate rows into columns**. Rotation stops at the first
empty row or at a change in the number of populated cells. The presentation
shows why this check matters: a report whose first rows contain `Version`,
`Name`, `Unit`, and similar fields will otherwise produce meaningless column
names. For a complex report, restructuring it in Excel or LibreOffice is often
the clearest solution.

### 2. Describe every column

1. Drag **Column Descriptions** onto the canvas.
2. Connect **Tabular file → Column Descriptions**. The detected headers appear
   automatically.
3. In **Column Description**, write a short, precise explanation for each
   column. Include the meaning of codes, identifiers, ranges, or missing values
   where relevant.

For example, `machine_id` might be described as “Unique identifier assigned to
the drilling machine”, while `elapsed_time_s` could be “Seconds elapsed since
the start of the measurement”. Changes are converted to RDF automatically; the
column-description node has no separate Save button.

### 3. Add standard units with QUDT

QUDT is a controlled vocabulary for quantity kinds and units. Using a standard
term such as “Degree Celsius” is less ambiguous than entering a symbol such as
`C` by hand.

1. Drag **Quantity Kinds** and **Units** onto the canvas.
2. Connect **Quantity Kinds → Units**.
3. Search the Quantity Kinds list—for example, enter `temperature`—and select
   the appropriate result, such as **Celsius temperature**.
4. The Units list is filtered. Drag **Degree Celsius** from **Units** into the
   Unit field of the relevant row in **Column Descriptions**.
5. Repeat for the other measured columns. Leave a unit empty for identifiers,
   categories, and genuinely unitless values.

### 4. Add dataset metadata

Column descriptions explain the variables. Dataset metadata explains the data
collection as a whole: its title, description, licence, issue date, creators,
and other information required by a chosen metadata profile.

1. Drag **Metadata Profile Search** and **Metadata Form** onto the canvas.
2. Connect **Metadata Profile Search → Metadata Form**.
3. Search AIMS for a suitable application profile. The tutorial in the
   presentation searches for `RO-kit`.
4. Select the intended result. Its SHACL-based form opens in **Metadata Form**.
5. Complete the required fields marked with an asterisk. Choose an appropriate
   licence rather than accepting an example without checking it.
6. Select **Save**. The status should change to **Metadata saved**. Saving
   serialises the form as RDF so that another node can use it.

### 5. Create and export an RO-Crate

An RO-Crate is a portable package for research data and its metadata. It is a
ZIP file with a standard JSON-LD catalogue that describes the dataset and the
files inside it. The package keeps data and documentation together and makes
their relationships machine-readable.

1. Drag **RO-Crate** onto the canvas.
2. Connect **Tabular file → RO-Crate** to include all workbook sheets as CSV
   files.
3. Connect **Column Descriptions → RO-Crate** and **Metadata Form → RO-Crate**
   to include both kinds of RDF metadata.
4. Check the triple count and the **Turtle Preview**. **Download Turtle** saves
   the combined RDF separately as `metadata.ttl` if you need to inspect or reuse
   it.
5. Select **Download RO-Crate** and save the generated ZIP.

The downloaded RO-Crate contains:

- `ro-crate-metadata.json`, the RO-Crate 1.3 JSON-LD catalogue;
- `metadata.ttl`, the connected column and dataset metadata; and
- one CSV per workbook sheet under `original_data/`.

The presentation shows a separate **RDF Store** node. In the current version,
its triple count, Turtle preview, and Turtle download are integrated directly
into **RO-Crate**, so no RDF Store node is needed.

#### Optional export settings

To control the ZIP filename and basic crate description, add a worksheet named
`export_config` with `key` and `value` columns. Supported keys are:

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

For example:

| key | value |
| --- | --- |
| dataset_id | drilling-run-07 |
| dataset_title | Drilling machine run 07 |
| dataset_description | Temperature and rotation measurements from run 07. |
| license | CC BY 4.0 |

`dataset_id` or `dataset_name` determines the ZIP filename. The title is taken
from `dataset_title`, `dataset_label`, or `title`, in that order. Without these
settings, safe defaults are used. The `export_config` sheet is also included as
a CSV in the package.

## Export to RWTH Coscine

Coscine is RWTH Aachen University's research data management platform. It
organises research data in projects and resources, applies metadata application
profiles, controls access, and supports sharing and preservation workflows.
TabularRDM can use a Coscine resource's profile to create the correct metadata
form and can upload the generated RO-Crate to that resource.

Before starting, you need a Coscine account, an API token, and write access to a
project resource. Create the project and resource in Coscine first. Treat the
token like a password: do not share it, include it in screenshots, or commit it
to this repository.

![A TabularRDM workflow connected to Coscine](screen2.png)

To upload:

1. Drag **Coscine** and a new **Metadata Form** onto the canvas.
2. Connect **Coscine → Metadata Form**. This direction is important: Coscine
   supplies the selected resource's application profile to the form.
3. Connect **Metadata Form → RO-Crate**, then connect **RO-Crate → Coscine**.
   Keep **Tabular file → RO-Crate** connected as well. Together, these links
   form the upload workflow.
4. Paste the API token into **API token** and select **Load resources**. The
   token may be entered with or without the `Bearer ` prefix.
5. Select a writable entry from **Resource**. TabularRDM loads the metadata form
   associated with that resource.
6. Fill every required field in the connected Metadata Form and select
   **Save**. Wait for the Coscine node to report that the form is loaded and the
   metadata is ready.
7. Select **Upload RO-Crate**. TabularRDM builds the ZIP, writes the saved
   metadata for that file, and uploads it to the selected Coscine resource. A
   successful status message shows the uploaded ZIP filename.

Nothing is sent to Coscine until **Upload RO-Crate** is selected. If the button
is disabled, check that a token and resource are selected, the RO-Crate is
connected and has RDF content, and the Coscine-generated Metadata Form has been
saved.

## Troubleshooting

- **The wrong row is used as headers:** clean the source so that row 1 contains
  only column names, or adjust **First row contains headers**.
- **Rows and columns are reversed:** try **Rotate rows into columns**, or create
  a tidy copy of the source file.
- **A CSV appears as one column:** resave it as an XLSX file or a UTF-8,
  comma-separated CSV.
- **Accented characters look wrong:** resave the CSV with UTF-8 encoding.
- **A workbook cannot be read:** remove password protection and save a fresh
  XLSX copy.
- **Quantity kinds, units, profiles, or Coscine resources do not load:** check
  the internet connection, institutional VPN, and proxy settings.
- **The Windows program is blocked:** verify the institutional checksum, try
  the portable version from a writable folder, or contact IT support.

When requesting support, include the TabularRDM version, operating system, file
type, the step that failed, and a screenshot without confidential data or API
tokens.

## Developer notes

Build and serve the production web bundle with:

```sh
npm run build
npm run serve
```

Open <http://localhost:4173/>. To build the bundle and run the Electron desktop
application during development, use `npm run desktop`.

On a Windows build machine, create the installer and portable release with:

```sh
npm ci
npm run dist:windows
```

Artifacts are written to `release/`. Public executables should be signed with
the institution's Windows code-signing certificate and tested on clean Windows
10 and Windows 11 systems using a non-administrator account.

The main implementation is in `src/App.jsx`; node components are in
`src/nodes/`, and export/API code is in `src/services/`. `server.js` serves the
production bundle and provides loopback-only proxies for QUDT, AIMS, and
Coscine. A Vite warning about chunks larger than 500 kB is expected because the
spreadsheet, RDF, RO-Crate, and ZIP libraries are sizeable; it is not a build
failure.

<p align="right">
  <img src="src/assets/nfdi4ing_24.svg" alt="NFDI4Ing" width="220">
</p>
