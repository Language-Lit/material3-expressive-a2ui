# Upstream tasks status

Historical implementation briefs for owning public repositories and their
current resolution status as of 2026-11-27.

## A2UI web_core v1 runtime — Resolved upstream

Owner: `a2ui-project/a2ui`, `renderers/web_core`.

Resolved in `@a2ui/web_core@0.16.1` (and `@a2ui/react@0.16.1`): `./v1_0` and
`./catalogs/basic/v1` public entries, `Catalog.toJson` / `Catalog.fromJson`,
inline `createSurface` initialization, mixed-catalog resolution, `@accessibility`
(`live`, `hidden`), `@index`, `null` deletion, and bidirectional RPCs
(`callRendererFunction` / `callAgentFunction`) are now shipped. This package
adopted them in `0.3.0` ([ADR 0009](adr/0009-adopt-a2ui-v1.md)).

## A2UI inline catalog exporter — Resolved upstream for v1.0

Owner: `a2ui-project/a2ui`, `renderers/web_core`.

Resolved in `@a2ui/web_core@0.16.1` for v1.0 catalogs via `Catalog.toJson()` and
`spec()` canonical `$ref` metadata. All local JSON Pointers (`#/$defs/Weight`,
`#/components/*`, `#/functions/*`) resolve within the emitted document, and
`scripts/generate-material-catalog.mjs` rebases `common_types.json#` to the
hosted v1.0 URL.

## Material 3 Expressive date/time picker — Implemented; 1.2 floor retained

Owner: `Language-Lit/material3-expressive`.

`DatePicker`, `DateRangePicker`, `TimePicker`, and `DateTimePicker` are shipped
in `1.3.0-rc.1`. This renderer detects and uses them when present while
retaining its token-styled native fallback for the `^1.2.0` peer floor.

## Documentation-site catalog hosting — Synced for v1.0

Owner: `Language-Lit/material3-expressive` (`site/`).

The documentation site copies `public/a2ui/catalogs/material3/catalog.json`
with commit and SHA-256 provenance and serves it at
`/a2ui/catalogs/material3/catalog.json`. Production deployment and updating the
community renderer listing on `a2ui.org/ecosystem/renderers/` remain owner
release actions.
