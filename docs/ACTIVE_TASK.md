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

## T03 — README preview still and demo video

Status: complete
Approved: 2026-09-12 (owner: "About video and screenshot, guide me, I'll
record it, and you edit and optimize for web." then "Ok, 3": the assistant
records the playground itself with Playwright.)
Completed: 2026-09-12

### Scope and expected files

Give the README a still of the playground that links to the live demo, the
way the AG-UI companion's README does, and produce a short demo video of
the playground for the A2UI ecosystem announcement. Expected files:
`README.md`, `docs/assets/a2ui-preview.webp` and `docs/ACTIVE_TASK.md`.
The video files live outside the repository; they are attachments for the
announcement thread, not package or repository contents.

### Acceptance checks

1. The README shows the still directly under the intro links and the still
   links to `https://m3e.language-lit.com/a2ui/`.
2. The still is a WebP under 50 kB rendered from the production site build
   at 2x device pixels and downscaled to 1120 px wide, in light mode.
3. The video is 1120 px wide, 30 fps, H.264 MP4 and VP9 WebM, each under
   1 MB, with a WebP poster, matching the AG-UI demo media.
4. `package.json` `files` still lists only `dist`, so the asset never
   enters the tarball.

### Verification record

- Recorded with Playwright's Chromium from the site's static export served
  locally: 2240 by 2720 viewport at device scale 1 with the document zoomed
  2x, light scheme, a synthetic pointer drawn in the top layer, scenario 2
  (fill the form, pick Counter and 4 guests, press Reserve) followed by
  scenario 3 (Evening tab, open the booking dialog, dismiss it). Chrome 128
  and later scale `getBoundingClientRect` by CSS zoom while lengths set
  inside the zoomed subtree scale again, which put the Tabs indicator at
  twice its offset in the first cut; the recording script undoes that
  scaling for measurements inside `.m3e-tabs` only. At a real 2x device
  scale without zoom the indicator is correct, so the site and the design
  system need no change.
- `docs/assets/a2ui-preview.webp`: 1120 by 1430, 46.2 kB, an element
  screenshot of the demo after the reserve action, showing the filled form
  and the action the agent received.
- Video encoded with ffmpeg 7.1 from the raw screencast, cropped to the
  demo and downscaled with Lanczos: `a2ui-demo.mp4` (H.264, 1120 by 1332,
  30 fps, 27.5 s, 881 kB) and `a2ui-demo.webm` (VP9, 938 kB), poster
  `a2ui-poster.webp` (41.8 kB). Kept in the owner's `Desktop/m3e-web`
  folder next to the AG-UI media; the owner attaches the MP4 to
  `a2ui-project/a2ui` discussion #2628.
- `files` in `package.json` is unchanged, so the tarball still carries
  only `dist`.

## T04 — web_core 0.11 and @a2ui/react 0.11.1

Status: complete
Approved: 2026-09-12 (owner: "Ok, let's do them all. Commit after each one",
on the assessment that listed this item first)
Completed: 2026-09-12

### Scope and expected files

`@a2ui/web_core` 0.11.0 was published on 2026-09-12 and `@a2ui/react` is at
0.11.1. The peer range `^0.10.7` excluded the new minor, so a fresh install
warned. Widen the peer range to `^0.10.7 || ^0.11.0`, pin the development
dependency to 0.11.0, move the compatibility test to `@a2ui/react` 0.11.1,
and prove the suite at both ends of the range. Expected files:
`package.json`, `package-lock.json`, `README.md`, `docs/SPEC.md`,
`docs/ACTIVE_TASK.md`.

### Acceptance checks

1. `npm run verify` passes with web_core 0.11.0 and `@a2ui/react` 0.11.1.
2. The unit suite passes with web_core 0.10.7 installed in place of 0.11.0
   (the official-surface test excepted, since `@a2ui/react` 0.11.1 depends
   on web_core 0.11 itself).
3. Both web_core entries import in plain Node, so server rendering of a
   `'use client'` module that imports them still works.

### Verification record

- `npm run verify` green on 0.11.0 / 0.11.1: typecheck, 79 tests in 6
  files, build, namespace guard, package inspection. No source change was
  needed: the render-only contract is untouched by 0.11's node layer, and
  the official surface still renders `render`-only implementations.
