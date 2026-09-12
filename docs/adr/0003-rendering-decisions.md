# ADR 0003: Rendering decisions the catalog makes

Status: accepted
Date: 2026-09-11

Four places where the specification leaves the renderer a choice, and what
this package chose. Each is small on its own; together they are the package's
character.

## Icons are embedded glyphs, not a font

The basic catalog's `Icon` accepts one of 59 names, an inline `svgPath`, or a
value bound through data. The reference renderers rely on the Material
Symbols web font and render names as ligatures.

This package ships no font: the design system does not, and a stylesheet that
pulled one from a CDN would be a network dependency and a layout shift. The 59
names, plus the handful of Material Symbols names the specification's own
examples bind through data (`priority_high`, `trending_up`, `arrow_upward`),
are embedded as SVG path data generated from the official Material Symbols
SVGs (Apache 2.0; attribution in `src/internal/icons.tsx`). Snake-case and
kebab-case names normalise to the catalog's camelCase before lookup.

A name outside that set falls back to a Material Symbols ligature, which
renders correctly when the host loads the font and degrades to clipped text
when it does not. That degradation is documented rather than hidden, because
the alternative — silently rendering nothing — would lose the agent's intent.

## Markdown is a safe subset rendered to nodes

The `Text` component's content "may contain Markdown". Agent output is
untrusted, so it is never rendered as HTML. `src/internal/markdown.tsx` parses
headings, bulleted and numbered lists, paragraphs with soft breaks, bold,
italic, inline code and links, and renders each to React nodes. Links are
kept only for `http`, `https`, `mailto` and `tel` and open in a new tab with
`rel="noopener noreferrer"`. Block syntax counts only at the start of a line,
so a caption such as ` - Qty: 3` stays inline.

Block Markdown renders only for the `body` variant, where a document is
plausible. Heading and caption variants render inline Markdown and drop a
redundant leading `#` marker, since the variant already sets the level.
Images and raw HTML are out of scope; adding either needs an ADR, because
each widens the untrusted-input surface. Tables and nested lists, excluded
here at first, were added by
[ADR 0006](0006-markdown-tables-and-nested-lists.md).

## `DateTimeInput` renders a native input

The design system has no date or time picker yet. Rather than hand-build one
— which the design system rules forbid — `DateTimeInput` renders the
platform's `<input type="date|time|datetime-local">`, dressed in the outlined
text field's tokens, and is the single file the verifier allowlists for a raw
`<input>`. When the design system ships a picker, this component moves to it
and the allowlist entry goes.

Values stay ISO 8601 in both directions. A value with an explicit offset is an
instant and is shown in the user's own time zone; a picked time is then sent
back as a UTC instant, so the agent keeps the semantics it sent. A value
without an offset is taken as written.

## `primaryColor` is exposed, not applied

A surface's theme may carry `primaryColor`, and "renderers may generate
variants of this color". The design system's theme is token-driven and has no
seed-colour generation; deriving a full tonal palette from one hex value at
runtime is a design-system feature, not a renderer's.

`A2uiSurface` therefore sets `--m3e-a2ui-agent-color` on the surface element
and uses it for the agent attribution. A host that wants the whole surface
re-themed per agent can map that property onto the design system's public
component aliases on an ancestor it owns. Nothing in this package reads the
colour for anything else, so an agent cannot restyle the host's controls.
