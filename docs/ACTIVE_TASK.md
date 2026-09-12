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

## Current task

None.