- With web_core 0.10.7 swapped in (`npm i --no-save`), 78 tests in 5 files
  pass; the lockfile state was restored with `npm ci` afterwards.
- web_core 0.11.0 adds `lit` and `@lit/context` as dependencies and ships
  Web Component implementations from the `basic_catalog` entry. Both
  entries import cleanly in Node 22 (lit installs its DOM shim), and the
  built `dist/index.js` still imports only the two web_core entries, React
  and the design system.

## T05 — The minimal catalog

Status: complete
Approved: 2026-09-12 (owner: "Ok, let's do them all")
Completed: 2026-09-12

### Scope and expected files

The specification ships a second catalog, `minimal`, with `Text`, `Row`,
`Column`, `Button`, `TextField` and one function, `capitalize`. Its
components are defined with the basic catalog's properties, so the package
already implements them, but the processor rejected a `createSurface` that
named the minimal id because only the basic id was registered. Register
the minimal catalog under its id, implement `capitalize`, advertise both
ids by default, and cover the minimal examples the way the basic ones are
covered. Expected files: `src/catalog/functions.ts` (new),
`src/catalog/index.ts`, `src/index.ts`, `src/runtime/useA2ui.ts`,
`fixtures/minimal/` (the catalog and its 7 examples, verbatim),
`fixtures/render.tsx`, `tests/catalog/catalog.test.ts`,
`tests/runtime/spec-examples.test.tsx`, `tests/runtime/use-a2ui.test.tsx`,
`scripts/verify-package.mjs`, `playground/examples.ts`,
`playground/App.tsx`, `README.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`,
`docs/ACTIVE_TASK.md`.

### Acceptance checks

1. `npm run verify` passes, with the verifier checking the minimal
   catalog's components and function against `fixtures/minimal/catalog.json`.
2. Every one of the 7 minimal examples renders through the real processor
   with no unsupported component and no surface error, and the
   `capitalize` example follows the user's typing.
3. `useA2ui().getClientCapabilities()` lists the basic id first and the
   minimal id second.
4. The playground offers the minimal examples.

### Verification record

- `npm run verify` green: typecheck, 94 tests in 6 files, build, namespace
  guard and package inspection including the new minimal coverage checks.
- `capitalize` has no reference implementation in web_core, `@a2ui/react`
  or `@a2ui/lit` (all three were searched at 0.11). The package follows
  Python's `str.capitalize`, which the Python agent SDK's authors will
  expect, and accepts a missing value: the specification's own example
  binds the argument to a path it never seeds, and rendering an expression
  error on an empty field would have failed the example test.
- `zod` stays behind web_core, so the argument schema is composed from the
  basic `email` argument made optional rather than authored with `z`.
- `npm run playground:build` passes with the minimal examples listed after
  the basic ones as "Minimal · <name>", deep-linkable as
  `?example=minimal/<file>`.

## T06 — Forward-compatible v1.0 properties

Status: complete
Approved: 2026-09-12 (owner: "Ok, let's do them all")
Completed: 2026-09-12

### Scope and expected files

The v1.0 candidate catalog keeps the basic component set and adds three
optional properties: `posterUrl` on `Video`, `placeholder` on `TextField`
and `steps` on `Slider`. Accept them now on the v0.9.1 implementations, with
v1.0's descriptions and semantics, so an agent that knows the newer catalog
is not silently stripped; take nothing else from v1.0. Expected files:
`src/components/Video/Video.tsx`, `src/components/TextField/TextField.tsx`,
`src/components/Slider/Slider.tsx`, `tests/components/controls.test.tsx`,
`tests/catalog/catalog.test.ts`, `docs/adr/0004-forward-compatible-properties.md`
(new), `README.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`,
`docs/ACTIVE_TASK.md`.

### Acceptance checks

1. `npm run verify` passes.
2. A `Video` with a bound `posterUrl` renders it as `poster`; a `TextField`
   placeholder reaches the input and the text area; a `Slider` with
   `steps: 4` over 0–1 shows `0.25` for a bound `0.3` and writes `0.5` back
   after one arrow key.
3. The inline catalog declares the three properties, and declares no other
   property beyond web_core's own component schemas.

### Verification record

- `npm run verify` green: typecheck, 99 tests in 6 files, build, namespace
  guard and package inspection.
