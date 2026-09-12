# ADR 0005: `openUrl` runs only from a user-initiated action

Status: accepted
Date: 2026-09-12

## Context

The basic catalog's `openUrl` opens a tab. web_core evaluates a function
call wherever an expression is evaluated: while a surface is first laid
out, while a `Text` interpolates a string, and again whenever a data-model
update re-evaluates a bound value. An agent's payload can therefore open a
tab without the user doing anything, by writing the call into a property
rather than into a `Button` action. The A2UI specification has a draft
proposal, "User-Gesture-Restricted Functions", that names this vector and
asks renderers to run such functions only inside the execution scope of an
action a component dispatched from an intentional user activation.

The proposal is not yet in a released specification and web_core does not
implement it. This package renders the untrusted side of the protocol, so it
is the right place to enforce it now.

## Decision

`openUrl` is replaced in every catalog this package builds — the default
basic catalog, a locale-bound one, and any `createMaterial3Catalog` call
that does not pass its own `functions` — by an implementation that first
checks a user-activation scope and then delegates to web_core's. Outside
the scope it throws an `A2uiExpressionError`, which web_core reports on the
surface as an `EXPRESSION_ERROR` naming `openUrl`; no tab opens.

The scope is a module-level counter (`src/internal/activation.ts`). The
adapter enters it around every action closure it hands to a render
function: an entry in the binder's snapshot counts as an action when it is
a function and the component's raw property of the same name parses as an
A2UI `Action`. Generated setters have no raw counterpart and are not
wrapped, so typing into a field bound to the same path as a guarded call
does not open anything. web_core resolves a `functionCall` action
synchronously inside the closure, so the check sees the scope exactly when
a component's action is running.

Where the browser exposes `navigator.userActivation`, the scope also
requires the activation to be live, so a programmatic click on a page with
no recent gesture is refused. Where it is absent, the scope alone decides;
an agent cannot dispatch a click, and a host script that does is the host's
decision.

Because the wrapping happens in `createMaterial3Component`, a host's own
component that calls `props.action()` from a click gets the scope without
doing anything. A host that replaces the function list with
`createMaterial3Catalog({ functions })` is on its own and can include this
package's `OpenUrlImplementation` to keep the guard.

The implementation carries `requiresUserActivation: true`, the marker the
proposal gives such functions. web_core does not read it yet.

## Consequences

- A surface whose `Button` opens a URL behaves as before. A payload that
  put the call anywhere else now reports an error through `onError`
  instead of opening a tab; nothing in the specification's examples does
  that.
- The scope persists for everything that runs synchronously inside an
  action closure, including a host `onAction` handler that processes
  messages synchronously. That is the proposal's own boundary, and an agent
  cannot widen it.
- If web_core adopts the proposal, its own `openUrl` gains the check and
  the replacement in `createMaterial3Catalog` becomes a no-op to remove.
