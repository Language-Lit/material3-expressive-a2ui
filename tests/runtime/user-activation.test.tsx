import { ButtonApi } from '@a2ui/web_core/v0_9/basic_catalog'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'

import { message } from '../../fixtures/messages'
import { renderSurface } from '../../fixtures/render'
import { createMaterial3Catalog } from '../../src/catalog'
import { createMaterial3Component } from '../../src/runtime/adapter'

const SURFACE = 'gesture'
const URL = 'https://example.com/docs'
const openDocs = { call: 'openUrl', args: { url: URL } }

const openButton = [
  { id: 'root', component: 'Button', child: 'label', action: { functionCall: openDocs } },
  { id: 'label', component: 'Text', text: 'Open the docs' },
]

describe('openUrl user activation', () => {
  let open: MockInstance<typeof window.open>

  beforeEach(() => {
    open = vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    open.mockRestore()
  })

  it('opens the URL from a Button click', async () => {
    const user = userEvent.setup()
    const { errors } = renderSurface([message.createSurface(SURFACE), message.updateComponents(SURFACE, openButton)])

    await user.click(screen.getByRole('button', { name: 'Open the docs' }))

    expect(open).toHaveBeenCalledTimes(1)
    expect(open).toHaveBeenCalledWith(URL, '_blank', 'noopener,noreferrer')
    expect(errors).toEqual([])
  })

  it('refuses a call evaluated while rendering a Text', () => {
    const { errors } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [{ id: 'root', component: 'Text', text: openDocs }]),
    ])

    expect(open).not.toHaveBeenCalled()
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toMatchObject({ code: 'EXPRESSION_ERROR', expression: 'openUrl' })
    expect((errors[0] as { message: string }).message).toContain('user-initiated action')
  })

  it('refuses a call a data-model update re-evaluates', () => {
    const { processor, errors } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Text', text: { call: 'openUrl', args: { url: { path: '/target' } } } },
      ]),
      message.updateDataModel(SURFACE, { target: 'https://example.com/first' }),
    ])
    const before = errors.length

    act(() => {
      processor.processMessages([message.updateDataModel(SURFACE, { target: 'https://example.com/second' })])
    })

    expect(open).not.toHaveBeenCalled()
    expect(errors.length).toBeGreaterThan(before)
  })

  it('does not treat a value setter as a user action', async () => {
    const user = userEvent.setup()
    const { errors } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Column', children: ['field', 'echo'] },
        { id: 'field', component: 'TextField', label: 'Target', value: { path: '/target' } },
        { id: 'echo', component: 'Text', text: { call: 'openUrl', args: { url: { path: '/target' } } } },
      ]),
      message.updateDataModel(SURFACE, { target: 'https://example.com/' }),
    ])
    const before = errors.length

    await user.type(screen.getByLabelText('Target'), 'x')

    expect(open).not.toHaveBeenCalled()
    expect(errors.length).toBeGreaterThan(before)
  })

  it('refuses a click the browser reports as outside a user gesture', async () => {
    Object.defineProperty(navigator, 'userActivation', {
      value: { isActive: false, hasBeenActive: false },
      configurable: true,
    })
    try {
      const user = userEvent.setup()
      const { errors } = renderSurface([message.createSurface(SURFACE), message.updateComponents(SURFACE, openButton)])

      await user.click(screen.getByRole('button', { name: 'Open the docs' }))

      expect(open).not.toHaveBeenCalled()
      expect(errors[0]).toMatchObject({ code: 'EXPRESSION_ERROR', expression: 'openUrl' })
    } finally {
      delete (navigator as { userActivation?: unknown }).userActivation
    }
  })

  it('wraps the action of a component built with createMaterial3Component', async () => {
    const PlainButton = createMaterial3Component(ButtonApi, ({ props, buildChild }) => (
      <button type="button" onClick={() => (typeof props.action === 'function' ? props.action() : undefined)}>
        {typeof props.child === 'string' ? buildChild(props.child) : null}
      </button>
    ))
    const user = userEvent.setup()
    const { errors } = renderSurface([message.createSurface(SURFACE), message.updateComponents(SURFACE, openButton)], {
      catalogs: [createMaterial3Catalog({ components: [PlainButton] })],
    })

    await user.click(screen.getByRole('button', { name: 'Open the docs' }))

    expect(open).toHaveBeenCalledWith(URL, '_blank', 'noopener,noreferrer')
    expect(errors).toEqual([])
  })
})
