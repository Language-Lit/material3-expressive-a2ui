# ADR 0006: Markdown tables and nested lists

Status: accepted
Date: 2026-09-12

## Context

ADR 0003 set the Markdown subset `Text` renders — headings, paragraphs,
flat lists, bold, italic, code and links — and left tables, images, raw
HTML and nested lists out, each to be added only with an ADR because each
widens the untrusted-input surface. Agents send tables and nested lists
routinely: a comparison, an itemised order, an outline. The official
renderer, which parses with markdown-it, shows both; this package showed
the pipes and dashes as literal text.

## Decision

Two block forms join the subset. Neither reads HTML, neither loads a
resource, and both still render to React nodes through the same inline
reader, so links keep their scheme allowlist and text stays text.

**Nested lists.** A list item line indented by at least two spaces (or a
tab) under an open list item nests a list under that item; each further
two spaces nests one level more, and a shallower indent returns to the
matching outer level. The first item's marker decides whether a nested
list is ordered. An indented marker with no list open stays text, so the
ADR 0003 rule that ` - Qty: 3` is a label the agent spaced on purpose
still holds.

**Pipe tables.** A line containing a pipe followed by a delimiter row
(`| --- | :-: | ---: |`) with the same number of cells opens a table in the
GitHub-flavoured form. Outer pipes are optional, `\|` is a literal pipe,
colons in the delimiter row set a column's alignment, and body rows run
until a blank line or a line without a pipe, as markdown-it does. Short
rows are padded and long rows truncated to the header's width. The table
renders as a native `<table>` with `<th scope="col">` headers — the design
system ships no table, and a table is not a control — inside a scroller,
so a wide table scrolls within the text rather than widening the surface.
Every colour comes from a `--m3e-*` token.

Images and raw HTML stay out of scope.

## Consequences

- An agent's table or outline renders as such; text that merely contains
  pipes, or a dash after a space, renders as before.
- The `MarkdownBlock` type in `src/internal/markdown.tsx` gained a `table`
  kind and list items became objects with optional `children`. The module
  is internal; nothing public changed.
- ADR 0003's list of excluded syntax shrinks to images and raw HTML.
