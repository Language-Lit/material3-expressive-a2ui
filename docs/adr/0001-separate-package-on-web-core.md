# ADR 0001: A separate package, on `@a2ui/web_core` alone

Status: accepted
Date: 2026-09-11

## Context

A2UI support was requested for `@language-lit/material3-expressive`. As with
AG-UI before it, the obvious shape — a subpath on the existing package — is
ruled out by that package's specification: §1.2 fixes its export map at exactly
`.`, `./theme`, `./tokens` and `./styles.css`, and §1.3 has CI verify the
absence of runtime dependencies and of any peer beyond React and React DOM.

A2UI's client library, `@a2ui/web_core`, depends on `zod` for schema
validation. Any A2UI code inside the design system would add a third peer or
vendor a validator, and either way its CI would fail by construction. The
design system's value is that it is a leaf dependency; protocol support is not
leaf-shaped.

Google also publishes `@a2ui/react`, a React renderer with a `Surface`
component and a component-registry API. It was considered as the base for
this package and rejected on two counts:

- It declares a peer dependency on React `^19.2.7`. The design system supports
  React 18 and 19, and this package is meant to be usable wherever the design
  system is.
- It owns the surface, the registry shape and the fallback rendering. Building
  on it would tie this package's public API and release cadence to a 0.x
  library whose surface is still moving, for the sake of a few hundred lines
  of React that are straightforward to own.

`@a2ui/web_core`, by contrast, is the protocol itself: message parsing and
validation, the surface and component models, the data model, data binding
through `GenericBinder`, function evaluation, `checks`, and action dispatch.
That is exactly the part a renderer must not reimplement, and it is
framework-free.

## Decision

A2UI support ships as `@language-lit/material3-expressive-a2ui`, a sibling
repository and an independently versioned package.

- It depends on `@language-lit/material3-expressive` as a **peer**, at the
  same arm's length as any application: public entry points only, no `.m3e-*`
  selectors, no `node_modules` patching, tokens for every design value.
- It depends on `@a2ui/web_core` as a **peer** and imports only its `v0_9` and
  `v0_9/basic_catalog` entries. It never imports `zod`; validation stays
  behind web_core's API.
- It does not depend on `@a2ui/react`. The React binding — a surface
  component and a processor hook — is its own, small, and built on
  `useSyncExternalStore` (see ADR 0002 for how the two stay compatible).
- It ships zero runtime dependencies. React and React DOM (18 or 19) are peers.
- Its own CSS is namespaced under `.m3e-a2ui` and the namespace is enforced by
  the build, so the two stylesheets cannot collide however they are ordered.

## Consequences

- The design system keeps its leaf-dependency guarantee and its four-path
  export map unchanged. No ADR against that repository is required.
- Three version ranges must be kept compatible: the design system (`^1.2.0`),
  web_core (`^0.10.7`, protocol v0.9.1) and React (18 or 19). A breaking
  change in any of them is a major here.
- Consumers install and configure two packages plus web_core. This is stated
  in the README rather than hidden behind a re-export, because re-exporting
  the design system's surface would create a second, drifting copy of its API.
- The package tracks the A2UI specification through `fixtures/catalog.json`
  and `fixtures/examples/`, copied verbatim from the specification. A catalog
  change upstream shows up as a failing coverage or example test, not as a
  silent gap.
- Some duplication is accepted — a `cx` helper, embedded glyphs, a Markdown
  subset — rather than reaching into library internals or adding dependencies.
