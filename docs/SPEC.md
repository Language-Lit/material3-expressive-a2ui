# Material 3 Expressive A2UI Specification

Status: vertical slice implemented; unreleased
Specification date: 2026-09-11
Current version: `0.1.0`

This document defines the product, boundary, architecture, and quality bar for
`@language-lit/material3-expressive-a2ui`.

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY**
describe normative requirements.

## 1. Product

A2UI is Google's protocol for agent-driven user interfaces: an agent
describes a UI as a tree of catalog components with data bindings, streams it
as JSONL messages, and receives the user's actions back. The agent never sends
code; the client renders the tree with components it already trusts. This
package is such a client: it renders the A2UI v0.9.1 basic catalog in
Material 3 Expressive.

It is the rendering half only. Message processing, the data model, data
binding, function evaluation and action dispatch belong to `@a2ui/web_core`
and MUST NOT be reimplemented here. Transport — how messages reach the client
and how actions go back — belongs to the host application and its agent
framework (A2A, a plain fetch, a WebSocket) and is out of scope.

### 1.1 Scope

In scope: a Material 3 implementation of every component in the basic catalog
(`https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`), a
`Catalog` that carries them together with the specification's functions, the
minimal catalog
(`https://a2ui.org/specification/v0_9/catalogs/minimal/catalog.json`) built
from the same implementations plus its `capitalize` function, a package-owned
Material extension catalog (ADR 0007), a surface
component that renders a `SurfaceModel`, and a hook that owns a
`MessageProcessor` for a component's lifetime.

Out of scope: transport, agent orchestration, prompt construction,
persistence, authentication, seed-colour theme generation, a Markdown
library, a date picker of its own, virtual scrolling, and icon fonts. A
consumer that needs any of these composes it.

### 1.2 Relationship to `@language-lit/material3-expressive`

This package is a **consumer** of the design system, not an extension of it.
It holds the same relationship to the library that any application does, and
the library's rules apply here without exception:

- App code MUST NOT target `.m3e-*` selectors or use `!important` against a
  library class. The sanctioned override surface is `--m3e-comp-*` custom
  properties set on an ancestor this package owns.
- Only the four public entry points may be imported: the package root,
  `/theme`, `/tokens`, and `/styles.css`. Deep imports are forbidden.
- Every color, type style, corner, duration, easing, elevation, and state
  opacity MUST resolve to an `--m3e-*` token.
- Components that the design system already ships MUST be used rather than
  re-implemented. The single exception is `DateTimeInput`'s native input
  (§4.3), allowlisted by name in the verifier.

Consumers MUST import `@language-lit/material3-expressive/styles.css` and mount
`Material3Provider` themselves; this package neither re-exports nor re-bundles
them.

### 1.3 Why a separate package

The design system's own specification forbids housing this code in it. Its
§1.2 fixes the public export map at exactly four paths and makes any addition
a breaking change requiring owner approval and an ADR, and its §1.3 requires
CI to continuously verify *the absence of runtime dependencies and of any peer
beyond React and React DOM*. `@a2ui/web_core` depends on `zod`. Adding an A2UI
surface to that package would fail its own CI by construction.

See [ADR 0001](adr/0001-separate-package-on-web-core.md), which also records
why the package builds on `@a2ui/web_core` rather than on `@a2ui/react`.

## 2. Public surface

The package MUST export exactly:

```text
@language-lit/material3-expressive-a2ui
@language-lit/material3-expressive-a2ui/styles.css
```

Adding, renaming, or removing a public path requires owner approval and an
ADR.

- **`.`** — the React surface. Carries `'use client'`. Exports:
  - `useA2ui`, `A2uiSurface`, `ROOT_COMPONENT_ID` and their types;
  - `material3Catalog`, `createMaterial3Catalog`, `material3Components`,
    `BASIC_CATALOG_ID`;
  - `material3MinimalCatalog`, `material3MinimalComponents`,
    `MINIMAL_CATALOG_ID`, and `material3Catalogs`, the default
    registration order;
  - `CapitalizeImplementation` and `OpenUrlImplementation`, the package's
    own function implementations;
  - `MATERIAL_CATALOG_ID`, `material3ExtendedCatalog`,
    `material3ExtendedComponents` (the nine additional implementations);
  - the eighteen basic and nine Material `<Name>Implementation` objects;
  - `createMaterial3Component` and the `Material3ComponentImplementation`,
    `A2uiHostProps`, `A2uiRenderProps`, `BuildChild`, `ResolvedProps` types;
  - `A2UI_ICON_NAMES`, `MATERIAL_SYMBOL_NAMES`, `toMaterialSymbol`.
