# Why Tabular?

Research data management is often experienced as extra administrative work
outside the research process. Adoption is easier when tools have a low entry
barrier, fit established practices, and do not require researchers to operate
several independent services for one task.

## Start with the formats researchers already use

Tabular research data is commonly stored and exchanged as Microsoft Excel
spreadsheets or CSV files. These formats are familiar and widely supported,
but a table alone rarely answers questions such as:

- What does each column mean?
- Which quantity is measured, and in which unit?
- Who produced the dataset, under which licence, and for what purpose?
- Which repository metadata fields must be completed before deposit?

Headers help people inspect a table, but they are not a reliable substitute
for explicit, machine-readable descriptions.

## Connect preparation and description

Tabular uses a configurable visual workflow to connect four activities:

```text
prepare data → annotate columns → describe the dataset → package or deposit
```

The workflow brings complementary research data management services together:

- the **NFDI4Ing Terminology Service** supplies reusable concepts for semantic
  column annotations;
- **QUDT** supplies controlled vocabularies for quantities and units;
- **AIMS Metadata Profile Services** supplies selectable dataset metadata
  profiles;
- **RO-Crate** packages research data with a structured catalogue; and
- **Coscine** supplies repository-specific metadata requirements and stores the
  completed research output.

Researchers can therefore describe and deposit data as part of preparation,
without navigating every service independently.

## Describe both fields and their context

Column and dataset metadata answer different questions and work best together.

| Level | Typical question | Tabular nodes |
| --- | --- | --- |
| Column | “What is `temp_c`, and what unit does it use?” | Column Descriptions, Terminology Service, Quantity Kinds, Units |
| Dataset | “What study produced this table, and how may it be reused?” | Metadata Profile Search, Metadata Form, Coscine |

At the column level, semantic concepts and QUDT identifiers make the intended
interpretation more explicit than a short header alone. At the dataset level,
an AIMS profile can define a suitable form. When Coscine is connected, the
target resource's own profile takes priority so the deposited metadata meets
that resource's requirements.

## Package the result once

RO-Crate provides the common package around the data and its descriptions.
The same prepared output can be downloaded locally or uploaded to Coscine.
This treats annotation, packaging, and deposit as parts of one process rather
than disconnected administrative tasks.

## Continue learning

- Follow [Describe columns](semantic-columns.md) to add semantic detail.
- Follow [Deposit in Coscine](coscine.md) to use repository requirements.
- Read [Data and RO-Crate](data-and-ro-crate.md) to inspect the result.

---

[Documentation guide](README.md) · [Quick start](../README.md)
