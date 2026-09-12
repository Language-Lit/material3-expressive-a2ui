import { MessageProcessor } from '@a2ui/web_core/v0_9'
import { describe, expect, it } from 'vitest'
import {
  material3Catalog,
  material3ExtendedCatalog,
  material3ExtendedComponents,
  MATERIAL_CATALOG_ID,
} from '../../src/catalog'
import { OpenUrlImplementation } from '../../src/catalog/functions'
import { message } from '../../fixtures/messages'

const names = [
  'Switch',
  'Select',
  'IconButton',
  'Chip',
  'ListItem',
  'Progress',
  'Carousel',
  'SegmentedButtons',
  'Tooltip',
]

describe('Material catalog contract', () => {
  it('adds exactly the nine components while reusing basic implementations and guarded functions', () => {
    expect(material3ExtendedCatalog.id).toBe(MATERIAL_CATALOG_ID)
    expect(material3ExtendedComponents.map((item) => item.name).sort()).toEqual([...names].sort())
    expect([...material3ExtendedCatalog.components.keys()].sort()).toEqual(
      [...material3Catalog.components.keys(), ...names].sort(),
    )
    for (const [name, implementation] of material3Catalog.components) {
      expect(material3ExtendedCatalog.components.get(name)).toBe(implementation)
    }
    expect([...material3ExtendedCatalog.functions.keys()]).toEqual([
      ...material3Catalog.functions.keys(),
    ])
    expect(material3ExtendedCatalog.functions.get('openUrl')).toBe(OpenUrlImplementation)
  })

  it('advertises binding and child references in inline capabilities', () => {
    const processor = new MessageProcessor([material3ExtendedCatalog], undefined, {
      version: 'v0.9.1',
    })
    const inline = processor.getClientCapabilities({ includeInlineCatalogs: true })['v0.9.1']
      ?.inlineCatalogs?.[0]
    expect(inline?.catalogId).toBe(MATERIAL_CATALOG_ID)
    expect(Object.keys(inline?.components ?? {}).sort()).toEqual(
      [...material3ExtendedCatalog.components.keys()].sort(),
    )
    const component = (name: string) => JSON.stringify(inline?.components?.[name])
    expect(component('Switch')).toContain('common_types.json#/$defs/DynamicBoolean')
    expect(component('Select')).toContain('common_types.json#/$defs/DynamicString')
    expect(component('SegmentedButtons')).toContain('common_types.json#/$defs/DynamicStringList')
    expect(component('Carousel')).toContain('common_types.json#/$defs/ChildList')
    expect(component('Tooltip')).toContain('common_types.json#/$defs/ComponentId')
    expect(component('IconButton')).toContain('common_types.json#/$defs/Action')
  })

  it.each([
    { id: 'root', component: 'Switch', label: 'On', value: 7 },
    { id: 'root', component: 'Select', label: 'Plan', value: 'a', options: [{ label: 'A' }] },
    { id: 'root', component: 'IconButton', icon: 'help', action: { event: { name: 'help' } } },
    { id: 'root', component: 'SegmentedButtons', label: 'Days', options: [], value: 'a' },
    { id: 'root', component: 'Carousel', children: [{ arbitrary: 'not a child' }] },
  ])('rejects invalid $component properties through web_core', (component) => {
    const processor = new MessageProcessor([material3ExtendedCatalog])
    processor.processMessages([
      message.createSurface('invalid', { catalogId: MATERIAL_CATALOG_ID }),
    ])
    expect(() =>
      processor.processMessages([message.updateComponents('invalid', [component])]),
    ).toThrow()
  })
})
