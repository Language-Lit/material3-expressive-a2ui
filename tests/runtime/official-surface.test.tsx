import { A2uiSurface as OfficialSurface, type ReactComponentImplementation } from '@a2ui/react/v0_9'
import { MessageProcessor, type A2uiClientAction } from '@a2ui/web_core/v0_9'
import { Material3Provider } from '@language-lit/material3-expressive'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { message } from '../../fixtures/messages'
import { material3Catalog } from '../../src'

/**
 * The catalog is written to the render-only contract Google's own React
 * surface consumes, so it must work under that surface without this package's
 * `A2uiSurface`. This test proves it against the installed `@a2ui/react`.
 */
describe('material3Catalog under the official @a2ui/react surface', () => {
  it('renders Material components, binds an input and dispatches an action', async () => {
    const actions: A2uiClientAction[] = []
    const processor = new MessageProcessor<ReactComponentImplementation>(
      [material3Catalog],
      (action) => {
        actions.push(action)
      },
      { version: 'v0.9.1' },
    )
    processor.processMessages([
      message.createSurface('official'),
      message.updateComponents('official', [
        { id: 'root', component: 'Column', children: ['title', 'name', 'go'] },
        { id: 'title', component: 'Text', text: 'Hello from **A2UI**', variant: 'h2' },
        { id: 'name', component: 'TextField', label: 'Name', value: { path: '/name' } },
        {
          id: 'go',
          component: 'Button',
          child: 'go-text',
          action: { event: { name: 'go', context: { name: { path: '/name' } } } },
        },
        { id: 'go-text', component: 'Text', text: 'Go' },
      ]),
      message.updateDataModel('official', { name: 'Ada' }),
    ])
    const surface = processor.model.surfacesMap.get('official')
    expect(surface).toBeDefined()

    const { container } = render(
      <Material3Provider>
        <OfficialSurface surface={surface!} />
      </Material3Provider>,
    )

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toBe('Hello from A2UI')
    expect(heading.querySelector('strong')?.textContent).toBe('A2UI')
    expect(container.querySelector('.m3e-a2ui-column')).not.toBeNull()
    expect(container.querySelector('.m3e-a2ui-text')).not.toBeNull()

    const input = screen.getByLabelText('Name') as HTMLInputElement
    expect(input.value).toBe('Ada')
    await userEvent.clear(input)
    await userEvent.type(input, 'Grace')

    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({
      name: 'go',
      surfaceId: 'official',
      sourceComponentId: 'go',
      context: { name: 'Grace' },
    })
  })
})
