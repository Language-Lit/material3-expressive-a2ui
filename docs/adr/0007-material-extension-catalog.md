# ADR 0007: A package-owned Material extension catalog

Status: accepted
Date: 2026-09-12

## Context

The basic catalog cannot express several components the peer already ships.
The owner approved a Material extension catalog, continuing the assessment
in session 6374035a. The basic and minimal catalog IDs belong to A2UI and
must continue to describe their own component sets. The package also
retains its two public paths, zero runtime dependencies and render-only
component contract.

## Decision

Export `MATERIAL_CATALOG_ID`, `material3ExtendedCatalog`,
`material3ExtendedComponents` and the nine new implementation objects from
the existing root entry. The extension ID is
`https://m3e.language-lit.com/a2ui/catalogs/material3/catalog.json`.
`material3ExtendedComponents` contains only the additions; the catalog
contains these plus every basic component and guarded basic function.
`material3Catalogs` registers basic, minimal and Material in that order.
Hosts can pass an explicit catalog list to limit what they advertise.

The URL is an identifier, not a new package export or a network dependency.
An agent needs the inline catalog from
`getClientCapabilities({ includeInlineCatalogs: true })` to learn the new
components. Hosting that JSON on the documentation site is a separate task.
No claim is made that the URL currently serves the schema.

The first extension exposes useful modes with a small property surface;
it does not mirror every styling or interaction prop in the peer. All
components accept the standard `weight` and `accessibility` properties.
Text is plain React text. Dynamic scalar fields support literals, paths
and function calls through web_core. Options reuse the basic ChoicePicker
schema, including dynamic option labels and static string values.

| Component | Properties and behavior |
| --- | --- |
| Switch | Required `label`, boolean `value`; native labelled switch with two-way value. |
| Select | Required `label`, string `value`, `options`; outlined single-selection select. |
| IconButton | Required `label`, `icon`, `action`; momentary standard icon button. Embedded names use the existing glyph resolver; unknown names have the existing host-font fallback. |
| Chip | Required `label`; optional boolean `value` declares a filter chip, otherwise an assist chip; optional `action` runs after selection is written. Mode follows the declared property even before bound data arrives. |
| ListItem | Required `headline`; optional `overline`, `supportingText`, `action`. Passive row without action, whole-row native button with action. Text-only slots avoid nested interactive content. |
| Progress | Required `label`; optional `value`, `max` (default 1), `circular` (default false). Missing/non-numeric resolved value is indeterminate; finite values clamp to `[0, max]`, invalid max falls back to 1. |
| Carousel | Required `children` (`ChildList`); hero layout, 240px height, full available width. Explicit children and data templates share the standard child-scope contract. The peer owns sizing, masks and scrolling. |
| SegmentedButtons | Required `label`, `options`, string-list `value`; optional `multiple` (default false). Single mode displays the first entry and writes a one-entry list; multiple mode writes all selected values. |
| Tooltip | Required `child`, `text`; plain tooltip anchored to the first native control inside the child. The child must contain one meaningful focusable control with its own label. |

Switch, Select, IconButton, Chip, ListItem and SegmentedButtons support
`checks` and a dynamic `disabled` property. Inputs show associated errors
after interaction or blur; action controls are disabled for failed checks.
Generated setters own data writes. Literal values use the existing local
mirror hook and remain editable.

Schemas are composed from web_core's public primitives and basic APIs;
there is no direct zod import, schema loader copy or alternative binder.
`REF:` descriptions are retained so inline capabilities advertise canonical
protocol types, including child references. Each implementation uses
`createMaterial3Component`, including the existing action-activation wrapper.

Tooltip is the one DOM integration: `buildChild` intentionally exposes no
ref, while the peer Tooltip requires a native anchor. A MutationObserver
on the package-owned wrapper finds the native control and tracks streamed
replacement. The peer attaches its own listeners and description. No role,
tab index, synthesized activation or private selector is added.

## Consequences

- Agents can request all nine additions under the Material ID without
  confusing them with A2UI's own basic catalog.
- Default capabilities gain a third catalog. Hosts using predeclared IDs
  alone must supply the Material schema to their agent separately.
- Peer variants outside the table, rich tooltips, selectable list rows,
  carousel layout tuning and icon-button toggle modes remain future
  extensions; agents cannot pass undocumented peer props through.
- The package-authored example and protocol tests cover the new contract;
  upstream fixtures remain verbatim. Browser checks cover real peer layout
  and focus behavior that jsdom cannot prove.
