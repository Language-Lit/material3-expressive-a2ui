# Material catalog delivery

The Material extension catalog is generated from the actual
`material3ExtendedCatalog` through
`MessageProcessor.getClientCapabilities({ includeInlineCatalogs: true })`.
The generator preserves the inline component fragments, function-array order,
and theme metadata. It sorts object keys for reproducible output and rebases
protocol references from `common_types.json` to the public A2UI v0.9 URL.

Package-owned component schemas retain canonical `REF:` metadata on dynamic
fields. This matters before hosting: it makes the inline capabilities consumed
directly by an agent accurate and prevents zod schema de-duplication from
creating pointers into a subtree that web_core later replaces with an external
reference. See [ADR 0008](adr/0008-canonical-schema-reference-metadata.md).

Generate the checked-in artifact with:

```bash
npm run catalog:generate
```

The command builds the package, derives the catalog from the built public API,
validates every local JSON Pointer, round-trips the result through web_core's
public `Catalog.fromSchema` loader, and writes:

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

The file is a hosted catalog document, with the same `$schema`, `$id`, title,
and description metadata as the A2UI specification's hosted catalogs. Those
catalog-document fields are not part of the strict `InlineCatalog` object sent
inside client capabilities; callers should use
`getClientCapabilities({ includeInlineCatalogs: true })` for that payload.

The artifact is hosting output rather than a package export or runtime
dependency. Deployment of the documentation site remains owned by that site's
release process.

This is the v0.9.1 Material extension catalog. It does not advertise A2UI v1.0
message processing; adopting v1.0 still requires a public web_core v1 entry.
