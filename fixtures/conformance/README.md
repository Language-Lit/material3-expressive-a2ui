# Upstream conformance fixtures

These fixtures are generated from the A2UI repository at commit
`1c45c809b655878d06e3afc6dda22100afecc0a4` (the main branch head inspected
on 2026-09-12):

- `conformance/core/data_model.yaml` → [data-model.json](data-model.json),
  37 cases
- `conformance/core/expressions.yaml` → [expressions.json](expressions.json),
  31 cases
- `conformance/core/message_processor.yaml` →
  [message-processor.json](message-processor.json), 2 cases
- `conformance/core/validator.yaml` →
  [validator-schema.json](validator-schema.json), the v0.9 envelope/schema
  case `test_validator_0_9`

The generated JSON preserves the case objects and names. It is checked in so
the test suite is offline and deterministic. Regenerate it with:

```sh
node scripts/update-conformance.mjs
```

The commit and source hashes are recorded in [manifest.json](manifest.json).

The test runner replays the v0.9 source vectors under both the v0.9 and v0.9.1
message tags; the web_core entry documents those protocol versions as
schema-compatible for this state and expression surface.

The script downloads only those four pinned source files, verifies their
SHA-256 values, and converts them with Ruby's standard Psych YAML parser. The
source suite is licensed under Apache 2.0 by Google LLC; see the upstream
repository and each source file's license header.

The validator fixture selects the one upstream v0.9 case whose valid envelope
step is validated with web_core's public `A2uiMessageSchema` and then
processed by MessageProcessor. Its malformed steps are checked as rejected
schema inputs. The rest of `validator.yaml` tests
the separate renderer-side graph validator: duplicate IDs, root reachability,
dangling or cyclic child references, template reachability, and recursive
function-call limits. MessageProcessor accepts incremental component graphs and
does not expose that validator, so those cases are reported as uncovered rather
than treated as passing. The v0.8 cases and upstream v1.0 test vectors are
outside this package's protocol target. No v1.0 support is implied.
