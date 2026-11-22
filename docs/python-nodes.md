# Write node behavior in Python

## Outcome

You will be able to add a **Python script** node and write a small Python
function that reads the outputs of connected nodes.

## How Python nodes run

Tabular's browser view is sandboxed, so Python never runs in the page. The
desktop app, `npm run serve`, and `npm run dev` each expose a loopback-only
local endpoint, and the node sends its code to `POST /python-node/run`. The server starts an isolated
`python3 -I` subprocess, passes a JSON envelope on standard input, and returns
the JSON the script prints. Requests are guarded by a custom header and a
loopback host check, and are limited in body size, code size, output size, and
runtime (default 10 s, maximum 30 s).

Requirements and limits:

- Python 3 must be installed and on the `PATH` (`python3`, `python`, or `py`),
  or set `TABULAR_PYTHON_BIN` to its path. Without Python the node reports that
  Python 3 was not found.
- The local Python endpoint starts with the app in desktop, standalone server,
  and Vite development sessions.
- The code runs with your local user's privileges. Only run code you wrote or
  reviewed yourself.

## Write the script

1. Drag **Python script** from the sidebar onto the canvas.
2. Connect any upstream node to it (a connection label reads **python input**).
3. Edit the code. It must define:

   ```python
   def run(inputs, data):
       ...
       return ...  # any JSON-serializable value
   ```

   - `inputs` maps each connected source node's label to a JSON-safe excerpt of
     its data — for a Tabular file node that is the file name, headers, and
     preview rows; for Column Descriptions the fields and serialized RDF; for a
     Metadata Form the profile name and serialized RDF; for an RO-Crate the
     JSON-LD content.
   - `data` holds the node's own settings (its label and interface language).
   - The return value becomes the node's output. It is shown in the node,
     stored in the node data, and can be downloaded as JSON. `NaN` and
     `Infinity` are rejected because they are not valid JSON.

4. Choose **Run**, or wait — trusted nodes re-run automatically about half a
   second after the code or a connected input changes. Syntax errors, runtime
   exceptions, and timeouts are shown on the node.

Example — count described columns:

```python
def run(inputs, data):
    total = 0
    described = 0
    for payload in inputs.values():
        for field in payload.get("fields", []):
            total += 1
            if field.get("description") or field.get("descriptionUri"):
                described += 1
    return {"total": total, "described": described}
```

## Share and reuse safely

- **Export** includes the script text, because it is text you entered. The
  exported file still never contains loaded spreadsheet data.
- **Import** never runs Python code automatically: imported Python script nodes
  arrive disabled with a *Trust and run this code* button. Only choose it for
  code you have reviewed.

---

[Documentation guide](README.md) · [Use the visual workflow](interface.md)
