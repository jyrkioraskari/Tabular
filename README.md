# Tabular

Tabular helps researchers turn familiar CSV and Excel files into documented,
shareable research outputs. Its visual workflow brings column annotation,
dataset metadata, RO-Crate packaging, and optional Coscine deposit into one
place.

![The Tabular workflow canvas](screen2.png)

## Start Tabular

### Windows

Download `TabularRDM-1.1.0-x64-Portable.exe` from the official
[Tabular releases page](https://github.com/jyrkioraskari/Tabular/releases)
and open it. The portable application normally needs neither installation nor
administrator rights.

### Run from source

Install Node.js 18 or newer, then run:

```sh
npm install
npm run dev
```

Open <http://localhost:5173/>.

## Tutorial: create your first RO-Crate

The starting canvas already contains a complete basic workflow. Connections
enter a node on the left and leave it on the right. Hover over an input handle
to see which node types it accepts.

### 1. Load and check the table

In **Tabular file**, choose **Select tabular file** and open a CSV or Excel
file, or drop the file onto the node. **Preview Tabular Data** shows its headers
and first rows.

The app detects likely column headers and rotates a table automatically when
parameter names run down the first column and numeric measurements run across
the rows. For files with measurement settings or several header rows before the
data, the preview starts at the data table and preserves the preceding details
as separate export sheets. In workbooks that start with a report sheet, the
preview can select a later measurement sheet.
Check the preview and use **Table has column headers** or **Advanced options**
to correct the interpretation when needed.

### 2. Explain the columns

In **Column Descriptions**, write a precise meaning for each field. For
example, describe `air_temperature` as “Ambient air temperature at the
sensor,” rather than repeating the header.

For reusable semantic annotations, drag a concept from **Terminology Service**
into a description field.

### 3. Add quantities and units

Search **Quantity Kinds** for a measurement type, select it, and inspect the
matching entries in **Units**. Drag the correct unit into the relevant column.
Leave identifiers and genuinely unitless values empty.

### 4. Describe the dataset

Complete **Metadata Form**, including every required field. Valid metadata
is passed on automatically.
This metadata describes the dataset as a whole; column descriptions explain
its individual fields.

To keep your work across browser sessions, enable **Remember typed metadata in
this browser** and **Remember column annotations in this browser** in their
respective nodes. These options save local browser copies only. Uncheck
**Remember column annotations in this browser** to delete that node copy and
its remembered choices. Metadata Form has its own delete control.

### 5. Download the package

The **RO-Crate** node combines the data and descriptions. When it reports
loaded RDF triples, choose **Download RO-Crate**.

```text
Tabular file ──┬──> Preview Tabular Data
               ├──> Column Descriptions ──┐
               └───────────────────────────┼──> RO-Crate ZIP
Metadata Form ─────────────────────────────┘
```

The ZIP contains the tabular data, RDF metadata, and a standard RO-Crate
catalogue. Keep it intact when sharing or archiving it.

## Optional: deposit in Coscine

Add a **Coscine** node and connect **RO-Crate → Coscine**. Tabular
automatically connects the matching Metadata Form—or creates one when needed—
so the selected Coscine resource can provide its metadata requirements.

Enter an API token, load and select a writable resource, complete and save the
resulting form, then choose **Upload RO-Crate**. Nothing is uploaded before
that final action.

![A Tabular workflow connected to Coscine](screen.png)

## Learn more

Use the [documentation guide](docs/README.md) to continue with short,
task-focused pages:

- [Why Tabular connects these services](docs/why-tabular.md)
- [Describe columns with terminology, quantities, and units](docs/semantic-columns.md)
- [Prepare data and understand the RO-Crate](docs/data-and-ro-crate.md)
- [Deposit an RO-Crate in Coscine](docs/coscine.md)
- [Use the canvas and connections](docs/interface.md)
- [Troubleshoot safely](docs/troubleshooting.md)
- [Develop and build Tabular](docs/development.md)
- [Understand and extend column annotations](docs/column-annotation-developer-guide.md)

Each workflow node also has an `i` button with instructions for that step.

<p align="right">
  <img src="src/assets/nfdi4ing_24.svg" alt="NFDI4Ing" width="220">
</p>
