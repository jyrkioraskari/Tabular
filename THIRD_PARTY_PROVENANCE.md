# Third-party source provenance

This inventory records sources identifiable from repository notices and asset
headers. It distinguishes imported assets from Tabular's own integration code.
Revisions were not recorded when these assets were added; they must not be
invented. See `THIRD_PARTY_LICENSES.md` for credits carried in desktop builds.

| Upstream source | Revision and source file | Destination | Use and credit |
| --- | --- | --- | --- |
| [QUDT](https://www.qudt.org/pages/HomePage.html) | Revision unknown; [GitHub avatar](https://avatars.githubusercontent.com/u/3856096?v=4) | `src/assets/qudt-avatar.jpg` | Quantity and unit icon; QUDT credit in `THIRD_PARTY_LICENSES.md`. Vocabulary data is loaded from QUDT at runtime, not copied into this repository. |
| [Coscine frontend](https://git.rwth-aachen.de/coscine/frontend/apps/ui/) | Revision unknown; `src/assets/svg/coscine_rgb.svg` upstream | `src/assets/coscine_rgb.svg` | Coscine icon; RWTH Aachen University copyright and MIT notice in `THIRD_PARTY_LICENSES.md`. |
| [Openclipart Matt icons](https://openclipart.org/) | Revision unknown; spreadsheet icon from the Matt icon theme by sixsixfive | `src/assets/matt-icons_text-x-office-generic-spreadsheet.svg` | Spreadsheet icon; original CC0 source header remains in the SVG and is noted in `THIRD_PARTY_LICENSES.md`. |
| [Openclipart form icon](https://openclipart.org/detail/26952/architetto----formulario-by-anonymous) | OCAL 0.18; “Architetto -- Formulario” | `src/assets/Architetto_--_Formulario.svg` | Form icon; original metadata credits Francesco Rollandin and the listed creator, Anonymous. The source metadata remains in the SVG and is noted in `THIRD_PARTY_LICENSES.md`. |

## Source records requiring maintainer review

The repository does not contain enough source and licence records to establish
the origin of `src/assets/250px-Rdf_logo.svg.png`, `RO-Crate.png`, `aims.png`,
`tabular-file-icon.png`, `tabular_schema.png`, `nfdi4ing_24.svg`, or
`rwth_caad_en_schwarz_grau_rgb.svg`. Their origin and distribution terms need
confirmation before a public release. `src/assets/python-logo.svg` appears to
be a locally drawn Python-themed icon, but its authorship should also be
confirmed. No upstream code was copied or adapted for the changes that created
this inventory.

The existing Coscine attribution lists MIT, but the upstream GitLab licence
page was unavailable during this review. A maintainer should verify its current
licence and the icon's source revision against the upstream project.
