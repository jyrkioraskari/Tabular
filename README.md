# TabularRDM

TabularRDM helps you turn a CSV or spreadsheet into a documented research
dataset. Load your table, explain its columns, add metadata, and download a
portable RO-Crate ZIP—all on a visual canvas.

Research data management means keeping data organised, understandable, safe,
and reusable throughout a research project. TabularRDM makes a useful first
step easy: it keeps your tabular data together with information about what the
dataset and its columns mean.

![The TabularRDM workflow canvas](screen.png)

## Start the application

### Windows

Download `TabularRDM-1.0.0-x64-Portable.exe` from the location supplied by your
course or institution and double-click it. The portable application needs no
installation and normally needs no administrator rights.

### Linux, macOS, or source installation

Install Node.js 18 or newer, open a terminal in this repository, and run:

```sh
npm install
npm run dev
```

Open <http://localhost:5173/> in your browser.

## Your first RO-Crate in a few minutes

The starting canvas already contains the nodes and connections needed for a
basic export. A node receives data on its left handle and sends data from its
right handle. If you accidentally remove a connection, restore it by dragging
from the right handle of the first node to the left handle of the second.

### 1. Choose a table

In **Tabular file**, select **Select tabular file** and choose a CSV or Excel
file. A good source has one header row, one variable per column, and one record
per row.

The **Preview Tabular Data** node immediately shows the headers and first five
rows. Scroll inside it to see more columns. If the first row contains data
rather than headers, clear **First row contains headers**.

### 2. Explain the columns

The headers appear automatically in **Column Descriptions**. Add a short,
specific description beside each one. For example:

- `machine_id`: “Unique identifier of the drilling machine”
- `elapsed_time_s`: “Seconds elapsed since the measurement started”
- `air_temperature`: “Ambient air temperature at the sensor”

Descriptions are saved as machine-readable RDF automatically.

### 3. Add units where helpful

In **Quantity Kinds**, search for a type of measurement such as `temperature`
and select **Celsius temperature**. The connected **Units** node will show
matching units. Drag **Degree Celsius** into the Unit field beside the relevant
column description.

Leave the unit empty for identifiers, categories, and values that genuinely
have no unit.

### 4. Describe the dataset

Complete the required fields in **Metadata Form**, such as the dataset name,
description, licence, and issue date. Select **Save** and check that the node
reports **Metadata saved**.

This information describes the dataset as a whole; the earlier column
descriptions explain the individual variables.

### 5. Download the result

The connected **RO-Crate** node collects the table, column descriptions, and
dataset metadata. Check that it reports RDF triples, then select
**Download RO-Crate**.

The downloaded ZIP is an RO-Crate: a standard package containing your data and
a machine-readable catalogue of its contents. Keep the ZIP intact when sharing
or archiving it. You can also select **Download Turtle** if you want the RDF
metadata as a separate `metadata.ttl` file.

That is the complete basic workflow:

```text
Tabular file ──┬──> Preview Tabular Data
               ├──> Column Descriptions ──┐
               └───────────────────────────┼──> RO-Crate ZIP
Metadata Form ─────────────────────────────┘
```

## Send the result to RWTH Coscine

Coscine is RWTH Aachen University's platform for managing, describing, sharing,
and preserving research data. If you already have a Coscine project, writable
resource, and API token, TabularRDM can upload the RO-Crate directly.

Add **Coscine** and a new **Metadata Form** to the canvas, then connect:

```text
Coscine ──> Metadata Form ──> RO-Crate ──> Coscine
```

Enter the token, select **Load resources**, choose the destination resource,
complete and save its metadata form, and select **Upload RO-Crate**. Nothing is
uploaded until you select that button.

![A TabularRDM workflow connected to Coscine](screen2.png)

## Want to go further?

See [Advanced topics](ADVANCED_TOPICS.md) for:

- [preparing difficult CSV and spreadsheet files](ADVANCED_TOPICS.md#preparing-tabular-data);
- [all interface controls and saved layouts](ADVANCED_TOPICS.md#interface-reference);
- [metadata profiles, QUDT units, and RDF](ADVANCED_TOPICS.md#metadata-units-and-rdf);
- [RO-Crate contents and custom export settings](ADVANCED_TOPICS.md#ro-crate-details-and-export-settings);
- [the complete Coscine workflow](ADVANCED_TOPICS.md#rwth-coscine-in-detail);
- [privacy, security, and troubleshooting](ADVANCED_TOPICS.md#privacy-security-and-troubleshooting); and
- [developer, build, and release instructions](ADVANCED_TOPICS.md#developer-notes).

Each node also has an `i` button with short instructions for that part of the
workflow.

<p align="right">
  <img src="src/assets/nfdi4ing_24.svg" alt="NFDI4Ing" width="220">
</p>
