import { MessageProcessor, type A2uiClientAction, type A2uiMessage } from '@a2ui/web_core/v0_9'
import { Material3Provider } from '@language-lit/material3-expressive'
import { render } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'

import { material3Catalogs } from '../src/catalog'
import { A2uiSurface, type A2uiSurfaceModel } from '../src/runtime/A2uiSurface'
import type { Material3ComponentImplementation } from '../src/runtime/adapter'

export function wrap(children: ReactNode, strict = false) {
  const tree = <Material3Provider>{children}</Material3Provider>
  return strict ? <StrictMode>{tree}</StrictMode> : tree
}

/**
 * Processes messages through a real `MessageProcessor` and renders the first
 * surface they create with `A2uiSurface`, the way a host would. The processor
 * carries the same catalogs `useA2ui` registers by default.
 */
export function renderSurface(messages: readonly A2uiMessage[], options: { strict?: boolean } = {}) {
  const actions: A2uiClientAction[] = []
  const errors: unknown[] = []
  const processor = new MessageProcessor<Material3ComponentImplementation>([...material3Catalogs], (action) => {
    actions.push(action)
  })
  processor.onSurfaceCreated((surface) => {
    surface.onError.subscribe((error) => {
      errors.push(error)
    })
  })
  processor.processMessages([...messages])
  const surface = [...processor.model.surfacesMap.values()][0]
  if (!surface) throw new Error('The messages created no surface')
  const view = render(wrap(<A2uiSurface surface={surface as A2uiSurfaceModel} />, options.strict))
  return { ...view, processor, surface, actions, errors }
}
