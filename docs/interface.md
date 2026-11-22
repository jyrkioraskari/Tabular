# Use the visual workflow

## Outcome

You will be able to add nodes, identify compatible connections, and read the
flow.

## Add and connect nodes

<<<<<<< HEAD
Choose **Add** followed by a node name in the sidebar to place it near the
center of the visible canvas. You can also drag a node button to a specific
position. Entries in **My nodes** work the same way. Each node has:
=======
Drag a node button from the sidebar onto the canvas. Each node has:
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571

- an input handle on the left;
- an output handle on the right; and
- an `i` button for task-specific help.

Hover over an input handle to see which upstream node types it accepts. Drag
from a source's output to a compatible input to connect them. Nodes with no
supported incoming connections do not display an input handle. Output handles
similarly list compatible downstream nodes and are hidden when no node
connection is supported.

Dragging a terminology concept or unit into a Column Descriptions field is a
value copy, not a node connection. Connecting **Terminology Service** or
**Units** to a Column Descriptions node additionally enables type-to-search
suggestions in its description and unit fields.

<<<<<<< HEAD
The **Python script** node accepts a connection from any node and runs a
`run(inputs, data)` function you write, on the local machine. See
[Python nodes](python-nodes.md).

=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
Connection labels explain what moves through the workflow, such as **file**,
**column description**, **unit**, or **metadata**. Animated blue lines are
active data paths. A red dashed metadata-profile line is inactive because a
connected Coscine resource currently controls that form.

<<<<<<< HEAD
## Share workflows and reuse nodes

The sidebar's **Share and reuse** section exports the canvas as a plain JSON
file: **Export workflow as JSON** saves the whole canvas, and **Export
selection as JSON** saves only the selected nodes and the connections between
them (a single selected node exports as a reusable node). The exported file
contains node settings and any text you entered; it never contains the loaded
spreadsheet data. **Import JSON…** adds such a file back onto the canvas: node
ids are regenerated, unknown node types and unsupported connections are
skipped with a notice, and the usual data propagation runs afterwards.

The **My nodes** section below the palette stores configured nodes in this
browser's local storage. With exactly one node selected, **Save selected node
to My nodes** stores it under its label. Drag a saved entry onto the canvas to
recreate the node with its saved settings (the interface language is synced to
the current one). Hover an entry and choose × to remove it.

=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
## Follow the next-steps checklist

The checklist at the top of the canvas tracks the whole workflow: load a file,
describe the columns, complete the metadata form, prepare the RO-Crate, and
deposit it in Coscine when a Coscine node is present. The first unfinished step
is highlighted as the current action, and each step shows its progress, such as
**3 of 7 columns described**.

Choose a step to move the canvas to the node it refers to. Choosing an
unfinished step also marks it as done, for example when a step does not apply
to your task; choose it again to clear the mark. Steps complete on their own
once the workflow satisfies them. The checklist never changes the workflow
data; it only tracks progress.

## Arrange and inspect the canvas

- The starting workflow and each selected workflow are centered and fit into the canvas.
- Drag a node to move it.
- Drag empty canvas space to pan.
- Scroll or use the lower-left controls to zoom.
- Select a node or connection and press <kbd>Delete</kbd> or
  <kbd>Backspace</kbd> to remove it.
- Use the upper-right language buttons for English or German interface and
  vocabulary labels.

Some connections are protected while required by the workflow. In particular,
Coscine's profile and direct metadata connections cannot be removed while it
remains connected to an RO-Crate. Tabular explains how to unlock them if
removal is attempted.

## Design a workflow for the task

Begin with the smallest path that produces the intended result, then add
services only where they help:

- preview when the source needs inspection;
- terminology and QUDT when fields need semantic detail;
- Metadata Profile Search when a particular application profile is useful;
- Coscine when preparing a repository deposit; and
- optional CSVW row conversion when RDF data is required.

---

[Documentation guide](README.md) · [Quick start](../README.md)
<<<<<<< HEAD

=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
