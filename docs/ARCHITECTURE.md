# Architecture

How an A2UI v1.0 message stream becomes Material 3 pixels, and why each seam
is where it is. The normative rules are in [SPEC.md](SPEC.md); this document
explains the implementation.

## The layers

```text
the host application                 fetch / A2A / WebSocket — not this package
      │
      │  AgentToRendererMessage[]    (createSurface, updateComponents, updateDataModel,
      │                               deleteSurface, callRendererFunction, agentFunctionResponse)
      ▼
@a2ui/web_core  MessageProcessor     validation, surfaces, data model, binding, functions, RPC, actions
      │
      │  SurfaceModel · ComponentContext · GenericBinder
      ▼
src/runtime/                         the React binding
      useA2ui.ts        one processor per component; surfaces as a store; async RPC bridge
      A2uiSurface.tsx   walks a surface: mixed-catalog lookup, per-component subscriptions, placeholders
      adapter.tsx       createMaterial3Component: binder -> useSyncExternalStore -> AccessibilityRegion -> props
      ▼
src/catalog/ + src/components/       the Material 3 v1.0 basic and extension catalogs
      ▼
@language-lit/material3-expressive   Text, Icon, Card, Button, TextField, Checkbox, Chip, Slider, Tabs, Dialog, …
```

Each arrow crosses exactly one concern. `web_core` knows nothing about React;
the runtime knows `web_core` and React but no Material component; the catalog
components know Material and their own schema but nothing about surfaces or
transport.

## Reading a stream

**`web_core` owns the protocol.** `MessageProcessor` validates each message
against the v1.0 schemas, creates or deletes surfaces in its
`SurfaceGroupModel` (including single-message `createSurface` with inline
`components` and `dataModel`), upserts components into a surface's
`componentsModel`, merges or deletes (`value: null`) entries in `dataModel`,
and routes bidirectional RPCs (`callRendererFunction`, `callAgentFunction`).
It resolves every binding: `{ "@path" }` reads the data model,
`{ "@call", "args" }` runs a catalog or system (`@index`) function, `@checks`
produce `isValid`, `validationErrors`, and `validationResults`, and a
`ChildList` template expands one child per data item.

**The hook wraps the processor.** `useA2ui` creates a `MessageProcessor` once
per mounted component with `version: '1.0'`, the default catalogs
(`material3Catalogs`), an action handler that forwards to the latest
`onAction`, and optional `outboundListener` / `unifiedOutbound` wiring.
Surfaces are exposed through a small store shaped for `useSyncExternalStore`.
On unmount the hook clears every surface (without disposing the processor) so a
React `StrictMode` mount–unmount–mount sequence starts clean.

The functions the hook returns (`processMessages`, `processMessagesAsync`,
`callAgentFunction`, `getRendererCapabilities`, `getRendererDataModel`,
`getClientCapabilities`, `getClientDataModel`, `clear`) are referentially
stable. The returned object is not — it carries the current `surfaces` array —
so effects should depend on the functions rather than the whole object.

`processMessages` and `processMessagesAsync` copy their input with
`structuredClone` and validate every envelope against
`AgentToRendererMessageSchema` before handing it to `web_core`, so invalid
batches cannot partially mutate processor state and replayed transcripts are
never mutated by user edits.

## Rendering a surface

`A2uiSurface` renders one `SurfaceModel`, starting at `surface.rootId ?? 'root'`.

- **`DeferredChild`** looks a component id up in the surface's
  `componentsModel` through `useSyncExternalStore` over `onCreated` and
  `onDeleted`, filtered to that id. While the model has no such component it
  renders a placeholder (`aria-busy`, respecting reduced motion).
- **`ResolvedChild`** creates a `ComponentContext(surface, id, basePath)`,
  resolves the component's catalog via `model.catalog ?? surface.defaultCatalog`
  (supporting mixed catalogs and surfaces with no default `catalogId`), and
  renders the implementation's `render` with `context` and `buildChild`. A type
  lacking an implementation renders `UnknownComponent` and dispatches
  `UNKNOWN_COMPONENT` once per mount.
- `basePath` scopes every relative `{ "@path" }` and `@index` expression inside
  a `ChildList` template; template children are keyed by `id@basePath`.

## Binding a component

`createMaterial3Component(api, Render)` is the adapter:

1. The returned implementation is `{ name, schema, render: Host }`, carrying
   optional `allowedParents`, `allowedChildren`, and `metadata` from `api`.
2. `Host` owns a `GenericBinder(context, schema)` in a ref and subscribes via
   `useSyncExternalStore(binder.subscribe, () => binder.snapshot)`.
3. Each action closure in the snapshot (identified by parsing the raw property
   against v1.0 `ActionSchema`) is wrapped in the user-activation scope
   (`src/internal/activation.ts`); generated setters are not. The guarded
   `openUrl` checks `navigator.userActivation.isActive` in addition to
   `web_core`'s own `requiresUserActivation: true` gate
   ([ADR 0005](adr/0005-user-initiated-open-url.md)).
4. When resolved `@accessibility` sets `live` or `hidden`, `Host` wraps
   `Render` in an `AccessibilityRegion` (`<div className="m3e-a2ui-a11y">`)
   with `display: contents`, `aria-live`, `aria-hidden`, and DOM `inert`.
