// Re-add "use client" to the React entry.
//
// esbuild (via tsup) strips module-level directives when bundling with code
// splitting. Next.js only needs the directive on the module a consumer imports,
// so it is prepended to the entry file here, post-build.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const clientEntries = ['index.js']
const DIRECTIVE = "'use client';\n"

for (const relative of clientEntries) {
  const file = path.join(distDir, relative)
  const contents = readFileSync(file, 'utf8')
  if (contents.startsWith("'use client'") || contents.startsWith('"use client"')) continue
  writeFileSync(file, DIRECTIVE + contents)
}

console.log(`Added "use client" to ${clientEntries.length} entry file(s).`)