- The "only additions" test compares against a catalog built from web_core's
  `BASIC_COMPONENTS` rather than against `fixtures/catalog.json`: web_core's
  `List` already carries a `listStyle` that the v0.9.1 JSON does not, so the
  JSON is not the right baseline for what this package adds.
- The design system's `steps` counts the values strictly between the
  endpoints; the catalog counts the divisions, so the prop is `steps - 1`,
  and the implementation snaps the value itself so `steps: 1` (no interior
  value, which the design system treats as continuous) still lands on an
  endpoint.
- This commit also carries the corrected §2.2 sentence in `docs/SPEC.md`
  that T05's commit missed.

## T07 — `openUrl` runs only from a user-initiated action

Status: complete
Approved: 2026-09-12 (owner: "Ok, let's do them all")
Completed: 2026-09-12

### Scope and expected files

web_core evaluates `openUrl` wherever an expression is evaluated, so an
agent can open a tab from a `Text` property or a data-model update. The
specification's draft proposal on user-gesture-restricted functions asks
renderers to run such functions only inside a component action dispatched
from a user gesture. Adopt it: a user-activation scope the adapter enters
around action closures, a guarded `openUrl` that refuses to run outside
it, and the swap into every catalog the package builds. Expected files:
`src/internal/activation.ts` (new), `src/catalog/functions.ts`,
`src/catalog/index.ts`, `src/index.ts`, `src/runtime/adapter.tsx`,
`fixtures/render.tsx`, `tests/runtime/user-activation.test.tsx` (new),
`tests/catalog/catalog.test.ts`, `docs/adr/0005-user-initiated-open-url.md`
(new), `README.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`,
`docs/ACTIVE_TASK.md`.

### Acceptance checks

1. `npm run verify` passes.
2. A `Button` whose action calls `openUrl` opens the URL once with
   `noopener,noreferrer`; the same call in a `Text`, re-evaluated by a
   data-model update, or triggered through a value setter opens nothing and
   reports an `EXPRESSION_ERROR` naming `openUrl`.
3. A click the browser reports as outside a user gesture
   (`navigator.userActivation.isActive === false`) is refused.
4. A host component built with `createMaterial3Component` that calls
   `props.action()` from a click is inside the scope without extra work.
5. The default, locale-bound and extended catalogs carry the guarded
   implementation; a caller-supplied `functions` list is used as given.

### Verification record

- `npm run verify` green: typecheck, 107 tests in 7 files, build,
  namespace guard and package inspection.
- The scope is entered in the adapter, not in `Button`, so it follows the
  proposal's "binders wrap action callbacks automatically" and covers host
  components. An entry is an action when the raw property of the same name
  parses with web_core's `ActionSchema`; setters have no raw counterpart
  and stay unwrapped, which the setter test pins.
- web_core catches the thrown `A2uiExpressionError` in
  `evaluateFunctionReactive` and dispatches it on the surface, so a refused
  click surfaces through `onError` rather than as an uncaught exception.
- jsdom has no `navigator.userActivation`; the browser check is exercised
  by defining one on `navigator` for a single test.

## T08 — Markdown tables and nested lists

Status: complete
Approved: 2026-09-12 (owner: "Ok, let's do them all")
Completed: 2026-09-12

### Scope and expected files

ADR 0003 left tables and nested lists out of the Markdown subset pending an
ADR. Add both: GitHub-flavoured pipe tables rendered as a native `<table>`
inside a scroller, and list items indented under an open list item
rendered as nested lists, with the ADR 0003 rule that an indented marker
outside a list stays text. Images and raw HTML stay out. Expected files:
`src/internal/markdown.tsx`, `src/components/Text/Text.tsx`,
`src/components/Text/Text.css`, `tests/internal/markdown.test.ts` (new),
`tests/components/controls.test.tsx`,
`docs/adr/0006-markdown-tables-and-nested-lists.md` (new),
`docs/adr/0003-rendering-decisions.md`, `README.md`, `docs/SPEC.md`,
`docs/ARCHITECTURE.md`, `docs/ACTIVE_TASK.md`.

### Acceptance checks

1. `npm run verify` passes, including the token-only CSS check on the new
   table rules.
2. A two-level and a three-level nested list parse to nested `children`
   and render as `ul > li > ul`; an ordered list nests under an unordered
   item; ` - Qty: 3` outside a list stays a paragraph.
