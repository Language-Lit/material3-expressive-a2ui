import { Catalog, MessageProcessor } from '@a2ui/web_core'
import {
  AudioPlayerApi,
  CheckBoxApi,
  ChoicePickerApi,
  DateTimeInputApi,
  ImageApi,
  SliderApi,
  TabsApi,
  TextApi,
  TextFieldApi,
  VideoApi,
} from '@a2ui/web_core/catalogs/basic/v1'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  buildMaterialCatalogSchema,
  serializeMaterialCatalogSchema,
  validateMaterialCatalogSchema,
  type InlineCatalogDefinition,
} from '../../scripts/generate-material-catalog.mjs'
import {
  MATERIAL_CATALOG_ID,
  material3Catalog,
  material3ExtendedCatalog,
} from '../../src/catalog'

const route = path.join(__dirname, '../../public/a2ui/catalogs/material3/catalog.json')

function sourceInlineCatalog() {
  const processor = new MessageProcessor([material3ExtendedCatalog], undefined, { version: '1.0' })
  return processor.getRendererCapabilities({
    versions: ['1.0'],
    includeInlineCatalogs: true,
  })['1.0']?.inlineCatalogs?.[0] as InlineCatalogDefinition | undefined
}

function parseResult(schema: { safeParse(value: unknown): unknown }, value: unknown) {
  const result = schema.safeParse(value) as
    | { success: true; data: unknown }
    | { success: false; error: { issues: Array<{ code: string; path: PropertyKey[]; message: string }> } }
  return result.success
    ? { success: true, data: result.data }
    : {
        success: false,
        issues: result.error.issues.map(({ code, path, message }) => ({ code, path, message })),
      }
}

describe('Material catalog delivery', () => {
  it('generates a standalone v1.0 schema from web_core inline capabilities', () => {
    const source = sourceInlineCatalog()
    const generated = validateMaterialCatalogSchema(buildMaterialCatalogSchema(source))
    const loaded = Catalog.fromJson(generated, '1.0')

    expect(generated.$id).toBe(MATERIAL_CATALOG_ID)
    expect(generated.protocolVersion).toBe('1.0')
    expect(Object.keys(generated.components)).toEqual([...material3ExtendedCatalog.components.keys()].sort())
    expect(Object.keys(generated.functions)).toEqual(Object.keys(source?.functions ?? {}).sort())
    expect([...loaded.components.keys()].sort()).toEqual(Object.keys(generated.components))
    expect([...loaded.functions.keys()].sort()).toEqual(Object.keys(generated.functions))
    expect(generated.$defs?.Weight).toBeDefined()
    expect(generated.$defs?.anyComponent).toBeDefined()
    expect(generated.$defs?.anyFunction).toBeDefined()
  })

  it('fails closed when any generated JSON Pointer is dangling', () => {
    const generated = buildMaterialCatalogSchema(sourceInlineCatalog())
    const broken = structuredClone(generated)
    broken.components['Text'] = { $ref: '#/components/Missing' }
    expect(() => validateMaterialCatalogSchema(broken)).toThrow(
      'Catalog contains a dangling reference at #/components/Text: #/components/Missing',
    )
  })

  it('preserves a valid document-local pointer without interpreting its schema type', () => {
    const generated = buildMaterialCatalogSchema({
      catalogId: MATERIAL_CATALOG_ID,
      protocolVersion: '1.0',
      components: {
        Example: {
          properties: {
            shared: { type: 'string' },
            value: { $ref: '#/components/Example/properties/shared' },
          },
        },
      },
      functions: {},
    })
    expect(
      (generated.components['Example'] as { properties: { value: { $ref: string } } })
        .properties.value.$ref,
    ).toBe('#/components/Example/properties/shared')
    expect(() => validateMaterialCatalogSchema(generated)).not.toThrow()
  })

  it.each([
    ['Text', TextApi, [{ text: 'Hello' }, { text: { '@path': '/copy' } }, { text: 7 }]],
    [
      'Image',
      ImageApi,
      [
        { url: 'image.png' },
        { url: { '@path': '/url' }, description: { '@call': 'label', args: {} } },
        { url: false },
      ],
    ],
    ['Video', VideoApi, [{ url: 'video.mp4' }, { url: { '@path': '/url' } }, { url: 1 }]],
    [
      'AudioPlayer',
      AudioPlayerApi,
      [
        { url: 'audio.mp3' },
        { url: { '@path': '/url' }, description: { '@path': '/title' } },
        { description: 'missing URL' },
      ],
    ],
    [
      'Tabs',
      TabsApi,
      [
        { tabs: [{ title: { '@path': '/title' }, child: 'panel' }] },
        { tabs: [] },
        { tabs: [{ title: 3, child: 'panel' }] },
      ],
    ],
    [
      'TextField',
      TextFieldApi,
      [
        { label: 'Name', value: { '@path': '/name' } },
        { label: { '@call': 'label', args: {} } },
        { label: 4 },
      ],
    ],
    [
      'CheckBox',
      CheckBoxApi,
      [
        { label: 'Ready', value: true },
        { label: { '@path': '/label' }, value: { '@path': '/ready' } },
        { label: 'Ready', value: 'yes' },
      ],
    ],
    [
      'ChoicePicker',
      ChoicePickerApi,
      [
        { options: [], value: [] },
        { options: [{ label: { '@path': '/label' }, value: 'a' }], value: { '@path': '/chosen' } },
        { options: [{ label: 3, value: 'a' }], value: [] },
      ],
    ],
    [
      'Slider',
      SliderApi,
      [{ max: 10, value: 2 }, { label: { '@path': '/label' }, max: 10, value: { '@path': '/value' } }, { max: 10, value: '2' }],
    ],
    [
      'DateTimeInput',
      DateTimeInputApi,
      [
        { value: '', min: '2026-01-01', max: { '@path': '/max' } },
        { value: { '@path': '/value' }, label: { '@call': 'label', args: {} } },
        { value: 2026 },
      ],
    ],
  ] as const)('matches stock v1.0 %s schema parsing verbatim', (name, stock, cases) => {
    const implemented = material3Catalog.components.get(name)?.schema
    expect(implemented).toBeDefined()
    for (const value of cases) {
      expect(parseResult(implemented!, value), JSON.stringify(value)).toEqual(
        parseResult(stock.schema, value),
      )
    }
  })

  it('keeps the checked-in static route byte-for-byte reproducible', () => {
    const generated = buildMaterialCatalogSchema(sourceInlineCatalog())
    const checkedIn = JSON.parse(readFileSync(route, 'utf8'))
    expect(serializeMaterialCatalogSchema(checkedIn)).toBe(serializeMaterialCatalogSchema(generated))
  })
})