- **`./styles.css`** — one precompiled stylesheet. It defines no tokens,
  ships no reset, and every selector in it MUST live under the `.m3e-a2ui`
  namespace. `scripts/build-styles.mjs` enforces that and fails the build
  otherwise. It is compiled by lightningcss against the targets in
  `docs/browser-support.json`, which MUST stay aligned with the design
  system's own support floor.

### 2.1 Dependency policy

The package MUST ship **zero runtime dependencies**. `@a2ui/web_core`,
`@language-lit/material3-expressive`, `react`, and `react-dom` are peers.

Only the `@a2ui/web_core/v0_9` and `@a2ui/web_core/v0_9/basic_catalog` entries
may be imported. `zod` MUST NOT be imported directly; it stays behind
web_core's API. CI verifies both by inspecting sources and the built chunk.

### 2.2 Protocol version

The package targets A2UI **v0.9.1** through web_core `^0.10.7 || ^0.11.0`.
The suite MUST pass at the range's floor as well as at the version the
lockfile pins, so a consumer on either minor gets the same behaviour.
`useA2ui` defaults the processor to `v0.9.1` and MAY be told `v0.9`. The
processor registers the basic, minimal and Material extension catalogs under
their own ids by default, so an agent that announces any of them in
`createSurface` is accepted without configuration.

## 3. Architecture

### 3.1 web_core owns the protocol

`MessageProcessor` parses and validates every message, maintains the surface
group, the per-surface component and data models, evaluates `{path}` and
`{call}` bindings, applies `checks`, and dispatches actions. This package
reads those models and never mutates them except through web_core's own
setters (a bound input calls the `setValue` the binder resolved for it).

Consequently, an invalid message is web_core's error, reported through
`useA2ui`'s `onError` (or thrown when no handler is given), and a function
whose argument is missing reports `EXPRESSION_ERROR` through the surface's
`onError`. The second case is routine while a surface is still arriving —
the specification's own examples send `updateComponents` before
`updateDataModel` — and consumers MUST treat it as a diagnostic, not a
failure.

### 3.2 Component implementations are render-only

Every catalog component is `{ name, schema, render }`, produced by
`createMaterial3Component(api, Render)`. `Render` receives the resolved props,
the `ComponentContext`, and `buildChild`, and MUST NOT reach the processor,
the surface group, or transport. `createMaterial3Component` owns the
subscription to web_core's `GenericBinder` through `useSyncExternalStore`, so
a component re-renders exactly when a value it binds changes.

This is the same contract that Google's `@a2ui/react` surface and
CopilotKit's A2UI renderer consume, so `material3Catalog` MUST remain usable
from either without this package depending on them. The suite MUST include a
test that renders the catalog under the installed `@a2ui/react` surface;
that package is a development dependency only and MUST NOT be imported from
`src/`. See [ADR 0002](adr/0002-render-only-implementations-and-own-surface.md).

### 3.3 The surface

`A2uiSurface` renders one `SurfaceModel` from its root (`root` by default).
It MUST:

- subscribe per component, so an `updateComponents` message re-renders only
  the components it touched;
- render a placeholder for a child the tree names before the agent has sent
  it, and replace it when the component arrives;
- render an "Unsupported component" notice for a type the catalog lacks and
  report `UNKNOWN_COMPONENT` through the surface's `onError`;
- render the theme's `agentDisplayName` and `iconUrl` as attribution above
  the root unless `attribution` is `false`, and expose `primaryColor` as the
  `--m3e-a2ui-agent-color` custom property on the surface element.

### 3.4 The hook

`useA2ui(options)` creates one `MessageProcessor` per mounted component with
the given catalogs (default: `material3Catalogs`, the basic catalog followed
by the minimal and Material extension catalogs), exposes live surfaces as a
tear-free snapshot, forwards actions to `onAction`, forwards processor and
surface errors to `onError`, and returns `processMessages`,
`getClientCapabilities`, `getClientDataModel`, and `clear`. It MUST delete
every surface on unmount so a `StrictMode` remount starts clean. The
returned functions MUST be referentially stable across renders; the returned
object is not, because it carries the current surfaces. `processMessages`
MUST NOT mutate the messages it is given: web_core writes bound input into
`updateDataModel` values by reference, so the hook copies its input first.

