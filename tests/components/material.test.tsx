import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { A2uiMessage } from '@a2ui/web_core/v0_9'
import { message } from '../../fixtures/messages'
import { renderSurface } from '../../fixtures/render'
import example from '../../fixtures/material/examples/01_trip-planner.json'
import { MATERIAL_CATALOG_ID } from '../../src/catalog'

const id = 'material'
const create = () => message.createSurface(id, { catalogId: MATERIAL_CATALOG_ID })
const options = [
  { label: 'Alpha', value: 'a' },
  { label: 'Beta', value: 'b' },
]
function render(components: Record<string, unknown>[], data: unknown = {}) {
  return renderSurface(
    [create(), message.updateDataModel(id, data), message.updateComponents(id, components)],
    { strict: true },
  )
}

describe('Material extension through the real protocol', () => {
  it('renders the complete example and resolves templated carousel children', () => {
    const { errors } = renderSurface(example.messages as A2uiMessage[], { strict: true })
    expect(screen.getByRole('switch', { name: 'Trip notifications' })).toBeDefined()
    expect(screen.getByRole('combobox', { name: 'Travel style' })).toBeDefined()
    expect(screen.getAllByRole('progressbar')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Review your itinerary/ })).toBeDefined()
    for (const name of ['Kyoto', 'Lisbon', 'Vancouver'])
      expect(screen.getByRole('heading', { name })).toBeDefined()
    expect(errors).toEqual([])
  })

  it('writes switch, select, chip and segmented values and dispatches the edited context', async () => {
    const { surface, processor, actions, errors } = render(
      [
        {
          id: 'root',
          component: 'Column',
          children: ['switch', 'select', 'chip', 'segments', 'go'],
        },
        { id: 'switch', component: 'Switch', label: 'Notifications', value: { path: '/on' } },
        { id: 'select', component: 'Select', label: 'Plan', options, value: { path: '/plan' } },
        {
          id: 'chip',
          component: 'Chip',
          label: 'Save',
          value: { path: '/saved' },
          action: { event: { name: 'save', context: { saved: { path: '/saved' } } } },
        },
        {
          id: 'segments',
          component: 'SegmentedButtons',
          label: 'Length',
          options,
          value: { path: '/length' },
        },
        {
          id: 'go',
          component: 'IconButton',
          label: 'Go',
          icon: 'check',
          action: {
            event: {
              name: 'go',
              context: {
                on: { path: '/on' },
                plan: { path: '/plan' },
                length: { path: '/length' },
              },
            },
          },
        },
      ],
      { on: false, plan: 'a', saved: false, length: ['a'] },
    )
    await userEvent.click(screen.getByRole('switch'))
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'Beta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Beta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(surface.dataModel.get('/on')).toBe(true)
    expect(surface.dataModel.get('/plan')).toBe('b')
    expect(surface.dataModel.get('/length')).toEqual(['b'])
    expect(actions[0]).toMatchObject({ name: 'save', context: { saved: true } })
    expect(actions[1]).toMatchObject({
      name: 'go',
      context: { on: true, plan: 'b', length: ['b'] },
    })
    act(() =>
      processor.processMessages([
        message.updateDataModel(id, { on: false, plan: 'a', saved: false, length: ['a'] }),
      ]),
    )
    expect((screen.getByRole('switch') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('Alpha')
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('aria-pressed')).toBe('false')
    expect((screen.getByRole('radio', { name: 'Alpha' }) as HTMLInputElement).checked).toBe(true)
    expect(errors).toEqual([])
  })

  it('keeps literal values editable and supports multiple segmented selections', async () => {
    const { errors } = render([
      { id: 'root', component: 'Column', children: ['switch', 'segments'] },
      { id: 'switch', component: 'Switch', label: 'Local', value: false },
      {
        id: 'segments',
        component: 'SegmentedButtons',
        label: 'Many',
        options,
        multiple: true,
        value: ['a'],
      },
    ])
    await userEvent.click(screen.getByRole('switch'))
    expect((screen.getByRole('switch') as HTMLInputElement).checked).toBe(true)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Beta' }))
    expect((screen.getByRole('checkbox', { name: 'Alpha' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('checkbox', { name: 'Beta' }) as HTMLInputElement).checked).toBe(true)
    expect(errors).toEqual([])
  })

  it('gates actions with checks and displays associated input errors after interaction', async () => {
    const checks = [{ condition: { path: '/valid' }, message: 'Please correct this' }]
    const { processor, actions, errors } = render(
      [
        {
          id: 'root',
          component: 'Column',
          children: ['switch', 'select', 'segments', 'go', 'chip', 'row'],
        },
        { id: 'switch', component: 'Switch', label: 'Confirm', value: false, checks },
        { id: 'select', component: 'Select', label: 'Plan', options, value: 'a', checks },
        {
          id: 'segments',
          component: 'SegmentedButtons',
          label: 'Length',
          options,
          value: ['a'],
          checks,
        },
        {
          id: 'go',
          component: 'IconButton',
          label: 'Submit',
          icon: 'check',
          checks,
          action: { event: { name: 'submit' } },
        },
        {
          id: 'chip',
          component: 'Chip',
          label: 'Assist',
          checks,
          action: { event: { name: 'assist' } },
        },
        {
          id: 'row',
          component: 'ListItem',
          headline: 'Continue',
          checks,
          action: { event: { name: 'continue' } },
        },
      ],
      { valid: false },
    )
    expect(screen.queryByText('Please correct this')).toBeNull()
    for (const name of ['Submit', 'Assist', 'Continue']) {
      const button = screen.getByRole('button', { name }) as HTMLButtonElement
      expect(button.disabled).toBe(true)
      await userEvent.click(button)
    }
    expect(actions).toEqual([])
    await userEvent.click(screen.getByRole('switch'))
    const errorId = screen.getByRole('switch').getAttribute('aria-describedby')!
    expect(document.getElementById(errorId)?.textContent).toBe('Please correct this')
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'Beta' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Beta' }))
    expect(screen.getAllByText('Please correct this')).toHaveLength(3)
    act(() => processor.processMessages([message.updateDataModel(id, { valid: true })]))
    expect(screen.queryByText('Please correct this')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(actions).toHaveLength(1)
    expect(errors).toEqual([])
  })

  it('resolves progress bindings and moves between determinate and indeterminate states', () => {
    const { processor, errors } = render(
      [{ id: 'root', component: 'Progress', label: 'Upload', value: { path: '/value' }, max: 10 }],
      { value: 4 },
    )
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('4')
    act(() => processor.processMessages([message.updateDataModel(id, { value: 20 })]))
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('10')
    act(() =>
      processor.processMessages([
        message.updateDataModel(id, { value: null }),
        message.updateComponents(id, [
          { id: 'root', component: 'Progress', label: 'Upload', circular: true },
        ]),
      ]),
    )
    expect(screen.getByRole('progressbar').hasAttribute('aria-valuenow')).toBe(false)
    expect(errors).toEqual([])
  })

  it('anchors tooltip focus and description to a native control that arrives later', async () => {
    const { processor, errors } = render([
      { id: 'root', component: 'Tooltip', child: 'late', text: 'Helpful detail' },
    ])
    await act(async () =>
      processor.processMessages([
        message.updateComponents(id, [
          {
            id: 'late',
            component: 'IconButton',
            icon: 'help',
            label: 'Help',
            action: { event: { name: 'help' } },
          },
        ]),
      ]),
    )
    const button = screen.getByRole('button', { name: 'Help' })
    await userEvent.tab()
    expect(document.activeElement).toBe(button)
    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip.textContent).toBe('Helpful detail')
    expect(button.getAttribute('aria-describedby')?.split(' ')).toContain(tooltip.id)
    expect(document.activeElement).toBe(button)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull())
    await act(async () =>
      processor.processMessages([
        message.updateComponents(id, [
          { id: 'root', component: 'Tooltip', child: 'replacement', text: 'New detail' },
          {
            id: 'replacement',
            component: 'IconButton',
            icon: 'info',
            label: 'Information',
            action: { event: { name: 'info' } },
          },
        ]),
      ]),
    )
    expect(button.getAttribute('aria-describedby')).toBeNull()
    await userEvent.tab()
    const replacementTooltip = await screen.findByRole('tooltip')
    expect(replacementTooltip.textContent).toBe('New detail')
    expect(
      screen
        .getByRole('button', { name: 'Information' })
        .getAttribute('aria-describedby')
        ?.split(' '),
    ).toContain(replacementTooltip.id)
    expect(errors).toEqual([])
  })

  it('updates templated carousel content without losing the item data scopes', () => {
    const { processor, errors } = render(
      [
        { id: 'root', component: 'Carousel', children: { componentId: 'item', path: '/items' } },
        { id: 'item', component: 'Text', text: { path: 'name' }, variant: 'h3' },
      ],
      { items: [{ name: 'First' }, { name: 'Second' }] },
    )
    expect(screen.getByRole('heading', { name: 'Second' })).toBeDefined()
    act(() => processor.processMessages([message.updateDataModel(id, 'Updated', '/items/1/name')]))
    expect(screen.getByRole('heading', { name: 'Updated' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'First' })).toBeDefined()
    expect(errors).toEqual([])
  })

  it('keeps a filter chip stable before its data arrives and resolves a function label', async () => {
    const { processor, surface, errors } = render(
      [
        {
          id: 'root',
          component: 'Chip',
          label: { call: 'formatString', args: { value: 'Save ${/name}' } },
          value: { path: '/saved' },
        },
      ],
      { name: 'trip' },
    )
    const chip = screen.getByRole('button', { name: 'Save trip' })
    expect(chip.getAttribute('aria-pressed')).toBe('false')
    await userEvent.click(chip)
    expect(surface.dataModel.get('/saved')).toBe(true)
    act(() =>
      processor.processMessages([message.updateDataModel(id, { saved: false, name: 'journey' })]),
    )
    expect(screen.getByRole('button', { name: 'Save journey' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
    expect(errors).toEqual([])
  })

  it('honors a bound disabled state on every control', async () => {
    const controls = [
      { id: 'switch', component: 'Switch', label: 'Switch', value: false },
      { id: 'select', component: 'Select', label: 'Select', options, value: 'a' },
      { id: 'segments', component: 'SegmentedButtons', label: 'Segments', options, value: ['a'] },
      {
        id: 'icon',
        component: 'IconButton',
        label: 'Icon',
        icon: 'help',
        action: { event: { name: 'icon' } },
      },
      { id: 'chip', component: 'Chip', label: 'Chip', action: { event: { name: 'chip' } } },
      { id: 'item', component: 'ListItem', headline: 'Item', action: { event: { name: 'item' } } },
    ]
    const { processor, container, actions, errors } = render(
      [
        { id: 'root', component: 'Column', children: controls.map((control) => control.id) },
        ...controls.map((control) => ({ ...control, disabled: { path: '/disabled' } })),
      ],
      { disabled: true },
    )
    for (const control of container.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
      'input, button',
    )) {
      expect(control.disabled).toBe(true)
      await userEvent.click(control)
    }
    expect(actions).toEqual([])
    act(() => processor.processMessages([message.updateDataModel(id, { disabled: false })]))
    for (const control of container.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
      'input, button',
    ))
      expect(control.disabled).toBe(false)
    expect(errors).toEqual([])
  })
})
