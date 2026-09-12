import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

// The published contract: one React entry plus the stylesheet, no runtime
// dependencies, and every protocol and design-system package as a peer.
assert.deepEqual(Object.keys(pkg.exports).sort(), ['.', './styles.css'])
assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0, 'Runtime dependencies are forbidden')
for (const peer of ['@a2ui/web_core', '@language-lit/material3-expressive', 'react', 'react-dom']) {
  assert.ok(pkg.peerDependencies[peer], `Missing peer: ${peer}`)
}
assert.equal(pkg.peerDependenciesMeta, undefined, 'Every peer is required')

function graph(entry) {
  const sources = new Map()
  const external = new Set()
  function visit(file) {
    if (sources.has(file)) return
    const source = readFileSync(file, 'utf8')
    sources.set(file, source)
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    function walk(node) {
      let specifier
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifier = node.moduleSpecifier.text
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) specifier = node.arguments[0].text
      if (specifier) {
        if (specifier.startsWith('.')) visit(path.resolve(path.dirname(file), specifier))
        else external.add(specifier)
      }
      ts.forEachChild(node, walk)
    }
    walk(ast)
  }
  visit(path.join(root, 'dist', entry))
  return { sources, external }
}

// The built entry may reach only the peers. In particular it must not pull in
// `@a2ui/react` (whose React peer range is narrower than ours), `zod` or
// `@preact/signals-core` directly — those are `@a2ui/web_core`'s business.
const allowedExternal = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  '@language-lit/material3-expressive',
  '@a2ui/web_core/v0_9',
  '@a2ui/web_core/v0_9/basic_catalog',
])
const entry = graph('index.js')
for (const name of entry.external) {
  assert.ok(allowedExternal.has(name), `Unexpected external import in dist: ${name}`)
}
assert.match(readFileSync(path.join(root, 'dist', 'index.js'), 'utf8'), /^['"]use client['"];?/, 'index.js')

// DateTimeInput is the one place a native input is allowed: the base library
// has no date or time picker yet (see ADR 0001), so the native picker is
// styled with tokens instead.
const nativeInputAllowed = new Set([path.join(root, 'src/components/DateTimeInput/DateTimeInput.tsx')])

function checkSources(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name)
    if (item.isDirectory()) { checkSources(file); continue }
    const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    if (/\.tsx?$/.test(file)) {
      const imports = ts.preProcessFile(source).importedFiles.map((entry) => entry.fileName)
      for (const name of imports) {
        if (name.startsWith('@language-lit/material3-expressive')) {
          assert.ok(['@language-lit/material3-expressive', '@language-lit/material3-expressive/theme', '@language-lit/material3-expressive/tokens', '@language-lit/material3-expressive/styles.css'].includes(name), `Deep import into the base library in ${file}: ${name}`)
        }
        if (name.startsWith('@a2ui/')) {
          assert.ok(['@a2ui/web_core/v0_9', '@a2ui/web_core/v0_9/basic_catalog'].includes(name), `Only the v0_9 web_core entries may be imported (${file}): ${name}`)
        }
        assert.notEqual(name, 'zod', `zod must stay behind @a2ui/web_core (${file})`)
      }
      if (!nativeInputAllowed.has(file)) {
        assert.doesNotMatch(source, /<(?:button|input|textarea|dialog)\b/, 'Use Material controls: ' + file)
      }
      assert.doesNotMatch(source, /dangerouslySetInnerHTML/, 'Markdown must render to nodes, never to HTML: ' + file)
    }
    if (file.endsWith('.css')) {
      assert.doesNotMatch(source, /!important|#[0-9a-f]{3,8}\b/i, file)
      for (const match of source.matchAll(/(?:^|[;{])\s*(color|background(?:-color)?|font(?!-variant-numeric)(?:-[\w-]+)?|line-height|letter-spacing|border-radius|(?:animation|transition)(?:-duration|-timing-function)?|box-shadow)\s*:\s*([^;{}]+)/g)) {
        assert.ok(/var\(--m3e-/.test(match[2]) || /^(?:none|inherit|transparent|currentColor)$/.test(match[2].trim()), 'Non-token design value in ' + file + ': ' + match[0])
      }
    }
  }
}
checkSources(path.join(root, 'src'))

// The catalog must cover the spec's basic catalog exactly: every component
// the spec lists, and nothing that is not in it, under the spec's catalog id.
const specCatalog = JSON.parse(readFileSync(path.join(root, 'fixtures/catalog.json'), 'utf8'))
const specComponents = Object.keys(specCatalog.components).sort()
const catalogSource = readFileSync(path.join(root, 'src/catalog/index.ts'), 'utf8')
for (const name of specComponents) {
  assert.match(catalogSource, new RegExp(`\\b${name}Implementation\\b`), `Catalog is missing ${name}`)
}
assert.match(catalogSource, /https:\/\/a2ui\.org\/specification\/v0_9\/catalogs\/basic\/catalog\.json/)

// The minimal catalog is a subset of the basic one under its own id. Every
// component it lists must be a basic component the minimal catalog object
// registers, and its one function must be implemented here.
const minimalCatalog = JSON.parse(readFileSync(path.join(root, 'fixtures/minimal/catalog.json'), 'utf8'))
const minimalSource = catalogSource.slice(catalogSource.indexOf('material3MinimalComponents'))
assert.ok(minimalSource.length > 0, 'Catalog is missing material3MinimalComponents')
for (const name of Object.keys(minimalCatalog.components)) {
  assert.ok(specComponents.includes(name), `Minimal catalog names ${name}, which the basic catalog lacks`)
  assert.match(minimalSource, new RegExp(`\\b${name}Implementation\\b`), `Minimal catalog is missing ${name}`)
}
assert.match(catalogSource, /https:\/\/a2ui\.org\/specification\/v0_9\/catalogs\/minimal\/catalog\.json/)
const functionsSource = readFileSync(path.join(root, 'src/catalog/functions.ts'), 'utf8')
for (const name of Object.keys(minimalCatalog.functions)) {
  assert.match(functionsSource, new RegExp(`name: '${name}'`), `Minimal catalog function ${name} is not implemented`)
}

// Inspect the shipped objects as well as source registration. The extension
// must not silently widen the specification's basic or minimal catalogs.
const built = await import('../dist/index.js')
const materialNames = ['Switch', 'Select', 'IconButton', 'Chip', 'ListItem', 'Progress', 'Carousel', 'SegmentedButtons', 'Tooltip']
assert.deepEqual([...built.material3Catalog.components.keys()].sort(), specComponents)
assert.deepEqual([...built.material3MinimalCatalog.components.keys()].sort(), Object.keys(minimalCatalog.components).sort())
assert.deepEqual(built.material3ExtendedComponents.map((component) => component.name).sort(), [...materialNames].sort())
assert.deepEqual([...built.material3ExtendedCatalog.components.keys()].sort(), [...specComponents, ...materialNames].sort())
for (const name of materialNames) {
  assert.equal(built[`${name}Implementation`], built.material3ExtendedCatalog.components.get(name))
}
assert.equal(built.material3ExtendedCatalog.id, built.MATERIAL_CATALOG_ID)
assert.equal(built.material3ExtendedCatalog.functions.get('openUrl'), built.OpenUrlImplementation)
assert.deepEqual(built.material3Catalogs.map((catalog) => catalog.id), [built.BASIC_CATALOG_ID, built.MINIMAL_CATALOG_ID, built.MATERIAL_CATALOG_ID])

console.log('Package boundaries, directives, dependencies, catalog coverage and design-system usage verified.')
