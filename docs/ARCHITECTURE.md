# Architecture

How an A2UI message stream becomes Material 3 pixels, and why each seam is
where it is. The normative rules are in [SPEC.md](SPEC.md); this document
explains the implementation.

## The layers

```text
the host application                 fetch / A2A / WebSocket — not this package
      │
      │  A2uiMessage[]   (createSurface, updateComponents, updateDataModel, deleteSurface)
      ▼
@a2ui/web_core  MessageProcessor     validation, surfaces, data model, binding, functions, actions
      │
      │  SurfaceModel · ComponentContext · GenericBinder
      ▼
src/runtime/                         the React binding
      useA2ui.ts        one processor per component; surfaces as a store
      A2uiSurface.tsx   walks a surface: per-component subscriptions, placeholders, unknowns
      adapter.tsx       createMaterial3Component: binder -> useSyncExternalStore -> props
      ▼
src/catalog/ + src/components/       the Material 3 basic catalog
      ▼
@language-lit/material3-expressive   Text, Icon, Card, Button, TextField, Checkbox, Chip, Slider, Tabs, Dialog, …
```

Each arrow crosses exactly one concern. web_core knows nothing about React;
the runtime knows web_core and React but no Material component; the catalog
components know Material and their own schema but nothing about surfaces or
transport.

## Reading a stream

**web_core owns the protocol.** `MessageProcessor.processMessages` validates
each message against the v0.9.1 schemas, creates or deletes surfaces in its
`SurfaceGroupModel`, upserts components into a surface's
`componentsModel`, and merges `updateDataModel` into its `dataModel`. It also
resolves every binding: `{ path }` reads the data model, `{ call, args }`
runs a catalog function, `checks` produce `isValid` and `validationErrors`,
and a `ChildList` template expands one child per data item. Nothing in this
package re-derives any of that; it would be a second, drifting copy of a
state machine that upstream owns and tests.

**The hook wraps the processor.** `useA2ui` creates a `MessageProcessor` once
per mounted component, with the Material catalog and an action handler that
forwards to the latest `onAction`. Surfaces are exposed through a small store
shaped for `useSyncExternalStore`: it subscribes to `onSurfaceCreated` and
`onSurfaceDeleted` on the first listener, unsubscribes on the last, and only
publishes a new array when the set of surfaces actually changed. Every
surface's `onError` is forwarded to `onError`. On unmount the hook deletes
every surface, which is what makes a `StrictMode` mount–unmount–mount
sequence start clean instead of failing on a duplicate surface id.

The hook forwards raw processor and surface reports without deciding whether an
`EXPRESSION_ERROR` recovered. A host that streams messages owns that boundary:
it can label a report as an initialization diagnostic until the surface has
received its data model or the stream has finished, then keep later expression
errors actionable. A data update is evidence that initialization progressed,
not evidence that a malformed expression succeeded. The playground keeps the
raw report visible and uses an explicit replay-finished marker for this
classification.

The functions the hook returns are referentially stable. The object is not —
it carries the current surfaces — so an effect that replays messages should
depend on `processMessages` and `clear`, not on the whole result. The
playground learned this the hard way: depending on the object re-ran its
mount effect on every surface change, which cleared the surface it had just
created.

`processMessages` copies its input before handing it to web_core. The
runtime stores `updateDataModel` values by reference and writes bound input
into them, so without the copy a host's own message objects — a transcript
in state, a fixture replayed later — would carry one session's edits into
the next. The site demo found this: replaying a form after a reset showed the
previously typed name. It validates the copied array or message-list wrapper
with web_core's public v0.9 envelope schema before handing it to the
processor, so an invalid version or envelope cannot partially mutate a batch.
This validation boundary does not make web_core's subsequent component or
state processing transactional: those errors retain web_core's normal
behavior.

## Rendering a surface

`A2uiSurface` renders one `SurfaceModel`, starting at `root`.

- **`DeferredChild`** looks a component id up in the surface's
  `componentsModel` through `useSyncExternalStore` over `onCreated` and
  `onDeleted`, filtered to that id. While the model has no such component it
  renders a placeholder (`aria-busy`, a pulsing block that respects reduced
  motion). When the component arrives, it renders `ResolvedChild`. This is
  what lets an agent send a `Column` whose children follow in a later
  message, or replace a placeholder id with a real component.
