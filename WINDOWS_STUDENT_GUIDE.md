# Tabular for Windows

## Recommended start

1. Open the official
   [Tabular releases page](https://github.com/jyrkioraskari/TabularRDM/releases).
2. Download `TabularRDM-1.0.0-x64-Portable.exe`.
3. Put the file in a folder where you have write access, such as Documents.
4. Double-click the file to start **Tabular**.

The portable application needs no installation, and administrator rights are
normally not required.

## Microsoft SmartScreen

Use only the official releases page linked above. If Windows shows a SmartScreen
message, compare the published SHA-256 checksum before continuing. Contact the
course staff if the checksum differs or no checksum was published.

## Supported files

Tabular accepts CSV, TSV, text, XLS, XLSX, XLSM, XLSB, ODS, and HTML table
files. It reads workbook values but does not execute Excel macros.

For the most predictable import:

- Put column names in the first row of the first worksheet.
- Use a single header row with unique, non-empty names.
- Do not password-protect the workbook.
- Preserve identifiers such as `00123` as text in Excel.
- Save unusual reports as a clean XLSX file or UTF-8 CSV before importing.

At present, Tabular previews the first worksheet. Other worksheets are kept
for RO-Crate export but are not shown in the tabular preview.

## Troubleshooting

- **The program is blocked:** try the portable edition or contact your
  institution's IT support to allow-list Tabular.
- **Online searches do not work:** check the internet connection, VPN, or proxy.
  Local spreadsheet preview can still be used.
- **The wrong row appears as column names:** create a clean copy with one header
  row at the top of the first worksheet.
- **A CSV is split into one column:** open it in Excel or LibreOffice and save it
  as XLSX or UTF-8 comma-separated CSV.
- **Accented characters are incorrect:** resave the CSV using UTF-8 encoding.
- **The workbook cannot be opened:** remove password protection and save a fresh
  copy as XLSX.

When requesting support, include the Tabular version, Windows version, file
type, and a screenshot of the error. Do not send sensitive research data unless
your course staff explicitly provides an approved secure channel.
