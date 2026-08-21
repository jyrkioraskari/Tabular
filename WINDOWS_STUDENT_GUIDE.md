# TabularRDM for Windows

## Recommended installation

1. Download the TabularRDM installer provided by your course.
2. Double-click the downloaded file.
3. Choose **Install for me only** if Windows asks.
4. Start **TabularRDM** from the Start menu.

Administrator rights are not required. If software installation is disabled on
your computer, download the portable edition instead and run it from a folder
you can write to, such as Documents.

## Microsoft SmartScreen

Use only the download location supplied by your institution. If Windows shows a
SmartScreen message, compare the published SHA-256 checksum before continuing.
Contact the course staff if the checksum differs or no checksum was published.

## Supported files

TabularRDM accepts CSV, TSV, text, XLS, XLSX, XLSM, XLSB, ODS, and HTML table
files. It reads workbook values but does not execute Excel macros.

For the most predictable import:

- Put column names in the first row of the first worksheet.
- Use a single header row with unique, non-empty names.
- Do not password-protect the workbook.
- Preserve identifiers such as `00123` as text in Excel.
- Save unusual reports as a clean XLSX file or UTF-8 CSV before importing.

At present, TabularRDM previews the first worksheet. Other worksheets are kept
for RO-Crate export but are not shown in the tabular preview.

## Troubleshooting

- **The program is blocked:** try the portable edition or contact your
  institution's IT support to allow-list TabularRDM.
- **Online searches do not work:** check the internet connection, VPN, or proxy.
  Local spreadsheet preview can still be used.
- **The wrong row appears as column names:** create a clean copy with one header
  row at the top of the first worksheet.
- **A CSV is split into one column:** open it in Excel or LibreOffice and save it
  as XLSX or UTF-8 comma-separated CSV.
- **Accented characters are incorrect:** resave the CSV using UTF-8 encoding.
- **The workbook cannot be opened:** remove password protection and save a fresh
  copy as XLSX.

When requesting support, include the TabularRDM version, Windows version, file
type, and a screenshot of the error. Do not send sensitive research data unless
your course staff explicitly provides an approved secure channel.
