# ADR 0002: Render-only component implementations, and a surface of our own

Status: accepted
Date: 2026-09-11

## Context

An A2UI renderer has two halves. The **catalog** maps component names to
schemas and to something that draws them; the **surface** walks a
`SurfaceModel`, resolves each component's props through web_core's binder,
and hands children to the catalog. Google's `@a2ui/react` package supplies
both and defines the contract between them: a component implementation is
`{ name, schema, render }` where `render` receives a `ComponentContext` and a
`buildChild` callback. CopilotKit's A2UI integration vendors the same
render-only contract.

ADR 0001 rules out depending on `@a2ui/react`. The question is whether to
adopt its contract anyway.

## Decision

**The Material 3 catalog is written to the render-only contract.** Every
implementation is created through `createMaterial3Component(api, Render)`,
which wraps a plain presentational component: `Render` receives the resolved
props, the `ComponentContext` and `buildChild`, and never touches the surface,
the processor, or transport. `createMaterial3Component` owns the one piece of
runtime plumbing — subscribing to a `GenericBinder` through
`useSyncExternalStore` so a component re-renders exactly when a bound value
changes — and memoises on the props' identity.

Because the contract matches, `material3Catalog` can be handed to the
official `@a2ui/react` surface or to CopilotKit's renderer as-is, without this
package taking either as a dependency. That compatibility is a stated goal and
is covered in the README.

**The surface is our own.** `A2uiSurface` renders one `SurfaceModel`:

- It subscribes per component, through web_core's `componentsModel` events,
  so an `updateComponents` message re-renders the components it touched and
  nothing else.
- A child the surface names before the agent has sent it renders as a
  placeholder rather than as nothing, so incremental UIs (the specification's
  "incremental" examples) show shape before content.
- A component type the catalog does not implement renders an "Unsupported
  component" notice **and** reports `UNKNOWN_COMPONENT` through the surface's
  `onError`, so the agent side can learn what the client cannot draw.
- Attribution (`agentDisplayName`, `iconUrl`) renders above the root, and
  `primaryColor` is exposed as the `--m3e-a2ui-agent-color` custom property
  (ADR 0003 explains why it is not used as a theme seed).

`useA2ui` owns a `MessageProcessor` for a component's lifetime and exposes
its surfaces as a stable, tear-free snapshot. It deletes every surface on
unmount so a `StrictMode` remount starts clean instead of tripping
duplicate-surface errors.

## Consequences

- Presentational components are testable and reusable without a surface, and
  a host that already renders with `@a2ui/react` can adopt the Material
  catalog without changing its surface.
- The package must track two contracts: web_core's `ComponentApi` and
  `ResolveA2uiProps` types, and the render-only shape. Both are typed, so
  drift surfaces as a type error, and `tests/runtime/official-surface.test.tsx`
  renders the catalog under the installed `@a2ui/react` (a development
  dependency only) so a behavioural drift fails the suite.
- Hosts that need the official surface's extras — its own fallback policy,
  or a different placeholder — use that surface with this catalog rather than
  asking `A2uiSurface` to grow those options.
