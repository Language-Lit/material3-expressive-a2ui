import { MessageProcessor } from '@a2ui/web_core/v0_9'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { BASIC_CATALOG_ID, createMaterial3Catalog, material3Catalog, material3Components } from '../../src/catalog'
import { A2UI_ICON_NAMES } from '../../src/internal/icons'

const specCatalog = JSON.parse(readFileSync(path.join(__dirname, '../../fixtures/catalog.json'), 'utf8')) as {
  catalogId: string
  components: Record<string, { properties?: Record<string, unknown> }>
  functions: Record<string, unknown>
}

/** Finds the enum array that contains `member` anywhere in a JSON Schema. */
function findEnum(schema: unknown, member: string): string[] | undefined {
  if (Array.isArray(schema)) {
    for (const item of schema) {
      const found = findEnum(item, member)
      if (found) return found
    }
    return undefined
  }
  if (schema && typeof schema === 'object') {
    const record = schema as Record<string, unknown>
    if (Array.isArray(record['enum']) && record['enum'].includes(member)) return record['enum'] as string[]
    for (const value of Object.values(record)) {
      const found = findEnum(value, member)
      if (found) return found
    }
  }
  return undefined
}

describe('material3Catalog', () => {
  it('advertises the basic catalog id from the specification', () => {
    expect(material3Catalog.id).toBe(BASIC_CATALOG_ID)
    expect(specCatalog.catalogId).toBe(BASIC_CATALOG_ID)
  })

  it('implements exactly the components the specification lists', () => {
    const implemented = [...material3Catalog.components.keys()].sort()
    expect(implemented).toEqual(Object.keys(specCatalog.components).sort())
    expect(material3Components.map((component) => component.name).sort()).toEqual(implemented)
  })

  it('ships every function the specification lists', () => {
    expect([...material3Catalog.functions.keys()].sort()).toEqual(expect.arrayContaining(Object.keys(specCatalog.functions).sort()))
  })

  it('embeds a glyph for every icon name the specification enumerates', () => {
    const enumerated = findEnum(specCatalog.components['Icon'], 'accountCircle')
    expect(enumerated).toBeDefined()
    expect([...A2UI_ICON_NAMES].sort()).toEqual([...(enumerated ?? [])].sort())
  })

  it('reports the catalog in client capabilities', () => {
    const processor = new MessageProcessor([material3Catalog], undefined, { version: 'v0.9.1' })
    const capabilities = processor.getClientCapabilities()
    expect(capabilities['v0.9.1']?.supportedCatalogIds).toEqual([BASIC_CATALOG_ID])
    const inline = processor.getClientCapabilities({ includeInlineCatalogs: true })
    const catalog = inline['v0.9.1']?.inlineCatalogs?.[0]
    expect(Object.keys(catalog?.components ?? {}).sort()).toEqual(Object.keys(specCatalog.components).sort())
  })

  it('can be extended under another id with extra components', () => {
    const custom = createMaterial3Catalog({
      id: 'https://example.com/catalog.json',
      components: [{ name: 'Gauge', schema: material3Catalog.components.get('Text')!.schema, render: () => null }],
      locale: 'pt-BR',
    })
    expect(custom.id).toBe('https://example.com/catalog.json')
    expect(custom.components.has('Gauge')).toBe(true)
    expect(custom.components.size).toBe(material3Catalog.components.size + 1)
    expect(custom.functions.has('formatCurrency')).toBe(true)
  })
})
