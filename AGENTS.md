# Repository instructions

## Required context

Before changing this package, read:

1. `docs/SPEC.md`
2. `docs/ACTIVE_TASK.md`
3. `docs/ARCHITECTURE.md`
4. The ADRs relevant to the change in `docs/adr/`

The specification is normative. Only the task recorded in `ACTIVE_TASK.md` may
be implemented. State a new task's scope, expected files, and acceptance checks
and obtain owner approval before changing its status to active.

## Safety boundary

- Private downstream applications are outside this repository. Never record
  their internals here or read/edit their repositories as part of package work.
- **`@language-lit/material3-expressive` is a peer, not a subtree.** Never edit
  it from here, never patch `node_modules`, and never fork one of its components
  to change its geometry. A genuine defect or gap there is reported to that
  repository with a reproduction; work around it in this package's own code only
  if the workaround is idiomatic.
- **`@a2ui/web_core` is the protocol.** Message parsing, validation, the data
  model, data binding, function evaluation and action dispatch belong to it and
  are never reimplemented here. Import only its `v0_9` and `v0_9/basic_catalog`
  entries; never import `zod` directly, even though web_core depends on it.
- The package exports exactly `.` and `./styles.css`. Adding, renaming, or
  removing a public path is a breaking change that requires owner approval and
  an ADR.
- The package ships no runtime dependencies. Everything else is a peer. If a
  change needs a library a peer does not provide, implement it here or do
  without it — do not add a dependency without an ADR.
- `@a2ui/react` is installed for one compatibility test only. It is never a
  peer and never imported from `src/`; the verifier rejects the import.
- Text that an agent sends is untrusted. It is rendered to React nodes, never
  to HTML: `dangerouslySetInnerHTML` is forbidden and the verifier checks for
  it. Links render only for `http`, `https`, `mailto` and `tel`.

## Design system rules that apply here without exception

This package is a consumer of the design system, held to the same standard as
any application:

- Never target a `.m3e-*` selector and never use `!important` against a library
  class. The sanctioned override surface is `--m3e-comp-*` custom properties set
  on an ancestor this package owns.
- Import only the four public entry points. No deep imports.
- Every color, type style, corner, duration, easing, elevation, and state
  opacity must resolve to an `--m3e-*` token. A literal hex, px font size, px
  radius, or `200ms ease` in this package's CSS is a defect even when it matches
  the current theme, because it will not follow theme, density, color mode, or
  reduced motion.
- Use the shipped component rather than re-implementing it. A hand-written
  `div` "card", "chip", or "button" here is the defect. The one sanctioned
  native control is the `DateTimeInput`'s `<input type="date|time|datetime-local">`,
  because the design system ships no picker yet (ADR 0003); the verifier
  allowlists that file alone.
- The components render real `button`, `input`, and `dialog` elements. Do not
  add `role`, `tabIndex`, or synthesised activation on top of them. Do supply
  what the platform cannot infer: accessible names for icon-only controls,
  label association, heading structure.

## Conventions

- Follow the layers in `docs/ARCHITECTURE.md`. The runtime layer knows web_core
  and React but no Material component; the catalog components know Material
  and their own schema but nothing about transport or surfaces.
- Every component implementation is **render-only**: `{ name, schema, render }`
  built with `createMaterial3Component`. It receives resolved props, a
  `ComponentContext` and `buildChild`, and nothing else — that is what keeps
  the catalog usable from the official `@a2ui/react` surface and from
  CopilotKit's A2UI renderer as well as from `A2uiSurface` (ADR 0002).
- Every selector this package writes lives under the `.m3e-a2ui` namespace. The
  build enforces it.
- One directory per component: `<Name>.tsx`, `<Name>.css`, `index.ts`. Types
  live in the `.tsx` — a deliberate deviation from the design system's
  `<Name>.types.ts` split, recorded in `docs/SPEC.md` §6.
- The package ships no icon font. The catalog's icon names are embedded
  Material Symbols glyphs in `src/internal/icons.tsx`, generated from the
  official SVGs with no `fill` and no intrinsic size, so `currentColor` and
  the `Icon` component own color and sizing.
- Markdown is a small in-house subset (`src/internal/markdown.tsx`), not a
  library. Extend it only with an ADR.
- Record cross-component or public-API decisions in an ADR.

## Verification

Use the narrowest relevant command while iterating. Before completing a task:

```bash
npm run verify   # typecheck + test + build + package boundary checks
```

Tests must exercise the real protocol pipeline. `fixtures/render.tsx` runs a
real `MessageProcessor` over the same JSONL the specification ships
(`fixtures/examples/`, copied verbatim from the A2UI repository) and renders
the result through `A2uiSurface`. A test that bypassed web_core's validation,
data binding and function evaluation would prove nothing about behaviour
against a real agent. Do not replace it with a stub.

The unit tests run in jsdom, which has no layout and no paint. After changing
component geometry, elevation, state layers, or color, also look at it:

```bash
npm run playground   # http://localhost:5373 — every spec example, no backend
```

`?example=<file>` deep-links one example, e.g.
`http://localhost:5373/?example=06_music-player.json`. Check both color modes.
Note that a **background browser tab** throttles timers and serves a stale
painted frame to screenshots, so a streamed example can look stalled when it
has already finished — read the live DOM before concluding otherwise.
