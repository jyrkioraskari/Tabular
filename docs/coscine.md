# Tutorial: deposit an RO-Crate in Coscine

## Outcome

You will load a Coscine resource's metadata requirements, complete its form,
and upload the prepared RO-Crate.

## Before you begin

You need:

- a Coscine account;
- a project and resource with an application profile;
- write permission for that resource; and
- a Coscine API token.

Treat the token like a password. Do not share it, include it in screenshots,
or commit it to a repository.

### Get an API token

1. Sign in to Coscine and open **Your Name → User Profile**.
2. Open the **Access Token** section.
3. Enter a token name and expiration date, then select **Create Access Token**.
4. Copy the token before closing the message. Coscine displays it only once.

See the official [Coscine access-token instructions](https://docs.coscine.de/en/token/)
for screenshots and token-revocation guidance.

## 1. Add Coscine to the package

Drag **Coscine** onto the canvas and connect **RO-Crate → Coscine**.

Tabular automatically connects Coscine to the Metadata Form already associated
with that RO-Crate. If no form exists, Tabular creates and connects one. This
ensures that repository requirements remain part of the same workflow.

Two direct links serve different directions: **Coscine → Metadata Form** loads
the resource profile, while **Metadata Form → Coscine** sends the saved RDF
metadata required for the upload. Metadata Form can also remain connected to
RO-Crate so the description is included in the downloaded package.

## 2. Choose the destination resource

1. Enter the API token, with or without the `Bearer ` prefix.
2. On a trusted device, optionally select **Remember token in this browser**.
3. Wait while the available resources load automatically.
4. Select a writable project and resource.

When selected, the checkbox stores the token in browser-local storage and
restores it when Tabular is opened again in that browser. Clearing the checkbox
immediately removes the stored token. The token remains in the current input
until you clear it or close the application.

Coscine supplies that resource's application profile to the connected
Metadata Form.

## 3. Understand profile priority

A Metadata Profile Search connection may already supply an AIMS profile. Once
Coscine supplies the same form, the AIMS connection turns red and is marked
inactive: the repository's requirements take priority.

The Coscine-to-form connection cannot be removed while Coscine remains
connected to the RO-Crate. If you try, Tabular warns you and keeps it. To
return to an independently selected AIMS profile, disconnect **RO-Crate →
Coscine** first, then remove the Coscine form connection.

## 4. Complete and save the metadata

Fill every required field in Metadata Form. Valid metadata is passed on
automatically; there is no separate save step.

If the form changes after selecting a different Coscine resource, review and
save it again. Requirements can differ between resources.

## 5. Upload

When Coscine reports that the RO-Crate and metadata are ready, choose
**Upload RO-Crate**. Tabular builds the ZIP and uploads it to the selected
resource. Nothing is transferred before this action.

If the upload button is disabled, check that:

- an API token and writable resource are selected;
- RO-Crate is connected and contains RDF; and
- the Coscine-provided Metadata Form has been completed and saved.

## Data flow to remember

```text
RO-Crate ───────────────────────> Coscine
Metadata Form ── saved metadata ─> Coscine
Metadata Form <─ resource profile ─ Coscine
```

---

[Documentation guide](README.md) · [Troubleshooting](troubleshooting.md)