3. A pipe table parses with alignment from the delimiter row, `\|` as a
   literal pipe, short rows padded; a header and delimiter row of different
   widths stay text; a line without a pipe ends the table.
4. The rendered table has `columnheader` cells, an alignment class on the
   right-aligned column and inline Markdown inside cells.

### Verification record

- `npm run verify` green: typecheck, 114 tests in 8 files, build,
  namespace guard and package inspection.
- The table ends at a line without a pipe, as markdown-it (the official
  renderer's parser) does, rather than swallowing the paragraph after it
  as GitHub's reference implementation would.
- The design system ships no table component, and the verifier's native
  element rule covers controls only, so a `<table>` with `<th scope="col">`
  is the right element; colours come from `--m3e-sys-color-outline-variant`
  and `--m3e-sys-color-surface-container`.

## T09 — Material extension catalog

Status: complete
Approved: 2026-09-12 (owner: "Can you implement it?", continuing the
approved Material extension catalog from session 6374035a)
Completed: 2026-09-12

### Scope and expected files

Add Switch, Select, IconButton, Chip, ListItem, Progress, Carousel,
SegmentedButtons and Tooltip as render-only wrappers around the peer's
components. Register a separate Material catalog containing the basic
components plus these nine, after the basic and minimal catalogs. Reuse
web_core schemas, binding, checks and actions. Export the catalog and
implementations from the existing root entry.

Expected files: nine directories in `src/components/`, component/catalog
barrels, `src/styles/styles.css`, `fixtures/material/`, playground example
registration, protocol and compatibility tests, package verifier,
`README.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`, ADR 0007 and this file.

### Acceptance checks

1. `npm run verify` and `npm run playground:build` pass.
2. The Material catalog advertises exactly the basic components plus the
   nine additions, their binding schemas and guarded basic functions.
3. Real protocol tests cover two-way values, data updates, action context,
   checks, templates, incremental children and official-surface rendering.
4. Inspect the example in light and dark modes and exercise its controls.
5. Verify the suite at the supported web_core floor in an isolated copy.

### Verification record

- `npm run verify`: typecheck, 131 tests in 10 files, build, CSS namespace
  guard and package checks pass. The verifier now inspects the built
  catalogs and exports, including exact basic/minimal coverage and the
  nine Material additions.
- `npm run playground:build` passes. Vite retains its existing large-chunk
  advisory; no new runtime dependency or public package path was added.
- An isolated copy using web_core 0.10.7 and Material 1.2.0 passes
  typechecking, 129 tests, build and package checks. Both tests in the
  official-surface file are excluded there because @a2ui/react 0.11.1
  carries web_core 0.11; the full main suite covers them. No installed
  peer code was edited or patched.
- Chromium at 1280px: inspected the trip planner in light and dark modes;
  toggled the switch, selected Adventure and One week, saved the trip and
  activated the itinerary. Action context contained the edited values.
  Tooltip opens on native button focus, supplies its description, and
  closes on Escape. ArrowRight scrolls the carousel.
- At 390px the page has no horizontal overflow; the playground's existing
  stage scroll exposes the remaining components. Screenshots were inspected
  after theme transitions settled. Browser checks reported no page errors.
- Protocol regression tests include late/replaced tooltip anchors, literal
  and bound selection, dynamic disabled state, validation, function labels,
  progress updates, templated child scopes and invalid schema rejection.
- The Material catalog ID is not hosted by this change. The README and ADR
  explain inline capability delivery and the separately owned hosting task.

## T10 — Complete remaining compatibility and delivery work

Status: active
Approved: 2026-09-12 (owner: "Don't defer, let's tackle them ... Use cheaper
models for the actual coding ... then you only double check.")

### Scope and expected files

Use supervised lower-cost coding workers, with coordinator architecture
review and final verification. Address misleading streaming-error logs,
implement applicable upstream conformance checks, generate a reproducible
Material catalog schema and its hosting integration, and establish and
implement the prerequisites for full v1.0 and Material date/time pickers
within the repository ownership boundaries. Upstream-dependent features
must not be falsely advertised or implemented as a duplicate protocol.
Separate completed workstreams into commits without assistant co-authors.

Expected files: playground logging and tests; conformance fixtures, tests
and verification scripts; catalog schema generation and delivery scripts;
README, SPEC, ARCHITECTURE and relevant ADRs. Protocol/date-picker work in
other repositories requires separately scoped ownership under AGENTS.md;
prepare exact implementation briefs and reproduction evidence before any
cross-repository permission question. Do not edit installed peers.

### Acceptance checks

1. Streaming login errors remain inspectable as initialization diagnostics;
   post-initialization expression errors remain visible and actionable.
2. Pinned upstream conformance cases exercise the real web_core pipeline,
   with a precise version/coverage report rather than a false v1.0 claim.
3. The Material schema is generated from the actual catalog, reproducible,
   validated, and available in the prepared hosting output.
4. Complete implementable scope, identify exact upstream changes needed,
   and verify claims against published entries and the owning repositories.
5. `npm run verify`, playground build, appropriate browser checks and the
   supported dependency-floor checks pass before completion.

### Streaming diagnostics verification (2026-09-12)

- The playground preserves raw reports, labels pre-data `EXPRESSION_ERROR`s as
  unverified initialization diagnostics, and treats later reports as
  actionable after an explicit replay-finished boundary.
- `tests/runtime/playground-diagnostics.test.tsx` has two real
  `useA2ui`/`MessageProcessor` pipeline tests: the streamed login fixture
  remains inspectable without adding expression errors after valid and empty
  input, and a malformed function becomes actionable after a no-data replay
  finishes.
- The focused diagnostics tests and `npm run playground:build` pass.
- Browser review in light and dark modes found no page errors; Replay resets
  the log and coalesces the three repeated initialization reports, while each
  entry still exposes its raw details.

### Message envelope validation (2026-09-12)

- `useA2ui.processMessages` validates the copied array or message-list wrapper
  with web_core's public v0.9 schema before processing, so invalid versions or
  envelopes are reported (or thrown without a handler) without batch side
  effects. Valid wrappers and custom catalogs remain supported.
- `tests/runtime/use-a2ui.test.tsx` covers invalid version and envelope
  handling, callback versus throw behavior, and valid wrapper/custom-catalog
  processing. The focused runtime file passes (7 tests).

### T10 integration evidence (2026-09-12)

- The completed workstreams are recorded by commit: `d5579fc` (streaming
  diagnostics), `6232460` (pre-processor envelope validation), `b261b8b`
  (pinned conformance vectors and rendered invariants), and `38af67e`
  (generated catalog delivery).
- The parent verification run covered 129 tests: 120 conformance cases and 9
  diagnostics/runtime cases. `node scripts/update-conformance.mjs` reproduces
  the pinned fixtures. Coverage boundaries and exclusions are documented in
  [CONFORMANCE.md](CONFORMANCE.md).
- Catalog generation and hosting preparation are documented in
  [CATALOG_DELIVERY.md](CATALOG_DELIVERY.md); external v1 runtime, picker, and
  documentation-site deployment work remains pending as described in
  [UPSTREAM_TASKS.md](UPSTREAM_TASKS.md). No live hosting or v1 support claim
  is made here.

### Final package QA (2026-09-12)

- The parent verification run passes `npm run verify`: 271 tests in 14 files,
  typecheck, build, package-boundary checks, and catalog verification. The
  playground build also passes.
- The built static catalog route returns HTTP 200 with `application/json`; its
  69,596 bytes match the checked-in public artifact and contain 27 components,
  25 functions, and 130 canonical references.
- Production Chromium checks cover login validation and actions, Material
  controls, actions, tooltip, and carousel in light and dark modes; the 390px
  layout has no horizontal overflow and no page errors.
- The isolated floor run with `@a2ui/web_core` 0.10.7 and Material 1.2.0
  passes 268 tests with one expected upstream malformed-numeric parser failure
  (269 tests in 13 files). The two official-surface tests are excluded because
  `@a2ui/react` 0.11.1 requires web_core 0.11. Typecheck, build,
  package-boundary, and catalog checks are green; see
  [CONFORMANCE.md](CONFORMANCE.md) for the coverage boundary.
- T10 remains active while the external v1 runtime, Material picker, and
  documentation-site hosting scopes in [UPSTREAM_TASKS.md](UPSTREAM_TASKS.md)
  remain pending and their ownership questions are unresolved.

## Current task

T10.