### 3.5 Catalog coverage

`material3Catalog` MUST implement every component the specification's
`catalog.json` lists, and CI MUST fail when a component is missing:
`scripts/verify-package.mjs` reads `fixtures/catalog.json` and checks that
each name has an implementation registered. The catalog MUST carry the
specification's functions (`BASIC_FUNCTIONS`, or a locale-bound copy when
`createMaterial3Catalog({ locale })` is used).

`material3MinimalCatalog` MUST implement exactly the components and the
function `fixtures/minimal/catalog.json` lists, reusing the basic
implementations, and the same script checks it. `capitalize` upper-cases
the first character and lower-cases the rest, the semantics of Python's
`str.capitalize`, and returns an empty string for a missing value so the
specification's own example renders without an expression error before the
user has typed.

The basic implementations MUST also accept the three optional properties the
v1.0 candidate catalog adds — `posterUrl` on `Video`, `placeholder` on
`TextField`, `steps` on `Slider` — with v1.0's descriptions and semantics,
and MUST advertise them in the inline catalog
([ADR 0004](adr/0004-forward-compatible-properties.md)). No other property
beyond web_core's own basic component schemas MAY be added to the basic
implementations, and a test MUST
compare the inline schemas against web_core's to enforce that. The v1.0
protocol (new components, `live`, `hidden`, message renames) is out of
scope until web_core ships an entry for it.

### 3.6 Material extension catalog

`material3ExtendedCatalog` MUST reuse every basic implementation and the
basic functions, including guarded `openUrl`, and add exactly `Switch`,
`Select`, `IconButton`, `Chip`, `ListItem`, `Progress`, `Carousel`,
`SegmentedButtons` and `Tooltip` under `MATERIAL_CATALOG_ID`:
`https://m3e.language-lit.com/a2ui/catalogs/material3/catalog.json`.
The basic and minimal catalogs MUST NOT gain these components.

The extension is registered third by default. Its schema MUST be advertised
through `getClientCapabilities({ includeInlineCatalogs: true })`; this
package runtime does not fetch the catalog URL. The generator derives the
standalone document from the actual catalog, preserves canonical reference
metadata, validates its local pointers, and writes
`public/a2ui/catalogs/material3/catalog.json` for the separately owned
documentation-site deployment. Consumers SHOULD use the inline schema until
that deployment is available. Schemas MUST be composed from web_core's public
schemas, preserving canonical reference metadata.
The property contract and deliberately limited peer component modes are
recorded in [ADR 0007](adr/0007-material-extension-catalog.md); canonical
schema-reference preservation is recorded in
[ADR 0008](adr/0008-canonical-schema-reference-metadata.md).

Inputs use web_core's generated setters for bound values and remain locally
editable for literals. Switch, Select and SegmentedButtons expose failed
checks after interaction. IconButton, Chip and actionable ListItem are
disabled when checks fail. All six accept a dynamic `disabled` property.
Tooltip MUST attach to the native control in its child, including when it
arrives later; it MUST NOT add focus or activation semantics to a wrapper.

## 4. Rendering rules

### 4.1 Untrusted text

Agent text is untrusted. It MUST be rendered to React nodes, never to HTML;
`dangerouslySetInnerHTML` is forbidden and the verifier checks for it.
Markdown is the subset in [ADR 0003](adr/0003-rendering-decisions.md) plus
the nested lists and pipe tables of
[ADR 0006](adr/0006-markdown-tables-and-nested-lists.md): links render only
for `http`, `https`, `mailto`, and `tel`, and open in a new tab with
`rel="noreferrer noopener"`; a table renders as a native `<table>` with
column headers inside a horizontal scroller; images and raw HTML are not
rendered.

### 4.2 Icons

Catalog icon names and the Material Symbols names the specification's
examples bind through data render as embedded SVG glyphs. `svgPath` renders
inline; an image path renders an `<img>`. Any other name falls back to a
Material Symbols ligature and is documented as requiring the host to load
that font.

### 4.3 The native date input