5. `Render` is wrapped in `memo`, keeping it a plain presentational component
   compatible with `@a2ui/react` and CopilotKit
   ([ADR 0002](adr/0002-render-only-implementations-and-own-surface.md)).

## The catalogs

`src/catalog/index.ts` builds two v1.0 catalogs (`new Catalog(id, '1.0', components, functions, documentOptions)`):

- `material3Catalog` (`BASIC_CATALOG_ID` = `https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json`):
  the 18 basic components using stock `@a2ui/web_core/catalogs/basic/v1` APIs
  verbatim, plus the 14 basic functions with guarded `OpenUrlImplementation`.
- `material3ExtendedCatalog` (`MATERIAL_CATALOG_ID` = `https://m3e.language-lit.com/a2ui/catalogs/material3/catalog.json`):
  all 18 basic implementations shared by identity plus the 9 Material additions
  (`Switch`, `Select`, `IconButton`, `Chip`, `ListItem`, `Progress`,
  `Carousel`, `SegmentedButtons`, `Tooltip`) and the guarded basic functions.

`material3Catalogs` exports `[material3Catalog, material3ExtendedCatalog]`,
which `useA2ui` registers by default.

Each basic component maps to Material 3 Expressive as follows:

| A2UI component | Renders | Notes |
| --- | --- | --- |
| `Text` | `Text` as `h1`–`h6`, `p`, or `span` | `body` (body-large) and `caption` (body-small muted); Markdown `#`–`######` map to semantic `h1`–`h6` in Material headline/title roles; nested lists and pipe tables (ADR 0003, ADR 0006). |
| `Image` | `<img>` with variant and fit classes | `icon` 24px, `avatar` 40px round, `header` full-width 200px; other variants keep intrinsic size. |
| `Icon` | `Icon` with an embedded glyph | `svgPath` inline; `{ path }` as `<img>`; names outside the embedded set fall back to a ligature. |
| `Video` | native `<video controls>` | `posterUrl` → `poster`. |
| `AudioPlayer` | native `<audio controls>` | with an optional description. |
| `Row` / `Column` | flex `div` | `justify`/`align` modifiers; `weight` → `flex`. |
| `List` | `<div role="list">` | one `<div role="listitem">` per child; direction from `direction`. |
| `Card` | `Card variant="outlined" as="div"` | 16px padding, one child. |
| `Tabs` | `Tabs` | one panel per child, built lazily. |
| `Modal` | `Dialog` | trigger click bubbles to open the dialog so the trigger's own action still dispatches; content mounts only while open. |
| `Divider` | `Divider` | orientation from `axis`. |
| `Button` | `Button` | `primary` → filled, `default` → tonal, `borderless` → text; disabled while `@checks` fail; dispatches `action`. |
| `TextField` | `TextField` / `TextArea` | `longText` → text area; `obscured` → password; `number` → numeric; `placeholder` passes through; errors after touch. |
| `CheckBox` | `Checkbox` in a `<label>` | two-way bound. |
| `ChoicePicker` | `Radio`, `Checkbox`, or filter `Chip` | exclusive or multiple; optional filter field; value is `string[]`. |
| `Slider` | `Slider` | fills its parent; precision from range or `steps` divisions. |
| `DateTimeInput` | `DatePicker`, `TimePicker`, or `DateTimePicker`; native compatibility input on 1.2 floor | modal; ISO 8601 both ways, zone-aware. |

### Two rules the components never break

**Nothing reaches into library internals.** `.m3e-*` class names are private.
Geometry adjustments go through sanctioned `--m3e-comp-*` aliases on an
ancestor this package owns.

**Every selector lives under `.m3e-a2ui`.** `scripts/build-styles.mjs` inlines
component stylesheets and rejects any selector outside `.m3e-a2ui`.

## Material extension catalog

Each Material addition owns its schema in its `.tsx` file. `src/internal/materialSchemas.ts`
composes v1.0 common and control bases using `spec()` from `@a2ui/web_core`,
`DynamicBooleanSchema` from `@a2ui/web_core/v1_0`, and `CheckBoxApi`/`TextApi`
from `@a2ui/web_core/catalogs/basic/v1` without importing `zod`.

The standalone v1.0 Material catalog document is generated from
`getRendererCapabilities({ versions: ['1.0'], includeInlineCatalogs: true })`
by `scripts/generate-material-catalog.mjs`, rebasing `common_types.json#` to
`https://a2ui.org/specification/v1_0/common_types.json#`, validating every
local JSON Pointer, round-tripping through `Catalog.fromJson(schema, '1.0')`,
and writing `public/a2ui/catalogs/material3/catalog.json`.

## Testing

`fixtures/render.tsx` runs a real v1.0 `MessageProcessor` over messages and
renders the surface through `A2uiSurface` inside `Material3Provider`.
`fixtures/examples/` holds the 43 verbatim v1.0 basic catalog example streams
from `a2ui-project/a2ui`, `fixtures/catalog.json` holds the verbatim v1.0 basic
catalog, `fixtures/material/` holds the Material trip-planner example, and
`fixtures/conformance/` holds pinned upstream v1.0 conformance vectors.
