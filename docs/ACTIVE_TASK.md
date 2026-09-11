# Active task

## T01 — A2UI vertical slice

Status: complete
Approved: 2026-09-11 (owner: "I decided to add A2UI … If another repo is
necessary, you may open it on the same parent folder as a sibling.")
Completed: 2026-09-11

### Scope

Stand up the package with a working end-to-end slice rather than a scaffold:
a Material 3 implementation of the whole A2UI v0.9.1 basic catalog on top of
`@a2ui/web_core`, a surface and a hook that bind it to React, a playground
that streams every example from the specification with no backend, and tests
that run the real message processor over those examples.

Delivered:

- Repository, build (tsup: ESM + types, `'use client'`), CSS pipeline with
  the `.m3e-a2ui` namespace guard, the `.` / `./styles.css` export map, and
  `scripts/verify-package.mjs` covering exports, peers, the web_core import
  allowlist, the absence of a direct `zod` import, the native-control
  allowlist, the token-only CSS rule and catalog coverage against
  `fixtures/catalog.json`.
- `AGENTS.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`, ADRs 0001–0003,
  `README.md`.
- `src/runtime/` — `adapter.tsx` (`createMaterial3Component`),
  `A2uiSurface.tsx`, `useA2ui.ts`.
- `src/catalog/` and the eighteen components with token-only CSS, embedded
  Material Symbols glyphs, and a dependency-free Markdown subset.
- `fixtures/` — the specification's `catalog.json` and 43 example streams,
  copied verbatim; `messages.ts` and `render.tsx` helpers.
- Tests across the catalog, the runtime, binding and the controls, plus a
  compatibility test that renders the catalog under Google's `@a2ui/react`
  0.11.0 surface (a development dependency only); the playground with every
  example and a `?example=` deep link.

### Out of scope, deliberately

- Publishing. The package is unreleased and has never been pushed to a
  registry, and the repository is not yet under version control.
- The `/a2ui/` page on the design system's site. That is a task in the
  design system repository, which consumes this package.
- Seed-colour theming from `primaryColor` (ADR 0003).

### Acceptance checks

1. `npm run verify` passes.
2. Every example in `fixtures/examples/` renders with no unsupported
   component and no surface error.
3. `dist/styles.css` contains no selector outside `.m3e-a2ui`, and
   `dist/index.js` imports nothing beyond React, the design system and the
   two web_core `v0_9` entries.
4. The playground renders the examples in both color modes.

### Verification record (2026-09-11)

`npm run verify` green: typecheck clean, 78 tests in 6 files passing, build,
namespace guard and package inspection clean. `npm run playground:build`
passes. Under `@a2ui/react`'s own surface the Material catalog renders, binds
a text field and dispatches a button action with the edited value, with no
type cast.

In the browser (Chrome, 1512px, light and dark): the examples for layout,
forms, the music player, the recipe card's tabs, the movie card's modal and
video, the invitation builder's two-way binding, the software purchase's
choice picker, the task card, Markdown, the incremental dashboard and the
modal sample were all streamed and inspected. Actions reached the log with
their context; Escape closed the dialog.

Defects found there and fixed, each with a test where jsdom can see it:

- The playground's replay effect depended on the whole `useA2ui` result,
  whose identity changes with every surface, so it cleared the surface it
  had just created. It now depends on the stable functions; the
  architecture document records the trap for consumers.
- `Slider` collapsed to its content width inside a centred column and
  rounded every value to a whole number, which broke the 0–1 progress
  slider. It now fills its parent and derives precision from the range.
- An `Image` inside a stretch-aligned `Column` (the catalog default) was
  scaled to the column's full width. Images now keep their intrinsic size
  unless they are the `header` variant.
- A heading variant rendered a leading `#` from its Markdown. Heading and
  caption variants now drop the marker.
- Icon names bound through data arrive as Material Symbols names
  (`priority_high`), which rendered as clipped ligature text. Those names now
  normalise to the embedded glyphs, and the three such names the
  specification's examples use are embedded.
- `DateTimeInput` showed an instant's UTC wall-clock time in a UTC+9 zone
  while `formatDate` showed the local one. The picker now converts instants
  to the local zone and sends a UTC instant back.

A fourth defect surfaced while building the documentation site's demo
(2026-09-11): web_core keeps `updateDataModel` values by reference and writes
user input into them, so replaying a scripted stream after a reset showed
the previously typed value. `processMessages` now copies its input, with a
regression test in `tests/runtime/use-a2ui.test.tsx`.

Two upstream behaviours were confirmed rather than patched: the
specification's examples send `updateComponents` before `updateDataModel`,
so web_core reports transient `EXPRESSION_ERROR`s for function calls until
the data arrives (documented on `onError`); and the movie card example lists
its trailer button both as a column child and as the modal's trigger, so it
renders twice in any renderer that draws the trigger.

## T02 — Initial public release

Status: complete
Approved: 2026-09-11 (owner: "Let's publish then? Guide me.")
Completed: 2026-09-12

### Scope and expected files

Prepare and publish version 0.1.0 as the package's initial public npm
release. Verify from a clean tree and inspect the final tarball, remove the
stray repository-name heading that GitHub's generated README appended after
the license section, declare public access in `package.json` so the scoped
first publish needs no flag, record the release here, commit and push the
preparation, then the owner publishes from their own terminal. After
publication, verify clean installation from npm, create the annotated
`v0.1.0` tag and GitHub release, set the repository description, homepage
and topics, and switch the design system's site from the packed tarball to
the registry version. Expected files: `README.md`, `package.json` and
`docs/ACTIVE_TASK.md`.

### Acceptance checks

1. `npm run verify` and the final `npm pack --dry-run` pass from a clean
   tree.
2. The packaged README ends with the license section and no stray heading.
3. `@language-lit/material3-expressive-a2ui@0.1.0` is publicly available
   from the npm registry and installs successfully in a clean consumer
   fixture that imports the entry and the stylesheet export.
4. The `v0.1.0` tag and GitHub release point to the published commit.

### Verification record

- `npm run verify` passes from the clean tree: typecheck, 79 tests in 6
  files, build, namespace guard and package inspection.
- `npm pack --dry-run` reports a 71.2 kB public tarball (389.6 kB unpacked)
  containing the expected 8 files: `LICENSE`, `README.md`, `package.json`,
  `dist/index.js` and its map, `dist/index.d.ts`, and `dist/styles.css` and
  its map.
- The owner published from their own terminal on 2026-09-12. The registry
  lists `0.1.0` under the `latest` tag with public access, records git
  commit `ce6c9b1` (the preparation commit) and reports shasum
  `93f12610933d1e7f27d77d17fd554a08d50f10d3`, the same as the local dry
  run. The registry document answered 404 for about forty seconds after
  `npm publish` returned, then 200; a first check straight after a new
  package's publish can be replication lag rather than a failed publish.
- A tarball re-downloaded from the registry contains the expected 8 files;
  its `dist/index.js` carries the `processMessages` copy and its README ends
  with the license section.
- A clean temporary consumer installed `0.1.0` from the registry next to
  the design system, `@a2ui/web_core` 0.10.7, React and ReactDOM, imported
  the entry (29 exports, including `useA2ui`, `A2uiSurface`,
  `material3Catalog`, `createMaterial3Catalog` and
  `createMaterial3Component`) and resolved the `./styles.css` export;
  `npm ls` reported no invalid or missing peer.
- Annotated tag `v0.1.0` points at `ce6c9b1` on GitHub, and the public
  release "v0.1.0 — Initial release" was created from it. The repository
  description, homepage and topics now match the AG-UI companion's.
- The design system's documentation site switched from the packed tarball
  to the registry version; that repository records the switch as its T64.
- Ecosystem listing and announcement, both posted by the owner on
  2026-09-12 after reviewing prepared text: pull request
  [a2ui-project/a2ui#2629](https://github.com/a2ui-project/a2ui/pull/2629)
  adds the renderer to `docs/public/ecosystem/renderers.md` (Community
  Renderers row and a Highlights paragraph, formatted with the project's
  Prettier config), and discussion
  [a2ui-project/a2ui#2628](https://github.com/a2ui-project/a2ui/discussions/2628)
  announces it in "Show and tell". The listing takes effect when the
  maintainers merge the pull request.
  Google's CLA check failed on the first commit because its message
  carried a `Co-Authored-By` trailer naming the assistant, which the bot
  counts as a contributor without a CLA; the commit was amended without the
  trailer and force-pushed with the identical diff. Commits in these
  repositories never list the assistant as a co-author.

## Current task

None.
