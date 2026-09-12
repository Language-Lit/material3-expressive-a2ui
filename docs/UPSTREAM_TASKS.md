# Prepared upstream tasks

These are implementation briefs for the owning public repositories. This
package remains a v0.9/v0.9.1 renderer until the upstream contracts they cover
are available. The A2UI references below are pinned to public commit
[`1c45c809b655878d06e3afc6dda22100afecc0a4`](https://github.com/a2ui-project/a2ui/tree/1c45c809b655878d06e3afc6dda22100afecc0a4).

## A2UI web_core v1 runtime

Owner: `a2ui-project/a2ui`, `renderers/web_core`.

Expected scope:

- Add the versioned runtime under `renderers/web_core/src/v1_0/`, including
  the public entry, processor, surface/component/data models, catalog loader,
  schemas, function evaluation, and renderer/agent message handling.
- Update `renderers/web_core/package.json` with a `./v1_0` export and publish
  a package containing callable JavaScript and declaration files. Keep the
  existing v0.8 and v0.9 exports compatible.
- Wire the existing spec-copy build to the v1 schemas under
  `renderers/web_core/src/v1_0/schemas/`; add protocol fixtures and tests
  beside the v1 source.

Acceptance checks:

1. `import('@a2ui/web_core/v1_0')` works in Node and TypeScript. The real
   processor validates v1 `createSurface`, including initial components and
   data, incremental `updateComponents` and `updateDataModel`, and
   `deleteSurface`.
2. Catalogs can be mixed on one surface. Component and function resolution
   checks an explicit catalog id, then the surface default, and errors when
   neither exists; advertised catalogs are not an implicit fallback.
3. The processor supports both RPC directions: agent
   `callRendererFunction` with `rendererFunctionResponse`, and renderer
   `callAgentFunction` with `agentFunctionResponse`, including execution
   boundaries, return values, and structured errors.
4. `updateDataModel` requires `value`; explicit `null` deletes the addressed
   value. Validation supports structured `ValidationResult` values with
   `valid`, `code`, `message`, and `severity`.
5. Template evaluation implements the scoped `@index` function and rejects
   it outside collection scope. Accessibility plumbs `live` and `hidden`,
   with the v1 additional-properties rules.
6. Catalog validation covers `$schema`, `$id`, `protocolVersion`, object-map
   functions, `allowedCallers`, `requiresUserActivation`, UAX #31 entity names,
   reserved `@` names, and v1 common/catalog schemas. The v1 protocol also
   removes v0.9 branding/theme fields and adds initial surface state, catalog
   mixing, and bidirectional function calls.

## A2UI v0.9 inline catalog exporter

Owner: `a2ui-project/a2ui`,
`renderers/web_core/src/v0_9/processing/message-processor.ts` and its focused
processor tests.

Reproduction:

1. Build a processor with the unmodified upstream basic catalog and call
   `getClientCapabilities({ includeInlineCatalogs: true })`. The Material
   catalog no longer reproduces this after its idiomatic metadata correction
   (ADR 0008, package commit `38af67e`); the exporter still needs a general
   fix for stock schemas.
2. Inspect the emitted `Text`, `TextField`, `ChoicePicker`, `Slider`, and
   `DateTimeInput` schemas.
3. Resolve every `$ref` against the emitted document. The current exporter
   wraps `zodToJsonSchema(api.schema).properties` into an `allOf` fragment but
   leaves refs such as `#/properties/accessibility/properties/label/anyOf/0`
   pointing at properties that were outside the wrapped fragment. Relative
   `common_types.json#...` refs also assume a file at the consumer's hosting
   path.

Executable reproduction from a consumer with web_core 0.11:

```bash
node --input-type=module <<'NODE'
import { Catalog, MessageProcessor } from '@a2ui/web_core/v0_9'
import { BASIC_COMPONENTS, BASIC_FUNCTIONS } from '@a2ui/web_core/v0_9/basic_catalog'

const catalog = new Catalog('stock-basic', [...BASIC_COMPONENTS], [...BASIC_FUNCTIONS])
const processor = new MessageProcessor([catalog], undefined, { version: 'v0.9.1' })
const inline = processor.getClientCapabilities({ includeInlineCatalogs: true })['v0.9.1'].inlineCatalogs[0]
console.log(JSON.stringify(inline.components.Text, null, 2))
NODE
```

The `Text` fragment prints local refs such as
`#/properties/accessibility/properties/label/anyOf/0`; those targets are not
present in the wrapped component fragment.

Acceptance checks:

- Preserve the original JSON Pointer targets or rebase them while wrapping;
  do not infer types from component or property names.
- Make external common-type references resolvable under both inline and
  standalone catalog documents.
- Add a generic resolver regression test for the five schemas above and verify
  the corrected document still loads through public `Catalog.fromSchema`.

## Material 3 Expressive date/time picker

Owner: `Language-Lit/material3-expressive`. Cross-repository implementation
requires an explicitly approved task in that repository; the picker task was
owner-authorized on 2026-09-12. Installed peer files remain read-only.

Status (2026-09-12): owner-authorized upstream implementation is complete on
the design-system task branch. `DatePicker`, `DateRangePicker`, `TimePicker`,
and `DateTimePicker` have public root exports, token-only styles, source
traceability, and focused unit/browser gates there. They remain experimental
and are not in the currently released 1.2 line. This renderer therefore uses
public capability detection and retains its sanctioned native 1.2 fallback;
promotion and a released picker floor remain upstream release work.

Expected scope follows the design system's existing component directories and
root entry: add conformant date, time, and date-time picker components (the
owner chooses the final API), token-only styles, typed props, documentation,
inventory entries, and unit/browser coverage. Preserve the design system's
four public entry points, zero runtime dependencies, SSR behavior, and
reduced-motion rules.

Acceptance checks:

- Date-only, time-only, and combined modes expose accessible labels,
  keyboard/focus behavior, min/max constraints, invalid state, and stable ISO
  conversion.
- Calendar and time selection pass light/dark, density, reduced-motion, and
  SSR/hydration checks.
- A released root entry and stylesheet contain the picker. This renderer's
  approved bridge already prefers those exports and is independently tested
  with the picker-bearing package and the released native-fallback floor;
  picker work remains independent of A2UI v1 protocol support.

## Documentation-site catalog hosting

Owner: the repository that builds `m3e.language-lit.com`. The renderer
package stages `public/a2ui/catalogs/material3/catalog.json`; the site build
must publish that artifact at `/a2ui/catalogs/material3/catalog.json`.

Status (2026-09-12): implemented on the owner-authorized site task branch.
The build copies the canonical bytes, records source revision and SHA-256
provenance, rejects drift in the normal site check, and emits the route from a
clean checkout without this sibling package. Production deployment remains a
separate owner action; no live-hosting claim is made here.

Acceptance checks:

- Production GET returns HTTP 200 and `application/json`.
- The response contains the Material catalog id, all 27 components, and the
  generated function list; its bytes match the package artifact after the
  web_core reference fix.
- A clean static production build includes the route. No package export or
  runtime network dependency is added to the renderer.
