import { Catalog, type ComponentApi, MessageProcessor } from '@a2ui/web_core'
import { BASIC_COMPONENTS, OpenUrlImplementation as BaseOpenUrlImplementation } from '@a2ui/web_core/catalogs/basic/v1'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  BASIC_CATALOG_ID,
  MATERIAL_CATALOG_ID,
  createMaterial3Catalog,
  material3Catalog,
  material3Catalogs,
  material3Components,
} from '../../src/catalog'
import { OpenUrlImplementation } from '../../src/catalog/functions'
import { A2UI_ICON_NAMES } from '../../src/internal/icons'

interface SpecCatalog {
  catalogId: string
  components: Record<string, { properties?: Record<string, unknown> }>
  functions: Record<string, unknown>
}

const specCatalog = JSON.parse(readFileSync(path.join(__dirname, '../../fixtures/catalog.json'), 'utf8')) as SpecCatalog

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

/**
 * The property names a component schema declares: those on the schema itself
 * and on any `allOf` member, without descending into the properties' own
 * schemas (a bound string's `@path` is not a component property).
 */
function propertyNames(schema: unknown, into = new Set<string>()): Set<string> {
  if (schema && typeof schema === 'object') {
    const record = schema as Record<string, unknown>
    const properties = record['properties']
    if (properties && typeof properties === 'object') Object.keys(properties).forEach((key) => into.add(key))
    const members = record['allOf']
    if (Array.isArray(members)) members.forEach((member) => propertyNames(member, into))
  }
  return into
}

describe('material3Catalog', () => {
  it('advertises the v1.0 basic catalog id from the specification', () => {
    expect(material3Catalog.id).toBe(BASIC_CATALOG_ID)
    expect(material3Catalog.protocolVersion).toBe('1.0')
    expect(specCatalog.catalogId).toBe(BASIC_CATALOG_ID)
  })

  it('implements exactly the components the specification lists', () => {
    const implemented = [...material3Catalog.components.keys()].sort()
    expect(implemented).toEqual(Object.keys(specCatalog.components).sort())
    expect(material3Components.map((component) => component.name).sort()).toEqual(implemented)
  })

  it('ships every function the specification lists', () => {
    expect([...material3Catalog.functions.keys()].sort()).toEqual(
      expect.arrayContaining(Object.keys(specCatalog.functions).sort()),
    )
  })

  it('embeds a glyph for every icon name the specification enumerates', () => {
    const enumerated = findEnum(specCatalog.components['Icon'], 'accountCircle')
    expect(enumerated).toBeDefined()
    expect([...A2UI_ICON_NAMES].sort()).toEqual([...(enumerated ?? [])].sort())
  })

  it('reports the catalog in renderer capabilities', () => {
    const processor = new MessageProcessor([material3Catalog], undefined, { version: '1.0' })
    const capabilities = processor.getRendererCapabilities({ versions: ['1.0'] })
    expect(capabilities['1.0']?.supportedCatalogIds).toEqual([BASIC_CATALOG_ID])
    const inline = processor.getRendererCapabilities({ versions: ['1.0'], includeInlineCatalogs: true })
    const catalog = inline['1.0']?.inlineCatalogs?.[0]
    expect(Object.keys(catalog?.components ?? {}).sort()).toEqual(Object.keys(specCatalog.components).sort())
  })

  it('is registered first among the default catalogs, ahead of the Material extension', () => {
    expect(material3Catalogs.map((catalog) => catalog.id)).toEqual([BASIC_CATALOG_ID, MATERIAL_CATALOG_ID])
    const processor = new MessageProcessor([...material3Catalogs], undefined, { version: '1.0' })
    expect(processor.getRendererCapabilities({ versions: ['1.0'] })['1.0']?.supportedCatalogIds).toEqual([
      BASIC_CATALOG_ID,
      MATERIAL_CATALOG_ID,
    ])
  })

  it('matches web_core stock basic v1.0 component schemas verbatim', () => {
    const inlineComponents = (catalog: Catalog<ComponentApi>) =>
      new MessageProcessor([catalog], undefined, { version: '1.0' }).getRendererCapabilities({
        versions: ['1.0'],
        includeInlineCatalogs: true,
      })['1.0']?.inlineCatalogs?.[0]?.components
    const implemented = inlineComponents(material3Catalog)
    const stock = inlineComponents(new Catalog(BASIC_CATALOG_ID, '1.0', BASIC_COMPONENTS))
    for (const name of Object.keys(stock ?? {})) {
      expect([...propertyNames(implemented?.[name])].sort(), name).toEqual(
        [...propertyNames(stock?.[name])].sort(),
      )
    }
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

describe('openUrl', () => {
  it('is the user-activation-guarded implementation in the default and localised catalogs', () => {
    expect(material3Catalog.functions.get('openUrl')).toBe(OpenUrlImplementation)
    expect(createMaterial3Catalog({ locale: 'pt-BR' }).functions.get('openUrl')).toBe(OpenUrlImplementation)
    expect(OpenUrlImplementation.requiresUserActivation).toBe(true)
    expect(OpenUrlImplementation.name).toBe(BaseOpenUrlImplementation.name)
  })

  it('is not substituted into a caller-supplied function list', () => {
    const custom = createMaterial3Catalog({ functions: [BaseOpenUrlImplementation] })
    expect(custom.functions.get('openUrl')).toBe(BaseOpenUrlImplementation)
  })
})
