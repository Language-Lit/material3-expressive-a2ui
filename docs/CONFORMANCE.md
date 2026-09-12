# Upstream conformance

This package tracks the A2UI core conformance vectors that apply to its
`@a2ui/web_core/v0_9` dependency. The fixtures are pinned to
`a2ui-project/a2ui@1c45c809b655878d06e3afc6dda22100afecc0a4`; the source and
generated SHA-256 values are in
[`fixtures/conformance/manifest.json`](../fixtures/conformance/manifest.json).

The checked-in JSON is generated from upstream YAML by
[`scripts/update-conformance.mjs`](../scripts/update-conformance.mjs). The
script downloads the pinned files, verifies their source hashes, and converts
them with Ruby's standard Psych parser. The redistributed upstream data is
covered by [`fixtures/conformance/LICENSE`](../fixtures/conformance/LICENSE).

## Coverage

| Upstream suite | Cases | How this package exercises it |
| --- | ---: | --- |
| `core/data_model.yaml` | 37 | Each case creates a real MessageProcessor surface, sends its initial data through `updateDataModel`, then applies the case's public `SurfaceModel.dataModel` operations and subscriptions. |
| `core/expressions.yaml` | 31 | Direct `ExpressionParser` coverage through the public `v0_9` entry. Adjacent literal output is joined and empty literals removed using the upstream harness rule. |
| `core/message_processor.yaml` | 2 | Exact upstream messages and expectations through a Material catalog, replayed under both `v0.9` and `v0.9.1`. |
| `core/validator.yaml` | 1 selected case | The valid v0.9 envelope step from `test_validator_0_9` is validated with public `A2uiMessageSchema` and then replayed through MessageProcessor under both versions; its malformed steps are validated as rejected schema inputs. |

The rendered regressions in
[`tests/conformance/rendered.test.tsx`](../tests/conformance/rendered.test.tsx)
cover the package-owned layer around those vectors: a bound `Text` updates and
clears after processor data-model messages, and two simultaneously rendered
surfaces keep their data isolated.

Run the focused coverage with:

```sh
npx vitest run tests/conformance --reporter=dot
node scripts/update-conformance.mjs
```

## Limits

`MessageProcessor` receives the typed `A2uiMessage` model and applies it to
surfaces. The public `A2uiMessageSchema` validates the envelope before the
processor. MessageProcessor does not run the separate upstream validator
harness. The uncovered v0.9 validator rules are duplicate component IDs, missing roots,
dangling and cyclic child references, orphan and template reachability,
invalid paths in the old message shape, and function-call recursion limits.
Those rules require the upstream validator/schema harness and are not silently
counted as passing here. The malformed envelope steps in
`test_validator_0_9` (missing or wrong `version`, wrong field types, and a
missing `catalogId`) are covered by `A2uiMessageSchema`; MessageProcessor's
typed-message contract begins after that validation. The test checks rejection
and the expected field path; upstream simplified-schema categories/codes are
adapted to Zod's error representation rather than compared verbatim.

The upstream v0.8 vectors and the upstream v1.0 protocol test cases are not
part of this package's target. The tests accept v0.9 and v0.9.1, whose
`web_core` entry documents the state and expression vectors as compatible.
They make no v1.0 support claim.