- **`ResolvedChild`** creates a `ComponentContext(surface, id, basePath)`,
  memoised on those three, looks the component's type up in the surface's
  catalog, and renders the implementation's `render` with the context and a
  `buildChild` that produces another `DeferredChild`. A type the catalog does
  not implement renders `UnknownComponent`, which shows the type name and
  dispatches `UNKNOWN_COMPONENT` on the surface once per mount.
- The surface element carries `data-a2ui-surface`, the attribution row when
  the theme names the agent, and `--m3e-a2ui-agent-color` when it names a
  colour.

`basePath` is how `ChildList` templates work: web_core resolves a template
child to `{ id, basePath }`, and the context created for it scopes every
relative `{ path }` under that base. The surface keys template children by
`id@basePath` so React keeps their state per item.

## Binding a component

`createMaterial3Component(api, Render)` is the whole adapter:

1. The returned implementation is `{ name, schema, render: Host }`, where
   `name` and `schema` come from the basic catalog's `*Api` objects — the
   same objects web_core's other renderers use.
2. `Host` creates a `GenericBinder(context, schema)` for the context it was
   given and keeps it in a ref; a new context (the surface re-created the
   component) disposes the old binder and creates a new one.
3. `useSyncExternalStore(binder.subscribe, () => binder.snapshot)` yields the
   resolved props. The binder connects on the first subscriber and disposes
   on the last, and its snapshot is a stable reference until something it
   depends on changes, so React re-renders exactly when a bound value does.
4. Each action closure in the snapshot is wrapped so that calling it enters
   the user-activation scope (`src/internal/activation.ts`); generated
   setters are not. The guarded `openUrl` checks that scope
   ([ADR 0005](adr/0005-user-initiated-open-url.md)).
5. `Render` is wrapped in `memo` comparing the props snapshot, `buildChild`,
   the component model and the context's path.

`Render` therefore looks like an ordinary presentational component:
`({ props, context, buildChild }) => JSX`. `props` are typed by inference from
the schema (`ResolvedProps<Api>`), so `props.text` on a `Text` is already a
string and `props.setValue` on a `TextField` is already a setter into the data
model. That is the contract `@a2ui/react` and CopilotKit consume, which is why
`material3Catalog` works under their surfaces too
([ADR 0002](adr/0002-render-only-implementations-and-own-surface.md)).

## The catalog

`src/catalog/index.ts` lists the eighteen implementations and builds
`material3Catalog = new Catalog(BASIC_CATALOG_ID, components, functions)`,
where `functions` is web_core's `BASIC_FUNCTIONS` with `openUrl` swapped for
the package's own `OpenUrlImplementation` (`src/catalog/functions.ts`), which
runs only inside a user-initiated action.
`createMaterial3Catalog({ id, components, functions, locale })` builds a
variant: a different id for a host that publishes its own catalog, extra
components, replaced functions (used as given), or the specification's
functions bound to a locale for `formatCurrency`, `formatDate` and friends.

`material3MinimalCatalog` is the specification's minimal catalog — `Text`,
`Row`, `Column`, `Button`, `TextField` and the function `capitalize` — built
from the same five implementation objects under the minimal catalog id. The
minimal catalog defines those components with the basic catalog's
properties, so nothing is duplicated; only `capitalize`
(`src/catalog/functions.ts`) is new, since web_core ships no implementation
for it. `material3Catalogs` lists both catalogs in the order `useA2ui`
registers them, followed by the Material extension catalog; a `createSurface`
naming any of these ids is accepted.

Each component is a directory of `<Name>.tsx`, `<Name>.css`, and `index.ts`:

