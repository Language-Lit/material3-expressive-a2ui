# Material catalog delivery

The v1.0 Material extension catalog is generated from the actual
`material3ExtendedCatalog` through
`MessageProcessor.getRendererCapabilities({ versions: ['1.0'], includeInlineCatalogs: true })`.
The generator preserves the v1.0 catalog document shape (`$schema`, `$id`,
`protocolVersion: "1.0"`, `catalogId`, `title`, `description`, `components`,
object-map `functions`, and `$defs`), sorts object keys for reproducible
output, and rebases relative protocol references from `common_types.json#` to
`https://a2ui.org/specification/v1_0/common_types.json#`.

Basic component schemas come verbatim from `@a2ui/web_core/catalogs/basic/v1`
(which carries canonical `spec()` reference metadata natively in `web_core`
`0.16.1`), and package-owned Material schemas retain canonical `REF:` metadata
on all dynamic, child, and action fields.

Generate the checked-in artifact with:

```bash
npm run catalog:generate
```

The command builds the package, derives the catalog from the built public API,
validates every local JSON Pointer (`#/$defs/Weight`, `#/components/*`,
`#/functions/*`), round-trips the result through `web_core`'s public
`Catalog.fromJson(schema, '1.0')` loader, and writes:

```text
public/a2ui/catalogs/material3/catalog.json
```

`npm run verify:catalog` performs the same derivation without writing and fails
when the checked-in file differs byte-for-byte or contains an unresolved
reference. `npm run verify` runs that check after the normal package build.

The playground's Vite configuration serves the repository's `public/`
directory, so a production build stages the artifact at
`/a2ui/catalogs/material3/catalog.json`. That route matches the catalog ID:

```text
https://m3e.language-lit.com/a2ui/catalogs/material3/catalog.json
```

The artifact is hosting output rather than a package export or runtime
dependency. Publishing the static route is owned by the documentation site in
`material3-expressive` (synced via `npm run generate:site-a2ui-catalog`).
