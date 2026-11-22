# Troubleshooting and safe use

Start with the symptom below, try the suggested check, and return to the
workflow after each change. Avoid changing several things at once.

## Import problems

- **The wrong row is used as headers:** inspect the preview and change
  **Table has column headers** if needed.
- **Rows and columns are reversed:** open **Advanced options** and enable
  **Rotate rows into columns**, or prepare a tidy copy of the table.
- **A CSV appears as one column:** resave it as XLSX or as a UTF-8,
  comma-separated CSV.
- **Accented characters look wrong:** resave the source as UTF-8.
- **A workbook cannot be read:** remove password protection and save a fresh
  XLSX copy.
- **Values such as `00123` lose leading zeroes:** format that source column as
  text before export.

## Metadata and connection problems

- **No headers reach Column Descriptions:** confirm
  **Tabular file → Column Descriptions** and inspect the file preview.
- **Units are not filtered:** connect **Quantity Kinds → Units**, then select a
  quantity kind.
- **Metadata is absent from RO-Crate:** save Metadata Form and confirm
  **Metadata Form → RO-Crate**.
- **Metadata Profile Search is red:** Coscine supplies the same form and its
  repository profile has priority. Disconnect Coscine from RO-Crate before
  switching back.
- **A Coscine form connection cannot be removed:** first disconnect
  **RO-Crate → Coscine**. The protected form connection can then be removed.

## Online-service and upload problems

- **Online lists do not load:** check the internet connection, institutional
  VPN, and proxy settings. Local table preview remains available.
- **Coscine rejects an upload:** confirm write access, the selected resource,
  its application profile, and whether the API token is still valid.
- **Upload remains disabled:** select a resource, connect a populated
  RO-Crate, and complete and save its Coscine Metadata Form.

## Privacy and security

Loading and previewing a local spreadsheet does not send it to QUDT, AIMS, or
Coscine. Terminology, QUDT, AIMS, and Coscine features require network access.
Research data is sent to Coscine only after **Upload RO-Crate** is selected.

Never expose a Coscine API token in screenshots, issue reports, saved source
files, or version control.

**Remember token in this browser** is optional. It stores the token in the
browser profile rather than encrypting it. Use it only on a trusted,
non-shared device. Clear the checkbox to remove the saved token immediately;
also clear site data if the browser profile itself may be compromised.

On Windows, obtain the portable executable from the official
[Tabular releases page](https://github.com/jyrkioraskari/TabularRDM/releases).
If Microsoft SmartScreen appears, compare the published SHA-256 checksum. Ask
course staff or IT support when no checksum is available or the values differ.

## Ask for help effectively

Include:

- the Tabular version and operating system;
- the input file type;
- the workflow step and visible status message;
- the smallest sequence that reproduces the problem; and
- a screenshot with confidential data and API tokens removed.

Do not send sensitive research data unless an approved secure support channel
has been provided.

---

[Documentation guide](README.md) · [Windows guide](../WINDOWS_STUDENT_GUIDE.md)
