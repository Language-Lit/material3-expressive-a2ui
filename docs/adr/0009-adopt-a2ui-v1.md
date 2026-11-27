# ADR 0009: Adopt A2UI v1.0 on `@a2ui/web_core` 0.16

Status: accepted
Date: 2026-11-27

## Context

When this package launched (`0.1.0`–`0.2.1`), `@a2ui/web_core` only exported
`./v0_9` and `./v0_9/basic_catalog`. The package therefore targeted A2UI
v0.9.1, patched three forward-compatible v1.0 properties onto the basic APIs
(ADR 0004), wrapped stock basic schemas to preserve canonical `REF:` metadata
(ADR 0008), and shipped the v0.9-only minimal catalog alongside basic and
Material.

Upstream `a2ui-project/a2ui` has since promoted A2UI v1.0 and published
`@a2ui/web_core@0.16.1` and `@a2ui/react@0.16.1` with first-class v1.0 entries
(`./v1_0` and `./catalogs/basic/v1`), native `Catalog.toJson()` /
`Catalog.fromJson()`, inline `createSurface` initialization, mixed-catalog
surfaces, `@accessibility` (`live`, `hidden`), `@index`, `null` data-model
deletion, and bidirectional renderer/agent function RPCs.

## Decision

Bump `@language-lit/material3-expressive-a2ui` to `0.3.0` and target **A2UI
v1.0** directly on `@a2ui/web_core` `^0.16.1`:

1. **Imports & dependencies.** Import from `@a2ui/web_core`,
   `@a2ui/web_core/v1_0`, and `@a2ui/web_core/catalogs/basic/v1`. Keep zero
   runtime dependencies, the exact `.` and `./styles.css` export map, and no
   direct `zod` or `@a2ui/react` imports in `src/`.
2. **Basic catalog.** Use stock `@a2ui/web_core/catalogs/basic/v1` APIs
   verbatim under `https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json`,
   retiring the ADR 0004 schema patches (`Video.posterUrl`, `TextField.placeholder`,
   `Slider.steps` are now stock) and the `src/internal/catalogSchemas.ts`
   wrapper from ADR 0008. Update `Text` for v1.0 (`variant: 'body' | 'caption'`
   with Markdown `#`–`######` headings) and `List` (no `listStyle`).
3. **Remove the v0.9-only minimal catalog.** Upstream A2UI v1.0 does not define
   a minimal catalog (`catalogs/minimal` exists only for `v0_9`). Remove
   `material3MinimalCatalog`, `material3MinimalComponents`,
   `MINIMAL_CATALOG_ID`, and `CapitalizeImplementation`. Default registration
   (`material3Catalogs`) is `[material3Catalog, material3ExtendedCatalog]`.
4. **Surface & adapter v1.0 features.**
   - Resolve component catalogs from `model.catalog ?? surface.defaultCatalog`
     and root from `surface.rootId ?? ROOT_COMPONENT_ID` so mixed-catalog
     surfaces and surfaces without a default `catalogId` work natively.
   - Render an `AccessibilityRegion` (`display: contents`) when
     `@accessibility` sets `live` or `hidden`, wiring `aria-live`,
     `aria-hidden`, and the DOM `inert` property.
   - Keep `OpenUrlImplementation`'s user-activation scope and
     `navigator.userActivation.isActive` check because `web_core`'s
     `GenericBinder` passes `{ userActivation: true }` unconditionally when
     binding actions.
5. **Hook v1.0 features.** Default `useA2ui` to `version: '1.0'`, validate
   batches against `AgentToRendererMessageSchema`, and expose
   `processMessagesAsync`, `callAgentFunction`, `getRendererCapabilities`,
   `getRendererDataModel`, `outboundListener`, `unifiedOutbound`,
   `validationConfig`, `defaultTimeoutMs`, and `onWarning` (retaining
   `getClientCapabilities` and `getClientDataModel` as convenience aliases).
6. **Material extension catalog.** Migrate all nine extension schemas to v1.0
   (`spec()`, `DynamicBooleanSchema`, v1.0 `common_types.json#/$defs/...`) and
   generate the standalone hosted v1.0 catalog document (`protocolVersion: "1.0"`,
   object-map `functions`, `$defs`) validated through `Catalog.fromJson(schema, '1.0')`.

## Consequences

- Consumers on A2UI v0.9 / v0.9.1 remain supported on the published `0.2.x`
  release line; `0.3.0` is a clean v1.0 release with no dual-version runtime
  duplication.
- ADR 0004 is superseded; all three properties are native v1.0 basic catalog
  fields.
- All 43 v1.0 basic catalog examples, 158 pinned upstream v1.0 conformance
  vectors, and `@a2ui/react@0.16.1` compatibility tests run against the real
  v1.0 `MessageProcessor`.
