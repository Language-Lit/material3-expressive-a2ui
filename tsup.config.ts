import { defineConfig } from 'tsup'

// One React entry. The catalog is a set of React render functions bound to
// `@a2ui/web_core` schemas, so there is no React-free subpath to publish: a
// host that needs the protocol layer alone imports `@a2ui/web_core` directly.
//
// esbuild strips module-level "use client" when bundling with code splitting,
// so scripts/add-directives.mjs re-adds it to the entry afterwards.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  dts: true,
  splitting: true,
  treeshake: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    '@language-lit/material3-expressive',
    /^@a2ui\/web_core(\/.*)?$/,
  ],
})
