import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const MATERIAL_CATALOG_ID = 'https://m3e.language-lit.com/a2ui/catalogs/material3/catalog.json'
export const MATERIAL_CATALOG_ROUTE = 'public/a2ui/catalogs/material3/catalog.json'
const COMMON_TYPES_URL = 'https://a2ui.org/specification/v0_9/common_types.json#'

/**
 * Convert the v0.9 inline capability produced by web_core into a hosted
 * catalog document. Keeping this conversion separate from the CLI lets tests
 * exercise it with a source catalog before `dist/` exists.
 */
export function buildMaterialCatalogSchema(inlineCatalog) {
  if (!inlineCatalog || typeof inlineCatalog !== 'object') {
    throw new TypeError('Expected a web_core inline catalog object')
  }
  if (inlineCatalog.catalogId !== MATERIAL_CATALOG_ID) {
    throw new Error(`Expected catalog ${MATERIAL_CATALOG_ID}, received ${String(inlineCatalog.catalogId)}`)
  }

  const componentEntries = Object.entries(inlineCatalog.components ?? {}).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )
  const components = Object.fromEntries(
    componentEntries.map(([name, schema]) => [name, normalizeSchema(schema)]),
  )
  // Function order is part of the capability web_core produced. Object keys
  // are sorted during serialization, but arrays retain their source order.
  const functions = (inlineCatalog.functions ?? []).map((definition) => normalizeSchema(definition))

  return sortRecord({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: MATERIAL_CATALOG_ID,
    title: 'Material 3 Expressive A2UI Catalog',
    description: 'Material 3 Expressive extensions and the A2UI v0.9 basic catalog.',
    catalogId: MATERIAL_CATALOG_ID,
    components,
    functions,
    ...(inlineCatalog.theme ? { theme: normalizeSchema(inlineCatalog.theme) } : {}),
  })
}

/** Validate the hosted document's catalog-level invariants. */
export function validateMaterialCatalogSchema(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error('Catalog schema must be a JSON object')
  }
  const keys = Object.keys(schema).sort()
  const allowed = ['$id', '$schema', 'catalogId', 'components', 'description', 'functions', 'theme', 'title']
  const unknown = keys.filter((key) => !allowed.includes(key))
  if (unknown.length > 0) {
    throw new Error(`Unexpected catalog root keys: ${unknown.join(', ')}`)
  }
  if (schema.$id !== MATERIAL_CATALOG_ID || schema.catalogId !== MATERIAL_CATALOG_ID) {
    throw new Error('Catalog id metadata does not match the hosted Material catalog id')
  }
  if (!schema.components || typeof schema.components !== 'object' || Array.isArray(schema.components)) {
    throw new Error('Catalog must declare a components object')
  }
  if (!Array.isArray(schema.functions)) {
    throw new Error('Catalog must declare web_core inline functions as an array')
  }
  for (const [name, component] of Object.entries(schema.components)) {
    if (!component || typeof component !== 'object' || Array.isArray(component)) {
      throw new Error(`Component ${name} is not a schema object`)
    }
  }
  walkRefs(schema, (ref, location) => {
    if (ref.startsWith('common_types.json#')) {
      throw new Error(`Catalog contains a non-standalone reference: ${ref}`)
    }
    if (ref.startsWith('#')) {
      if (!resolveJsonPointer(schema, ref)) {
        throw new Error(`Catalog contains a dangling reference at ${location}: ${ref}`)
      }
      return
    }
    try {
      new URL(ref)
    } catch {
      throw new Error(`Catalog contains a relative reference at ${location}: ${ref}`)
    }
  })
  const functionNames = new Set()
  for (const fn of schema.functions) {
    if (!fn || typeof fn !== 'object' || Array.isArray(fn) || typeof fn.name !== 'string') {
      throw new Error('Catalog contains an invalid inline function definition')
    }
    if (functionNames.has(fn.name)) {
      throw new Error(`Catalog declares function ${fn.name} more than once`)
    }
    functionNames.add(fn.name)
  }
  return schema
}

function normalizeSchema(value) {
  if (Array.isArray(value)) return value.map((item) => normalizeSchema(item))
  if (!value || typeof value !== 'object') return value
  const normalized = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, normalizeSchema(child)]),
  )
  if (typeof value.$ref === 'string' && value.$ref.startsWith('common_types.json#')) {
    normalized.$ref = `${COMMON_TYPES_URL}${value.$ref.slice('common_types.json#'.length)}`
  }
  return normalized
}

function walkRefs(value, visit, location = '#') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkRefs(item, visit, `${location}/${index}`))
    return
  }
  if (!value || typeof value !== 'object') return
  if (typeof value.$ref === 'string') visit(value.$ref, location)
  for (const [key, child] of Object.entries(value)) {
    walkRefs(child, visit, `${location}/${escapePointerToken(key)}`)
  }
}

function escapePointerToken(value) {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

function resolveJsonPointer(document, pointer) {
  let decoded
  try {
    decoded = decodeURIComponent(pointer.slice(1))
  } catch {
    return false
  }
  if (decoded === '') return true
  if (!decoded.startsWith('/')) return false
  let current = document
  for (const encodedToken of decoded.slice(1).split('/')) {
    const token = encodedToken.replaceAll('~1', '/').replaceAll('~0', '~')
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, token)) {
      return false
    }
    current = current[token]
  }
  return true
}

function sortRecord(value) {
  if (Array.isArray(value)) return value.map(sortRecord)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortRecord(value[key])]))
}

export function serializeMaterialCatalogSchema(schema) {
  validateMaterialCatalogSchema(schema)
  return `${JSON.stringify(schema, null, 2)}\n`
}

async function generateHostedCatalog() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const built = await import(pathToFileURL(path.join(root, 'dist/index.js')).href)
  const { MessageProcessor } = await import('@a2ui/web_core/v0_9')
  const processor = new MessageProcessor([built.material3ExtendedCatalog], undefined, { version: 'v0.9.1' })
  const inline = processor.getClientCapabilities({ includeInlineCatalogs: true })['v0.9.1']?.inlineCatalogs?.[0]
  const schema = buildMaterialCatalogSchema(inline)

  // Catalog.fromSchema is web_core's public schema loader. Round-tripping the
  // generated document catches malformed component/function contracts without
  // introducing a JSON-schema runtime dependency into this package.
  const { Catalog } = await import('@a2ui/web_core/v0_9')
  Catalog.fromSchema(validateMaterialCatalogSchema(schema))

  const output = path.join(root, MATERIAL_CATALOG_ROUTE)
  const serialized = serializeMaterialCatalogSchema(schema)
  if (process.argv.includes('--check')) {
    let checkedIn
    try {
      checkedIn = await readFile(output, 'utf8')
    } catch (error) {
      throw new Error(`Catalog artifact is missing at ${MATERIAL_CATALOG_ROUTE}`, { cause: error })
    }
    if (checkedIn !== serialized) {
      throw new Error(`Catalog artifact is stale; run npm run catalog:generate`)
    }
    process.stdout.write(`verified ${MATERIAL_CATALOG_ROUTE}\n`)
    return
  }
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, serialized, 'utf8')
  process.stdout.write(`wrote ${path.relative(root, output)}\n`)
}

const invoked = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (invoked) await generateHostedCatalog()
