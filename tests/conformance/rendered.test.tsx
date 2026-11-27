import { act, render, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MessageProcessor } from '@a2ui/web_core'

import { BASIC_CATALOG_ID, material3Catalog } from '../../src/catalog'
import { A2uiSurface, type A2uiSurfaceModel } from '../../src/runtime/A2uiSurface'
import type { Material3ComponentImplementation } from '../../src/runtime/adapter'
import { wrap } from '../../fixtures/render'

function createProcessor() {
  return new MessageProcessor<Material3ComponentImplementation>([material3Catalog], undefined, { version: '1.0' })
}

function createBoundTextSurface(
  processor: MessageProcessor<Material3ComponentImplementation>,
  surfaceId: string,
) {
  processor.processMessages([
    {
      version: '1.0',
      createSurface: { surfaceId, catalogId: BASIC_CATALOG_ID },
    },
    {
      version: '1.0',
      updateComponents: {
        surfaceId,
        components: [{ id: 'root', component: 'Text', text: { '@path': '/label' } }],
      },
    },
    {
      version: '1.0',
      updateDataModel: { surfaceId, path: '/label', value: 'before' },
    },
  ])
  const surface = processor.model.getSurface(surfaceId)
  if (!surface) throw new Error('The conformance surface was not created')
  return surface as A2uiSurfaceModel
}

describe('upstream vectors through the rendered A2uiSurface', () => {
  it('updates and deletes a bound value through v1.0 null deletion', () => {
    const processor = createProcessor()
    const surface = createBoundTextSurface(processor, 'reactive')
    const view = render(wrap(<A2uiSurface surface={surface} />))

    try {
      expect(view.container.textContent).toContain('before')
      act(() => {
        processor.processMessages([
          {
            version: '1.0',
            updateDataModel: { surfaceId: 'reactive', path: '/label', value: 'after' },
          },
        ])
      })
      expect(view.container.textContent).toContain('after')
      expect(view.container.textContent).not.toContain('before')

      act(() => {
        processor.processMessages([
          {
            version: '1.0',
            updateDataModel: { surfaceId: 'reactive', path: '/label', value: null },
          },
        ])
      })
      expect(view.container.textContent).not.toContain('after')
    } finally {
      view.unmount()
      surface.dispose()
    }
  })

  it('keeps two surfaces isolated while both render through the catalog', () => {
    const processor = createProcessor()
    const first = createBoundTextSurface(processor, 'first')
    const second = createBoundTextSurface(processor, 'second')
    const view = render(
      wrap(
        <>
          <A2uiSurface surface={first} />
          <A2uiSurface surface={second} />
        </>,
      ),
    )

    try {
      const firstFrame = view.container.querySelector('[data-a2ui-surface="first"]')
      const secondFrame = view.container.querySelector('[data-a2ui-surface="second"]')
      expect(firstFrame).not.toBeNull()
      expect(secondFrame).not.toBeNull()
      expect(within(firstFrame as HTMLElement).getByText('before')).toBeDefined()
      expect(within(secondFrame as HTMLElement).getByText('before')).toBeDefined()

      act(() => {
        processor.processMessages([
          {
            version: '1.0',
            updateDataModel: { surfaceId: 'first', path: '/label', value: 'only first' },
          },
        ])
      })
      expect(within(firstFrame as HTMLElement).getByText('only first')).toBeDefined()
      expect(within(secondFrame as HTMLElement).getByText('before')).toBeDefined()
    } finally {
      view.unmount()
      first.dispose()
      second.dispose()
    }
  })
})
