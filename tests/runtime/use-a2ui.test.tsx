import type { A2uiClientAction } from '@a2ui/web_core/v0_9'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode, useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { message } from '../../fixtures/messages'
import { wrap } from '../../fixtures/render'
import { BASIC_CATALOG_ID } from '../../src/catalog'
import { A2uiSurface } from '../../src/runtime/A2uiSurface'
import { useA2ui, type UseA2uiResult } from '../../src/runtime/useA2ui'

function Host({
  onReady,
  onAction,
  onError,
}: {
  onReady: (a2ui: UseA2uiResult) => void
  onAction?: (action: A2uiClientAction) => void
  onError?: (error: unknown, surfaceId?: string) => void
}) {
  const a2ui = useA2ui({ onAction, onError })
  useEffect(() => {
    onReady(a2ui)
  }, [a2ui, onReady])
  return (
    <div>
      <output data-testid="count">{a2ui.surfaces.length}</output>
      {a2ui.surfaces.map((surface) => (
        <A2uiSurface key={surface.id} surface={surface} />
      ))}
    </div>
  )
}

describe('useA2ui', () => {
  it('tracks surfaces as messages create and delete them', () => {
    let a2ui!: UseA2uiResult
    render(wrap(<Host onReady={(value) => (a2ui = value)} />))
    expect(screen.getByTestId('count').textContent).toBe('0')

    act(() => {
      a2ui.processMessages([
        message.createSurface('a', { theme: { agentDisplayName: 'Concierge' } }),
        message.updateComponents('a', [{ id: 'root', component: 'Text', text: 'Hello from A' }]),
        message.createSurface('b'),
        message.updateComponents('b', [{ id: 'root', component: 'Text', text: 'Hello from B' }]),
      ])
    })
    expect(screen.getByTestId('count').textContent).toBe('2')
    expect(screen.getByText('Hello from A')).toBeDefined()
    expect(screen.getByText('Hello from B')).toBeDefined()
    expect(screen.getByText('Concierge')).toBeDefined()

    act(() => {
      a2ui.processMessages([message.deleteSurface('a')])
    })
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(screen.queryByText('Hello from A')).toBeNull()

    act(() => {
      a2ui.clear()
    })
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('exposes capabilities and forwards actions and errors', () => {
    const onAction = vi.fn()
    const onError = vi.fn()
    let a2ui!: UseA2uiResult
    render(wrap(<Host onReady={(value) => (a2ui = value)} onAction={onAction} onError={onError} />))

    expect(a2ui.getClientCapabilities()['v0.9.1']?.supportedCatalogIds).toEqual([BASIC_CATALOG_ID])

    act(() => {
      a2ui.processMessages([message.createSurface('x', { catalogId: 'https://example.com/none.json' })])
    })
    expect(onError).toHaveBeenCalledTimes(1)

    act(() => {
      a2ui.processMessages([
        message.createSurface('s'),
        message.updateComponents('s', [
          { id: 'root', component: 'Button', child: 'l', action: { event: { name: 'ping', context: { n: 1 } } } },
          { id: 'l', component: 'Text', text: 'Ping' },
        ]),
      ])
    })
    act(() => {
      screen.getByRole('button', { name: 'Ping' }).click()
    })
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onAction.mock.calls[0]?.[0]).toMatchObject({ name: 'ping', surfaceId: 's', context: { n: 1 } })
  })

  it('does not mutate the messages it is given, so they can be replayed', () => {
    // web_core keeps updateDataModel values by reference and writes bound
    // input into them. A transcript kept in state, or a fixture played twice,
    // must not carry a previous session's edits.
    const batch = [
      { version: 'v0.9.1' as const, createSurface: { surfaceId: 'form', catalogId: BASIC_CATALOG_ID, sendDataModel: true } },
      {
        version: 'v0.9.1' as const,
        updateComponents: {
          surfaceId: 'form',
          components: [
            { id: 'root', component: 'TextField', label: 'Name', value: { path: '/name' } },
          ],
        },
      },
      { version: 'v0.9.1' as const, updateDataModel: { surfaceId: 'form', value: { name: '' } } },
    ]
    const original = JSON.stringify(batch)

    let a2ui!: UseA2uiResult
    const first = render(wrap(<Host onReady={(value) => (a2ui = value)} />))
    act(() => a2ui.processMessages(batch))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada' } })
    expect(a2ui.getClientDataModel()?.surfaces).toEqual({ form: { name: 'Ada' } })
    expect(JSON.stringify(batch)).toBe(original)
    first.unmount()

    render(wrap(<Host onReady={(value) => (a2ui = value)} />))
    act(() => a2ui.processMessages(batch))
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('')
    expect(a2ui.getClientDataModel()?.surfaces).toEqual({ form: { name: '' } })
  })

  it('survives a StrictMode remount that replays a mount-time batch', () => {
    function Replay() {
      const a2ui = useA2ui()
      useEffect(() => {
        a2ui.processMessages([
          message.createSurface('once'),
          message.updateComponents('once', [{ id: 'root', component: 'Text', text: 'Only once' }]),
        ])
      }, [a2ui.processMessages])
      return <>{a2ui.surfaces.map((surface) => <A2uiSurface key={surface.id} surface={surface} />)}</>
    }
    render(<StrictMode>{wrap(<Replay />)}</StrictMode>)
    expect(screen.getAllByText('Only once')).toHaveLength(1)
  })
})
