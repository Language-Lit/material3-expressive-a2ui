import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { message } from '../../fixtures/messages'
import { renderSurface } from '../../fixtures/render'

const SURFACE = 's1'

describe('data binding', () => {
  it('writes typed text back to the data model and reads model updates', async () => {
    const user = userEvent.setup()
    const { surface, processor } = renderSurface([
      message.createSurface(SURFACE, { sendDataModel: true }),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Column', children: ['name', 'greeting'] },
        { id: 'name', component: 'TextField', label: 'Name', value: { path: '/name' } },
        { id: 'greeting', component: 'Text', text: { path: '/name' } },
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
    expect(processor.getClientDataModel()?.surfaces?.[SURFACE]).toEqual({ name: 'Grace' })

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
        { id: 'email', component: 'TextField', label: 'Email', value: { path: '/email' } },
        {
          id: 'submit',
          component: 'Button',
          child: 'submit_label',
          variant: 'primary',
          action: { event: { name: 'subscribe', context: { email: { path: '/email' }, plan: 'pro' } } },
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

  it('disables a checked button until its checks pass and shows the message after input', async () => {
    const user = userEvent.setup()
    renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Column', children: ['email', 'submit'] },
        {
          id: 'email',
          component: 'TextField',
          label: 'Email',
          value: { path: '/email' },
          checks: [
            {
              condition: { call: 'email', args: { value: { path: '/email' } }, returnType: 'boolean' },
              message: 'Enter a valid email address.',
            },
          ],
        },
        {
          id: 'submit',
          component: 'Button',
          child: 'label',
          action: { event: { name: 'go' } },
          checks: [
            {
              condition: { call: 'email', args: { value: { path: '/email' } }, returnType: 'boolean' },
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
            call: 'formatCurrency',
            args: { value: { path: '/price' }, currency: 'USD' },
            returnType: 'string',
          },
        },
        {
          id: 'count',
          component: 'Text',
          text: { call: 'formatString', args: { value: '${/n} items' }, returnType: 'string' },
        },
      ]),
      message.updateDataModel(SURFACE, { price: 1234.5, n: 3 }),
    ])
    expect(screen.getByText('$1,234.50')).toBeDefined()
    expect(screen.getByText('3 items')).toBeDefined()
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
          { id: 'agree', component: 'CheckBox', label: 'I agree', value: { path: '/agree' } },
          { id: 'echo', component: 'Text', text: { path: '/agree' } },
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
