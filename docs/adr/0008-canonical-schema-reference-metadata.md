# ADR 0008: Preserve canonical schema reference metadata

Status: accepted
Date: 2026-09-12

## Context

web_core creates inline catalogs by converting each component's zod schema to
JSON Schema and then replacing nodes whose descriptions start with `REF:` by
canonical references into `common_types.json`. A component-level `.describe()`
can replace that metadata on a dynamic schema. The JSON Schema converter then
de-duplicates the repeated dynamic schema with a local pointer, often choosing
`accessibility.label` as its target. web_core subsequently replaces the whole
accessibility subtree with `AccessibilityAttributes`, erasing the target, and
wraps the remaining properties in the component envelope. The result contains
dangling `#/properties/accessibility/...` references.

The generated Material catalog exposed this issue in basic dynamic fields and
in nested tab and choice-option labels. `Catalog.fromSchema` accepts the map
without resolving every pointer, so loader success alone did not establish a
valid deliverable.

## Decision

Package-owned component schema declarations preserve canonical reference
metadata for every dynamic field whose stock component description replaced
it. The implementation explicitly names the matching common-types definition,
including nested tab and option labels and the three forward-compatible
properties from ADR 0004. It reuses the original field schema and changes only
its description, retaining requiredness, defaults, strictness, array bounds,
unions, and parse behavior. The shared Material schema explicitly retains the
`AccessibilityAttributes` reference as well.

This behavior lives in component schema declarations and a small metadata
helper. `createMaterial3Component` remains a generic render adapter and does
not inspect or reinterpret host schemas. The hosted-catalog generator does not
infer a protocol type from a component or property name. It preserves the
inline catalog, absolutizes external protocol references, preserves already
valid document-local references, and rejects the output if any local JSON
Pointer cannot be resolved.

Tests compare the wrapped and original web_core schemas on valid and invalid
values, exercise a nested dynamic option through the real MessageProcessor and
renderer, inspect the source inline catalog for local references, validate all
hosted pointers, and compare the checked-in artifact byte-for-byte with a fresh
generation.

## Consequences

- Inline capabilities are independently valid before the hosted artifact is
  generated.
- Dynamic fields keep their canonical protocol meaning and their human
  descriptions without changing runtime validation or binding.
- A future web_core change that emits a new unresolved pointer fails catalog
  verification instead of publishing an invalid artifact.
- The artifact remains derived from the actual registered catalog and carries
  no hand-maintained component schema table.
