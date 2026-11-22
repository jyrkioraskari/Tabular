# Tutorial: prepare data and understand the RO-Crate

## Outcome

You will prepare a predictable input table, decide whether its rows should
also become RDF, and understand the files produced by RO-Crate.

## 1. Make the table predictable

A reusable research table normally has:

- one observation, measurement, or record per row;
- one variable per column;
- one header row with unique, non-empty column names;
- consistent value types within a column; and
- documented units, codes, abbreviations, and missing-value conventions.

Avoid decorative title rows, merged cells, subtotals, and unrelated tables in
the data area. Preserve identifiers such as `00123` as text, use unambiguous
dates such as `2026-08-25`, and save CSV files as UTF-8 when possible.

Tabular accepts CSV, TSV, TXT, XLS, XLSX, XLSM, XLSB, ODS, and HTML tables. It
reads workbook values and does not execute Excel macros. You can select a file
or drop it onto the Tabular file node.

Metadata Form and Column Descriptions each offer a **Remember ... in this
browser** checkbox. The saved data restores in a later browser session; column
annotations restore only for matching headers. Unchecking removes the saved
data from browser storage, while leaving the current values visible. **Delete
saved browser copy** does the same. Exporting or uploading still uses the
current workflow data when you choose those actions.

## 2. Check the import options

After selecting the file, Tabular looks for column headers, sideways parameter
tables, and measurement settings before the data. It may select a later data
sheet when a workbook begins with a report. Check the preview, then:

- change **Table has column headers** if the detection is wrong; clearing it
  generates `Column 1`, `Column 2`, and similar names; or
- open **Advanced options** to correct the rotation when field names run down
  the first column.

Measurement settings and layered header details are preserved in separate
export sheets when Tabular separates them from the data table.

Rotation stops at the first empty row or change in populated column count. For
a heavily formatted report, make a clean data copy in Excel or LibreOffice
instead of relying on rotation.

## 3. Decide whether to convert rows to RDF

Enable **Convert tabular data to RDF (CSVW)** when downstream users need an RDF
representation of every row and value. Tabular uses the W3C CSV on the Web
table-and-row model and includes the generated Turtle in connected RO-Crates.

Leave this option disabled when the CSV files are the intended data format and
only their metadata needs to be RDF. The conversion is optional because large
tables can produce substantially larger RDF metadata.

## 4. Connect the complete package

For a local export, connect:

- **Tabular file → RO-Crate** for the worksheets;
- **Column Descriptions → RO-Crate** for field metadata; and
- **Metadata Form → RO-Crate** for dataset metadata.

<<<<<<< HEAD
The preview and column-description nodes use the detected measurement worksheet.
Every
=======
The preview and column-description nodes use the first worksheet. Every
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
worksheet is retained and exported as CSV under `original_data/`. When layered
headers are flattened, their generated `*-header-details.csv` companion is
placed under `original_data/extras/`. Formulas, formatting, macros, charts, and
other workbook features are not preserved in those CSV files.

## 5. Inspect the result

The RO-Crate node reports its RDF triple count and shows a Turtle preview.
Choose **Download Turtle** to inspect `metadata.ttl` separately, or
**Download RO-Crate** for the full ZIP.

The ZIP contains:

- `ro-crate-metadata.json`, the RO-Crate 1.3 JSON-LD catalogue;
- `metadata.ttl`, containing connected metadata and optional row RDF;
- one CSV per worksheet under `original_data/`;
- one discoverable CSVW document beside each CSV, named
  `<file>.csv-metadata.json`. It records the exact headers, string datatypes,
  connected descriptions, semantic property URLs, and SDMX `unitMeasure`
  links to selected QUDT units;
- generated layered-header details, without redundant CSVW sidecars, under
  `original_data/extras/`; and
- for Excel inputs, the unchanged source workbook under `original_data/source/`.
  Each derived CSV links back to this workbook in the RO-Crate catalogue.

## Optional: configure the export

<<<<<<< HEAD
Before downloading or uploading, choose the dataset licence in the RO-Crate
node. If you cannot make a licence claim, choose **Unspecified**; the package
then omits its licence property. An `export_config` licence takes precedence and
is shown in the node. Do not select CC BY 4.0 unless you have the rights to
release the dataset under that licence.

=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
Add an `export_config` worksheet with `key` and `value` columns:

| key | value |
| --- | --- |
| dataset_id | drilling-run-07 |
| dataset_title | Drilling machine run 07 |
| dataset_description | Temperature and rotation measurements from run 07. |
| license | CC BY 4.0 |

Recognised keys are `dataset_id`, `dataset_name`, `dataset_title`,
`dataset_label`, `title`, `dataset_description`, `description`, and `license`.
The dataset identifier or name determines the ZIP filename. The
`export_config` worksheet is also included as a CSV.
<<<<<<< HEAD
The CSVW descriptions and units follow the measurement sheet shown in the
preview, including when a report sheet appears first in the workbook.
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571

---

[Documentation guide](README.md) · [Next: Deposit in Coscine](coscine.md)
