import type { ActionPayload, OutboundMessageListener } from '@a2ui/web_core'
import type { AgentToRendererMessage } from '@a2ui/web_core/v1_0'
import { ButtonApi, TextApi } from '@a2ui/web_core/catalogs/basic/v1'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode, useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { message } from '../../fixtures/messages'
import { wrap } from '../../fixtures/render'
import {
  BASIC_CATALOG_ID,
  createMaterial3Catalog,
  MATERIAL_CATALOG_ID,
} from '../../src/catalog'
import { A2uiSurface } from '../../src/runtime/A2uiSurface'
import {
  useA2ui,
  type UseA2uiOptions,
  type UseA2uiResult,
} from '../../src/runtime/useA2ui'
import { createMaterial3Component } from '../../src/runtime/adapter'

function Host({
  onReady,
  onAction,
  onError,
  outboundListener,
  catalogs,
}: {
  onReady: (a2ui: UseA2uiResult) => void
  onAction?: (action: ActionPayload) => void
  onError?: (error: unknown, surfaceId?: string) => void
  outboundListener?: OutboundMessageListener
  catalogs?: UseA2uiOptions['catalogs']
}) {
  const a2ui = useA2ui({ catalogs, onAction, onError, outboundListener })
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
        message.createSurface('a', {
          components: [{ id: 'root', component: 'Text', text: 'Hello from A' }],
        }),
        message.createSurface('b'),
        message.updateComponents('b', [{ id: 'root', component: 'Text', text: 'Hello from B' }]),
      ])
    })
    expect(screen.getByTestId('count').textContent).toBe('2')
    expect(screen.getByText('Hello from A')).toBeDefined()
    expect(screen.getByText('Hello from B')).toBeDefined()

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

  it('exposes v1.0 capabilities and forwards actions and errors', () => {
    const onAction = vi.fn()
    const onError = vi.fn()
    let a2ui!: UseA2uiResult
    render(wrap(<Host onReady={(value) => (a2ui = value)} onAction={onAction} onError={onError} />))

    expect(a2ui.getRendererCapabilities({ versions: ['1.0'] })['1.0']?.supportedCatalogIds).toEqual([
      BASIC_CATALOG_ID,
      MATERIAL_CATALOG_ID,
    ])
    expect(a2ui.getClientCapabilities({ versions: ['1.0'] })['1.0']?.supportedCatalogIds).toEqual([
      BASIC_CATALOG_ID,
      MATERIAL_CATALOG_ID,
    ])

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

  it('handles v1.0 bidirectional renderer and agent function RPCs', async () => {
    const outbound: Parameters<OutboundMessageListener>[0][] = []
    const rpcCatalogId = 'https://example.com/rpc-catalog.json'
    const echoFunction = {
      name: 'echo',
      returnType: 'string' as const,
      allowedCallers: 'rendererOrAgent' as const,
      schema: TextApi.schema.pick({ text: true }),
      execute: (args: Record<string, unknown>) => `echo:${String(args['text'] ?? '')}`,
    }
    const rpcCatalog = createMaterial3Catalog({
      id: rpcCatalogId,
      functions: [echoFunction],
    })
    let a2ui!: UseA2uiResult
    render(
      wrap(
        <Host
          onReady={(value) => (a2ui = value)}
          catalogs={[rpcCatalog]}
          outboundListener={(msg) => {
            outbound.push(msg)
          }}
        />,
      ),
    )

    act(() => {
      a2ui.processMessages([
        message.createSurface('rpc', {
          catalogId: rpcCatalogId,
          components: [{ id: 'root', component: 'Text', text: 'RPC ready' }],
          dataModel: { label: 'hello' },
        }),
      ])
    })

    await act(async () => {
      await a2ui.processMessagesAsync([
        message.callRendererFunction(
          'rpc',
          'call-1',
          'echo',
          { text: { '@path': '/label' } },
          rpcCatalogId,
        ),
      ])
    })

    const rendererResponse = outbound.find((msg) => 'rendererFunctionResponse' in msg)
    expect(rendererResponse).toMatchObject({
      version: '1.0',
      rendererFunctionResponse: {
        functionCallId: 'call-1',
        value: 'echo:hello',
      },
    })

    let pending!: Promise<unknown>
    act(() => {
      pending = a2ui.callAgentFunction('rpc', { '@call': 'lookupPrice', args: { sku: 'M3E' } })
    })
    const agentCall = outbound.find((msg) => 'callAgentFunction' in msg)
    expect(agentCall).toBeDefined()
    const functionCallId =
      agentCall && 'callAgentFunction' in agentCall ? agentCall.callAgentFunction.functionCallId : ''

    act(() => {
      a2ui.processMessages([
        message.agentFunctionResponse(functionCallId, { value: { price: 19.99 } }),
      ])
    })
    await expect(pending).resolves.toEqual({ price: 19.99 })
  })

  it('validates the whole message batch before mutating the processor', () => {
    const onError = vi.fn()
    let a2ui!: UseA2uiResult
    render(wrap(<Host onReady={(value) => (a2ui = value)} onError={onError} />))

    const invalidVersion = {
      version: 'v0.9',
      createSurface: { surfaceId: 'invalid-version', catalogId: BASIC_CATALOG_ID },
    } as unknown as AgentToRendererMessage

    act(() => {
      a2ui.processMessages([message.createSurface('valid'), invalidVersion])
    })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('reports malformed envelopes through onError or throws without a handler', () => {
    const malformed = {
      version: '1.0',
      createSurface: { surfaceId: 123 },
    } as unknown as AgentToRendererMessage
    const onError = vi.fn()
    let handled!: UseA2uiResult
    render(wrap(<Host onReady={(value) => (handled = value)} onError={onError} />))

    act(() => handled.processMessages([malformed]))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('count').textContent).toBe('0')

    let unhandled!: UseA2uiResult
    render(wrap(<Host onReady={(value) => (unhandled = value)} />))
    expect(() => {
      act(() => unhandled.processMessages([malformed]))
    }).toThrow()
    expect(unhandled.surfaces).toHaveLength(0)
  })

  it('accepts a valid wrapper and preserves custom catalog components', () => {
    const CustomButtonApi = {
      name: 'CustomButton',
      schema: ButtonApi.schema.extend({ badge: TextApi.schema.shape.text }),
    }
    const CustomButton = createMaterial3Component(CustomButtonApi, ({ props, buildChild }) => (
      <button
        type="button"
        data-testid="custom-button"
        onClick={() => (typeof props.action === 'function' ? props.action() : undefined)}
      >
        {String(props.badge)} {typeof props.child === 'string' ? buildChild(props.child) : null}
      </button>
    ))
    const catalogId = 'https://example.com/custom-catalog.json'
    const catalog = createMaterial3Catalog({ id: catalogId, components: [CustomButton] })
    let a2ui!: UseA2uiResult
    render(wrap(<Host onReady={(value) => (a2ui = value)} catalogs={[catalog]} />))

    act(() => {
      a2ui.processMessages({
        messages: [
          message.createSurface('wrapped', { catalogId }),
          message.updateComponents('wrapped', [
            {
              id: 'root',
              component: 'CustomButton',
              badge: 'Custom badge',
              child: 'label',
              action: { event: { name: 'custom' } },
            },
            { id: 'label', component: 'Text', text: 'Wrapped' },
          ]),
        ],
      })
    })

    expect(screen.getByTestId('custom-button')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Custom badge Wrapped' })).toBeDefined()
  })

  it('does not mutate the messages it is given, so they can be replayed', () => {
    // web_core keeps updateDataModel values by reference and writes bound
    // input into them. A transcript kept in state, or a fixture played twice,
    // must not carry a previous session's edits.
    const batch: AgentToRendererMessage[] = [
      { version: '1.0', createSurface: { surfaceId: 'form', catalogId: BASIC_CATALOG_ID, sendDataModel: true } },
      {
        version: '1.0',
        updateComponents: {
          surfaceId: 'form',
          components: [
            { id: 'root', component: 'TextField', label: 'Name', value: { '@path': '/name' } },
          ],
        },
      },
      { version: '1.0', updateDataModel: { surfaceId: 'form', value: { name: '' } } },
    ]
    const original = JSON.stringify(batch)

    let a2ui!: UseA2uiResult
    const first = render(wrap(<Host onReady={(value) => (a2ui = value)} />))
    act(() => a2ui.processMessages(batch))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada' } })
    expect(a2ui.getRendererDataModel()?.surfaces).toEqual({ form: { name: 'Ada' } })
    expect(a2ui.getClientDataModel()?.surfaces).toEqual({ form: { name: 'Ada' } })
    expect(JSON.stringify(batch)).toBe(original)
    first.unmount()

    render(wrap(<Host onReady={(value) => (a2ui = value)} />))
    act(() => a2ui.processMessages(batch))
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('')
    expect(a2ui.getRendererDataModel()?.surfaces).toEqual({ form: { name: '' } })
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
