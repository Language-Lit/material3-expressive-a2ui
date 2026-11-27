import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { message } from '../../fixtures/messages'
import { renderSurface } from '../../fixtures/render'
import { BASIC_CATALOG_ID, MATERIAL_CATALOG_ID } from '../../src/catalog'

const SURFACE = 's1'

describe('data binding', () => {
  it('writes typed text back to the data model and reads model updates', async () => {
    const user = userEvent.setup()
    const { surface, processor } = renderSurface([
      message.createSurface(SURFACE, { sendDataModel: true }),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Column', children: ['name', 'greeting'] },
        { id: 'name', component: 'TextField', label: 'Name', value: { '@path': '/name' } },
        { id: 'greeting', component: 'Text', text: { '@path': '/name' } },
      ]),
      message.updateDataModel(SURFACE, { name: 'Ada' }),
    ])

    const field = screen.getByLabelText('Name') as HTMLInputElement
    expect(field.value).toBe('Ada')
    expect(screen.getByText('Ada')).toBeDefined()

    await user.clear(field)
    await user.type(field, 'Grace')
    expect(surface.dataModel.get('/name')).toBe('Grace')
    await waitFor(() => expect(screen.getByText('Grace')).toBeDefined())
    expect((processor.getRendererDataModel()?.surfaces as Record<string, unknown> | undefined)?.[SURFACE]).toEqual({ name: 'Grace' })

    act(() => {
      processor.processMessages([message.updateDataModel(SURFACE, 'Linus', '/name')])
    })
    await waitFor(() => expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Linus'))
  })

  it('dispatches a button action with its context resolved from the model', async () => {
    const user = userEvent.setup()
    const { actions } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Column', children: ['email', 'submit'] },
        { id: 'email', component: 'TextField', label: 'Email', value: { '@path': '/email' } },
        {
          id: 'submit',
          component: 'Button',
          child: 'submit_label',
          variant: 'primary',
          action: {
            event: {
              name: 'subscribe',
              context: { email: { '@path': '/email' }, plan: 'pro' },
              userMessage: 'Subscribe me to Pro',
            },
          },
        },
        { id: 'submit_label', component: 'Text', text: 'Subscribe' },
      ]),
      message.updateDataModel(SURFACE, { email: 'ada@example.com' }),
    ])

    await user.click(screen.getByRole('button', { name: 'Subscribe' }))
    await waitFor(() => expect(actions).toHaveLength(1))
    expect(actions[0]).toMatchObject({
      name: 'subscribe',
      surfaceId: SURFACE,
      sourceComponentId: 'submit',
      context: { email: 'ada@example.com', plan: 'pro' },
    })
    expect(typeof actions[0]?.timestamp).toBe('string')
  })

  it('disables a checked button until its @checks pass and shows the message after input', async () => {
    const user = userEvent.setup()
    renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Column', children: ['email', 'submit'] },
        {
          id: 'email',
          component: 'TextField',
          label: 'Email',
          value: { '@path': '/email' },
          '@checks': [
            {
              condition: { '@call': 'email', args: { value: { '@path': '/email' } } },
              message: 'Enter a valid email address.',
            },
          ],
        },
        {
          id: 'submit',
          component: 'Button',
          child: 'label',
          action: { event: { name: 'go' } },
          '@checks': [
            {
              condition: { '@call': 'email', args: { value: { '@path': '/email' } } },
              message: 'Fix the email first.',
            },
          ],
        },
        { id: 'label', component: 'Text', text: 'Continue' },
      ]),
    ])

    const button = screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.queryByText('Enter a valid email address.')).toBeNull()

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await waitFor(() => expect(screen.getByText('Enter a valid email address.')).toBeDefined())

    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await waitFor(() => expect(button.disabled).toBe(false))
    expect(screen.queryByText('Enter a valid email address.')).toBeNull()
  })

  it('formats values through the catalog functions', () => {
    renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Column', children: ['price', 'count'] },
        {
          id: 'price',
          component: 'Text',
          text: {
            '@call': 'formatCurrency',
            args: { value: { '@path': '/price' }, currency: 'USD' },
          },
        },
        {
          id: 'count',
          component: 'Text',
          text: { '@call': 'formatString', args: { value: '${/n} items' } },
        },
      ]),
      message.updateDataModel(SURFACE, { price: 1234.5, n: 3 }),
    ])
    expect(screen.getByText('$1,234.50')).toBeDefined()
    expect(screen.getByText('3 items')).toBeDefined()
  })

  it('supports single-message createSurface with inline components and dataModel', () => {
    const { errors } = renderSurface([
      message.createSurface(SURFACE, {
        components: [
          { id: 'root', component: 'Column', children: ['title', 'body'] },
          { id: 'title', component: 'Text', text: '## Instant surface' },
          { id: 'body', component: 'Text', text: { '@path': '/greeting' } },
        ],
        dataModel: { greeting: 'Initialized in one message' },
      }),
    ])
    expect(screen.getByRole('heading', { level: 2, name: 'Instant surface' })).toBeDefined()
    expect(screen.getByText('Initialized in one message')).toBeDefined()
    expect(errors).toEqual([])
  })

  it('resolves mixed catalogs on a surface without a default catalogId', async () => {
    const user = userEvent.setup()
    const { surface, errors } = renderSurface([
      message.createSurface(SURFACE, {
        catalogId: undefined,
        components: [
          { id: 'root', component: 'Column', '@catalogId': BASIC_CATALOG_ID, children: ['title', 'toggle'] },
          { id: 'title', component: 'Text', '@catalogId': BASIC_CATALOG_ID, text: 'Mixed catalogs' },
          {
            id: 'toggle',
            component: 'Switch',
            '@catalogId': MATERIAL_CATALOG_ID,
            label: 'Alerts',
            value: { '@path': '/alerts' },
          },
        ],
        dataModel: { alerts: false },
      }),
    ])
    expect(screen.getByText('Mixed catalogs')).toBeDefined()
    await user.click(screen.getByRole('switch', { name: 'Alerts' }))
    expect(surface.dataModel.get('/alerts')).toBe(true)
    expect(errors).toEqual([])
  })

  it('applies v1.0 @accessibility live and hidden regions', () => {
    const { container, processor, errors } = renderSurface([
      message.createSurface(SURFACE, {
        components: [
          { id: 'root', component: 'Column', children: ['status', 'secret'] },
          {
            id: 'status',
            component: 'Text',
            text: { '@path': '/status' },
            '@accessibility': { live: 'polite' },
          },
          {
            id: 'secret',
            component: 'Text',
            text: 'Decorative note',
            '@accessibility': { hidden: { '@path': '/hideSecret' } },
          },
        ],
        dataModel: { status: 'Saved', hideSecret: true },
      }),
    ])
    const regions = container.querySelectorAll('.m3e-a2ui-a11y')
    expect(regions).toHaveLength(2)
    expect(regions[0]?.getAttribute('aria-live')).toBe('polite')
    expect(regions[1]?.getAttribute('aria-hidden')).toBe('true')
    expect(regions[1]?.hasAttribute('inert')).toBe(true)

    act(() => {
      processor.processMessages([message.updateDataModel(SURFACE, false, '/hideSecret')])
    })
    expect(regions[1]?.getAttribute('aria-hidden')).toBe('false')
    expect(regions[1]?.hasAttribute('inert')).toBe(false)
    expect(errors).toEqual([])
  })

  it('evaluates the v1.0 @index system function inside a ChildList template', () => {
    const { errors } = renderSurface([
      message.createSurface(SURFACE, {
        components: [
          { id: 'root', component: 'List', children: { componentId: 'item', path: '/fruits' } },
          {
            id: 'item',
            component: 'Text',
            text: { '@call': 'formatString', args: { value: '${@index()}: ${name}' } },
          },
        ],
        dataModel: { fruits: [{ name: 'Apple' }, { name: 'Pear' }] },
      }),
    ])
    expect(screen.getByText('0: Apple')).toBeDefined()
    expect(screen.getByText('1: Pear')).toBeDefined()
    expect(errors).toEqual([])
  })

  it('renders a component that arrives after the parent that references it', async () => {
    const { container, processor } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [{ id: 'root', component: 'Column', children: ['late'] }]),
    ])
    expect(container.querySelector('.m3e-a2ui-placeholder')).not.toBeNull()

    act(() => {
      processor.processMessages([
        message.updateComponents(SURFACE, [{ id: 'late', component: 'Text', text: 'Arrived' }]),
      ])
    })
    await waitFor(() => expect(screen.getByText('Arrived')).toBeDefined())
    expect(container.querySelector('.m3e-a2ui-placeholder')).toBeNull()
  })

  it('reports an unknown component to the surface instead of crashing', async () => {
    const { errors } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [{ id: 'root', component: 'Gauge', value: 1 }]),
    ])
    expect(screen.getByText(/Unsupported component/)).toBeDefined()
    await waitFor(() => expect(errors).toHaveLength(1))
    expect(errors[0]).toMatchObject({ code: 'UNKNOWN_COMPONENT', surfaceId: SURFACE })
  })

  it('works under StrictMode', async () => {
    const user = userEvent.setup()
    const { surface } = renderSurface(
      [
        message.createSurface(SURFACE),
        message.updateComponents(SURFACE, [
          { id: 'root', component: 'Column', children: ['agree', 'echo'] },
          { id: 'agree', component: 'CheckBox', label: 'I agree', value: { '@path': '/agree' } },
          { id: 'echo', component: 'Text', text: { '@path': '/agree' } },
        ]),
        message.updateDataModel(SURFACE, { agree: false }),
      ],
      { strict: true },
    )
    await user.click(screen.getByLabelText('I agree'))
    await waitFor(() => expect(surface.dataModel.get('/agree')).toBe(true))
    await waitFor(() => expect(screen.getByText('true')).toBeDefined())
  })
})
