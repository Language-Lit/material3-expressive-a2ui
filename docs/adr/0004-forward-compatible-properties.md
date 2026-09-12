# ADR 0004: Forward-compatible v1.0 properties

Status: accepted
Date: 2026-09-12

## Context

The package targets A2UI v0.9.1 through web_core's `v0_9` entry. The v1.0
candidate specification keeps the basic catalog's component set and adds
three optional properties: `posterUrl` on `Video`, `placeholder` on
`TextField` and `steps` on `Slider`. The protocol changes that come with
v1.0 (`live`, `hidden`, the `Container` component, message renames) need a
new web_core entry, and this package does not implement protocol; web_core
owns it (ADR 0001).

An agent trained on the newer catalog will send the new properties. Without
them in the schema, web_core's binder strips them silently and the user
gets a video without its poster, a field without its hint, a slider that
does not snap.

## Decision

The three properties are accepted now, on the v0.9.1 implementations, with
the v1.0 descriptions and semantics:

- `posterUrl` renders as the video's `poster`.
- `placeholder` renders as the native placeholder of both the single-line
  field and the text area.
- `steps` is the number of divisions of the range. The value snaps to the
  nearest division, the design system's `steps` prop is set to `steps - 1`
  (it counts the values strictly between the endpoints, the catalog counts
  the divisions), and the displayed precision comes from the step size
  rather than from the range.

Each property is added by extending the web_core API schema in the
component's own directory, with `DynamicStringSchema` or
`DynamicNumberSchema` from web_core, so `zod` stays behind web_core and the
inline catalog advertises the property to an agent that asks for
capabilities. Nothing else from v1.0 is taken: no new component, no protocol
change, no renamed message. A test compares every component's inline schema
against web_core's own and fails when any other property appears, so the
additions stay exactly these three until a v1.0 web_core exists.

## Consequences

- An agent that sends v0.9.1 sees no difference; the properties are
  optional and undeclared ones stay stripped.
- The package's inline catalog is a superset of the specification's basic
  catalog by three properties. An agent that reads the inline catalog can
  use them; one that only knows the catalog id cannot, and loses nothing.
- When a v1.0 web_core entry ships, the three extensions collapse into the
  stock APIs and this ADR is superseded by the migration's own record.
