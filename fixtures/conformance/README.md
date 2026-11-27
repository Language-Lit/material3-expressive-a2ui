# Pinned A2UI v1.0 conformance fixtures

These JSON fixtures are generated directly from the upstream YAML conformance
suites in `a2ui-project/a2ui` at the commit recorded in `manifest.json`.
Every source YAML file is verified against its pinned SHA-256 digest, and the
test runner checks every generated fixture hash and case count against
`manifest.json`.

Regenerate from upstream:

```bash
node scripts/update-conformance.mjs
```
