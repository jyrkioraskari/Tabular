# Tutorial: describe columns semantically

## Outcome

You will turn an ambiguous header such as `temp` into a column description
with a human-readable explanation, a reusable semantic concept, and a
machine-readable unit.

## Before you begin

Load a table and connect **Tabular file → Column Descriptions**. Confirm that
the expected headers appear.

## 1. Write a useful description

Describe what the value represents in this dataset. Prefer:

> Ambient air temperature measured at the inlet sensor.

over:

> Temperature column.

The first version gives a future reader context that is not present in the
header.

## 2. Add a terminology concept

1. Add **Terminology Service** to the canvas.
2. Search for the scientific concept represented by the field.
3. Review the result's label, definition, source ontology, and persistent IRI.
4. Drag the best result into the column's description field.

Alternatively, connect **Terminology Service → Column Descriptions**. Each
description field then searches concepts while you type; choose a suggestion to
store its persistent IRI without dragging. Your typed description is preserved.
<<<<<<< HEAD
Dragging still works. To compare glossary suggestions, enter a nonblank
description and choose **Review** beside the column. The review shows the
original header, description, unit, sample values, and candidate definitions.
Choose **Accept** to record a candidate's identifier. You can also leave the
column unresolved; inspecting alternatives does not change an accepted term.
For a header without a description, use the manual search or drag route.
=======
Dragging still works. Strong, unambiguous suggestions may be linked
automatically; other candidates remain in the review panel.
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571

Tabular displays the readable label and retains the IRI. Hover over the linked
value to inspect it. Choose a concept because its definition matches the data,
not merely because its label resembles the header.

## 3. Select a quantity and unit

1. Connect **Quantity Kinds → Units**.
2. Search Quantity Kinds for `temperature` or another measured property.
3. Select the intended quantity kind.
4. Drag the correct result from **Units** into the column's Unit field.

This copies the selected unit into that field. Alternatively, connect
**Units → Column Descriptions** to filter QUDT search by the selected quantity
kind. You can also type in the Unit field and search QUDT without that
<<<<<<< HEAD
connection. Dragging still works. A suggested unit can be accepted in the
column review.
=======
connection. Dragging still works. An explicit, unique unit may be filled
automatically.

An automatically applied value appears by name with **Change**. Choose
**Change** to edit or search for another value, or drag a replacement. Tabular
does not replace an existing value automatically after you edit it.
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571

The QUDT URI distinguishes units that may have similar names or symbols. Do not
add units to identifiers, categories, free text, or genuinely unitless values.

## 4. Check the result

Connect **Column Descriptions → RO-Crate**. Its Turtle preview should contain
the described column and, where selected, the concept and unit identifiers.
Column descriptions are updated automatically; they have no separate Save
button.

<<<<<<< HEAD
To restore accepted annotations when you reopen the same dataset in this
browser, enable **Remember column annotations in this browser**. The exported
RO-Crate uses the accepted identifiers and original spreadsheet values.

=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
## How Tabular represents columns

Tabular uses established vocabularies rather than a private column ontology:

- **W3C CSVW `propertyUrl`** represents the semantic property expressed by a
  column, independently of its unit;
- **Dublin Core Terms** represents textual descriptions; and
- **SDMX `unitMeasure`** links the column to a controlled **QUDT** unit resource,
  following the CSVW Primer's fixed-unit-per-column pattern.

This RDF is complementary to the dataset metadata saved from Metadata Form.
For the broader distinction, read [Why Tabular](why-tabular.md).

---

[Documentation guide](README.md) · [Column annotation developer guide](column-annotation-developer-guide.md) · [Next: Data and RO-Crate](data-and-ro-crate.md)
