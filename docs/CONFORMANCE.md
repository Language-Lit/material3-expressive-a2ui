# Upstream conformance

This package tracks the A2UI v1.0 core conformance vectors that apply to its
`@a2ui/web_core` dependency (`^0.16.1`). The fixtures are pinned to
`a2ui-project/a2ui@36725eee042da90c526f469f94246f96e16fdc35`; the source and
generated SHA-256 digests are in
[`fixtures/conformance/manifest.json`](../fixtures/conformance/manifest.json).

The checked-in JSON is generated from upstream YAML by
[`scripts/update-conformance.mjs`](../scripts/update-conformance.mjs). The
script downloads the pinned files, verifies their source hashes, and converts
them with Ruby's standard Psych parser. The redistributed upstream data is
covered by [`fixtures/conformance/LICENSE`](../fixtures/conformance/LICENSE).

## Coverage

| Upstream suite | Cases | How this package exercises it |
| --- | ---: | --- |
| `core/data_model.yaml` | 52 | Each case creates a real v1.0 `MessageProcessor` surface, seeds its initial `dataModel`, then applies the case's `SurfaceModel.dataModel` operations (`get`, `set`, `delete`, `dispose`, `mutate_input`) and subscriptions. |
| `core/expressions.yaml` | 92 | All `parse_expression_template` cases run directly through `ExpressionParser`. Adjacent literal output is joined and empty literals removed using the upstream harness rule. |
| `core/message_processor_v1_0.yaml` | 9 selected cases | Exact upstream v1.0 lifecycle messages (inline `createSurface` initialization, optional `catalogId`, surface/component metadata extensions, `null` deletion, multi-stage pipelines, safe noop delete) replayed through a Material catalog. |
| `core/validator_v1_0.yaml` | 1 selected case | Every valid and malformed v1.0 envelope step from `test_validator_1_0` is validated with `AgentToRendererMessageSchema` and valid steps are processed through `MessageProcessor`. |

The rendered regressions in
[`tests/conformance/rendered.test.tsx`](../tests/conformance/rendered.test.tsx)
cover the package-owned layer around those vectors: a bound `Text` updates and
clears through v1.0 `value: null` deletion, and two simultaneously rendered
surfaces keep their data isolated.

Run the focused coverage with:

```sh
npx vitest run tests/conformance --reporter=dot
node scripts/update-conformance.mjs
```

## Limits

`useA2ui` validates incoming message envelopes with `AgentToRendererMessageSchema`
before handing them to `MessageProcessor`. Additional upstream conformance
suites that target full standalone validator harnesses, v0.8/v0.9 legacy
envelopes, or custom protocol adapters remain upstream `web_core`
responsibilities rather than being duplicated here; exclusions are recorded in
[`fixtures/conformance/manifest.json`](../fixtures/conformance/manifest.json).
No known failures exist at `@a2ui/web_core@0.16.1`.