| A2UI component | Renders | Notes |
| --- | --- | --- |
| `Text` | `Text` as `h1`–`h5`, `p`, or `span` | h1 headline-large … h5 title-medium; caption body-small in the variant colour; body body-large. Markdown subset (ADR 0003, ADR 0006: nested lists, pipe tables); block Markdown only for `body`. |
| `Image` | `<img>` with variant and fit classes | `icon` 24px, `avatar` 40px round, `header` full-width 200px; other variants intrinsic size, never stretched by the parent. |
| `Icon` | `Icon` with an embedded glyph | `svgPath` inline; `{ path }` as `<img>`; names outside the embedded set fall back to a ligature. `accessibility.label` makes it non-decorative. |
| `Video` | native `<video controls>` | `posterUrl` → `poster` (v1.0, ADR 0004). |
| `AudioPlayer` | native `<audio controls>` | with an optional description |
| `Row` / `Column` | flex `div` | `justify`/`align` modifiers; `weight` → `flex`. |
| `List` | `<ul>` / `<ol>` / `div` | one `<li>` per child; direction from `direction`. |
| `Card` | `Card variant="outlined" as="div"` | 16px padding, one child. |
| `Tabs` | `Tabs` | one panel per child, built lazily. |
| `Modal` | `Dialog` | the trigger renders in a wrapper whose click opens the dialog, so the trigger's own action still dispatches; content mounts only while open. |
| `Divider` | `Divider` | orientation from `axis`. |
| `Button` | `Button` | `primary` → filled, `default` → tonal, `borderless` → text; disabled while `checks` fail; dispatches `action`. |
| `TextField` | `TextField` / `TextArea` | `longText` → text area; `obscured` → password; `number` → numeric; `placeholder` (v1.0) passes through; errors after the field is touched. |
| `CheckBox` | `Checkbox` in a `<label>` | two-way bound. |
| `ChoicePicker` | `Radio`, `Checkbox`, or filter `Chip` | `mutuallyExclusive` → radios; `displayStyle: chip` → chips; optional filter field; value is always a `string[]`. |
| `Slider` | `Slider` | fills its parent; precision from the range (hundredths ≤ 1, tenths ≤ 10, otherwise whole numbers); with `steps` (v1.0) the value snaps to the divisions and the precision follows the step. |
| `DateTimeInput` | native `<input type="date/time/datetime-local">` | the one sanctioned native control; ISO 8601 both ways, zone-aware. |

### Two rules the components never break

**Nothing reaches into library internals.** `.m3e-*` class names are private.
Where a library component needs different geometry it is set through the
sanctioned `--m3e-comp-*` aliases on an ancestor this package owns, never by
sizing a wrapper and clipping.

**Every selector lives under `.m3e-a2ui`.** `scripts/build-styles.mjs` inlines
the component stylesheets, then walks the result and throws on any selector
outside the namespace. The guard strips comments first, skips at-rule
preludes, and allows keyframe selectors. It has been verified non-vacuously:
during the first build it rejected a selector because its private-class check
still carried the sibling package's namespace, which is exactly the class of
mistake it exists to catch.

## Testing

`fixtures/render.tsx` runs a real `MessageProcessor` with `material3Catalog`
over a message array, collects every action and surface error, and renders
the resulting surface through `A2uiSurface` inside `Material3Provider`
(optionally under `StrictMode`). It is not a mock: messages go through
web_core's validation, models, binding and function evaluation, so a passing
test says something about behaviour against a real agent.

`fixtures/examples/` holds the specification's own 43 example streams, and
`fixtures/catalog.json` its basic catalog; `fixtures/minimal/` holds the
minimal catalog and its 7 examples. One test renders every example and
asserts no unsupported component and no surface error; others assert
specific behaviour — a login form's fields, a `ChildList` template's
expansion, the Markdown example, `capitalize` following the user's typing.
The catalog test compares the implemented component sets and the icon enum
against the two `catalog.json` files, so an upstream change shows up as a
failing test rather than a silent gap.

The playground (`npm run playground`) streams the same examples one message
at a time through `useA2ui` and `A2uiSurface`, with an action and error log,
in light, dark or system colour mode. It builds from `src`, never `dist`, so
what is on screen is the source.

## Material extension catalog

`material3ExtendedCatalog` is built with `createMaterial3Catalog`, supplying
its own id and `material3ExtendedComponents` (the nine additions only).
The basic implementations are shared by identity. The factory also supplies
the guarded basic functions. No runtime or transport logic changes.

Each addition owns its schema in its `.tsx` file. The internal
`materialSchemas.ts` composes common properties from the basic APIs, so
checks and accessibility use web_core's exact types. Dynamic and child
properties retain `REF:` descriptions for inline capabilities. Binding,
function evaluation, validation and action dispatch remain in web_core.

`Tooltip` bridges the render-only `buildChild` contract to the peer's
`anchorRef` contract by observing its own wrapper's child list. It finds the
first native control and gives that element to the peer, which owns hover,
focus, Escape, positioning and `aria-describedby`. The observer also handles
late children and replacement, and disconnects on unmount. The wrapper is
never made focusable. Tooltip text is plain non-interactive text.

The package-authored trip-planner fixture lives in `fixtures/material/`,
separate from the verbatim specification fixtures. Its carousel expands a
web_core child template, and its controls share bound values with action
contexts. See ADR 0007 for the extension's property contract.