`DateTimeInput` renders `<input type="date|time|datetime-local">` styled with
the outlined text field's tokens, because the design system ships no picker.
Values are ISO 8601 in both directions. A value with an explicit offset is
shown in the user's zone and sent back as a UTC instant; one without is taken
as written.

### 4.4 Layout

`Row` and `Column` are flex containers. `justify` and `align` map to the
catalog's values with `start`/`stretch` defaults; `weight` becomes `flex`. An
image inside a stretch-aligned container keeps its intrinsic size (capped at
the container's width) rather than being scaled; only the `header` variant
spans the container.

### 4.5 Validation

A component whose `checks` fail exposes `isValid` and `validationErrors`
through the binder. Inputs show the messages after the user has touched them;
a `Button` with failing checks is disabled.

### 4.6 User-initiated functions

`openUrl` MUST run only inside the execution scope of an action a component
dispatched, and, where the browser exposes `navigator.userActivation`, only
while that activation is live. A call evaluated anywhere else — while
rendering, inside an expression, on a data-model update, or from a value
setter — MUST NOT open anything and MUST be reported on the surface as an
`EXPRESSION_ERROR` naming `openUrl`. The adapter MUST enter the scope for
every action closure it hands to a render function and MUST NOT enter it
for generated setters. Every catalog `createMaterial3Catalog` builds
without a caller-supplied `functions` list MUST carry this implementation
([ADR 0005](adr/0005-user-initiated-open-url.md)).

## 5. Accessibility

The design system's components carry native semantics; this package MUST NOT
add `role`, `tabIndex`, or synthesised activation on top of them. It owns only
what the platform cannot infer.

- `accessibility.label` becomes the accessible name of the element it
  describes: `aria-label` on containers and text, the `label` of a
  non-decorative icon, the name of a control.
- `Text` heading variants render real `h1`–`h5` elements; Markdown headings
  inside a `body` text start at `h2` so they never outrank the component's own
  headings.
- `ChoicePicker` is a `radiogroup` when mutually exclusive and a labelled
  `group` otherwise; radios share a name scoped to the surface and component.
- `Tabs` and `Modal` use the design system's `Tabs` and `Dialog`, which own
  focus management and keyboard behaviour.
- Placeholders carry `aria-busy`. Motion driven by this package MUST be
  guarded by `prefers-reduced-motion`.

## 6. Quality bar

CI MUST verify:

1. `tsc --noEmit` over `src`, `tests`, `fixtures`, and `playground`, with
   `strict` and `noUncheckedIndexedAccess`.
2. The unit suite, which MUST run a real `MessageProcessor` over the
   specification's own example streams (`fixtures/examples/`, copied
   verbatim) and MUST render every one of them without an unsupported
   component or a surface error — never a hand-rolled processor mock.
3. The build, including the CSS namespace guard.
4. The exact public export map, the absence of runtime dependencies, the
   `'use client'` directive, the web_core import allowlist, the absence of a
   direct `zod` import, catalog coverage against `fixtures/catalog.json`, the
   native-control allowlist, and the token-only CSS rule.
5. The generated Material catalog document is reproducible, has resolvable
   references, and round-trips through web_core's public catalog loader.

Tests MUST cover, at minimum: the catalog's component set and icon enum
against `fixtures/catalog.json`; the client capabilities object; two-way
binding of an input into the data model; action context; `checks` gating a
button; function calls; a late-arriving child replacing its placeholder; the
unknown-component report; surface tracking through `useA2ui`; the catalog
rendering under the official `@a2ui/react` surface; and correct behaviour
under `StrictMode`.

Visual and interactive behaviour is invisible to jsdom, so the playground
(`npm run playground`) MUST run the same components against the same example
streams with no backend, and SHOULD be checked in both color modes before
release.

## 7. Deliberate deviations from the design system's repository conventions

- **Component types live in `<Name>.tsx`, not `<Name>.types.ts`.** The design
  system splits them because its components carry large discriminated prop
  unions consumed by its documentation pipeline. These components' props are
  inferred from the catalog schema; a second file per component would be
  ceremony.
- **No `component-inventory.json`.** That file backs the design system's
  conformance claim against the Material specification. This package
  implements no Material component; it composes them. Its conformance claim
  is against the A2UI catalog and is checked by `scripts/verify-package.mjs`.
