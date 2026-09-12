import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { message } from '../../fixtures/messages'
import { renderSurface } from '../../fixtures/render'
import { fromPickerValue, hasExplicitZone, toPickerValue } from '../../src/components/DateTimeInput/DateTimeInput'
import { toMaterialSymbol } from '../../src/components/Icon'
import { sliderPrecision, stepPrecision } from '../../src/components/Slider/Slider'
import { resolveIconGlyph, toCatalogIconName } from '../../src/internal/icons'

const SURFACE = 'controls'

describe('ChoicePicker', () => {
  it('keeps one value when mutually exclusive and renders radios', async () => {
    const user = userEvent.setup()
    const { surface } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        {
          id: 'root',
          component: 'ChoicePicker',
          label: 'Size',
          options: [
            { label: 'Small', value: 's' },
            { label: 'Large', value: 'l' },
          ],
          value: { path: '/size' },
        },
      ]),
      message.updateDataModel(SURFACE, { size: ['s'] }),
    ])
    expect(screen.getByRole('radiogroup', { name: 'Size' })).toBeDefined()
    expect((screen.getByLabelText('Small') as HTMLInputElement).checked).toBe(true)
    await user.click(screen.getByLabelText('Large'))
    await waitFor(() => expect(surface.dataModel.get('/size')).toEqual(['l']))
  })

  it('toggles values when multiple selection is allowed and renders chips', async () => {
    const user = userEvent.setup()
    const { surface } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        {
          id: 'root',
          component: 'ChoicePicker',
          variant: 'multipleSelection',
          displayStyle: 'chips',
          filterable: true,
          options: [
            { label: 'Cheese', value: 'cheese' },
            { label: 'Olives', value: 'olives' },
            { label: 'Basil', value: 'basil' },
          ],
          value: { path: '/toppings' },
        },
      ]),
      message.updateDataModel(SURFACE, { toppings: ['cheese'] }),
    ])
    await user.click(screen.getByRole('button', { name: 'Olives' }))
    await waitFor(() => expect(surface.dataModel.get('/toppings')).toEqual(['cheese', 'olives']))
    await user.click(screen.getByRole('button', { name: 'Cheese' }))
    await waitFor(() => expect(surface.dataModel.get('/toppings')).toEqual(['olives']))

    await user.type(screen.getByLabelText('Filter'), 'bas')
    expect(screen.queryByRole('button', { name: 'Olives' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Basil' })).toBeDefined()
  })
})

describe('Slider', () => {
  it('binds a number and labels the control', () => {
    renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Slider', label: 'Volume', min: 0, max: 10, value: { path: '/volume' } },
      ]),
      message.updateDataModel(SURFACE, { volume: 7 }),
    ])
    const slider = screen.getByRole('slider', { name: 'Volume' }) as HTMLInputElement
    expect(slider.value).toBe('7')
    expect(slider.max).toBe('10')
    expect(screen.getByText('7')).toBeDefined()
  })

  it('keeps fractional values on a narrow range instead of rounding them away', () => {
    renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Slider', label: 'Progress', min: 0, max: 1, value: { path: '/progress' } },
      ]),
      message.updateDataModel(SURFACE, { progress: 0.45 }),
    ])
    const slider = screen.getByRole('slider', { name: 'Progress' }) as HTMLInputElement
    expect(slider.value).toBe('0.45')
    expect(screen.getByText('0.45')).toBeDefined()
    expect(sliderPrecision(1)).toBe(2)
    expect(sliderPrecision(10)).toBe(1)
    expect(sliderPrecision(100)).toBe(0)
  })
})

describe('DateTimeInput', () => {
  it('picks the native input type from the enabled parts', () => {
    const { container } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Column', children: ['d', 't', 'dt'] },
        { id: 'd', component: 'DateTimeInput', label: 'Day', enableDate: true, value: '2026-09-11' },
        { id: 't', component: 'DateTimeInput', label: 'Hour', enableTime: true, value: '14:30' },
        { id: 'dt', component: 'DateTimeInput', label: 'When', enableDate: true, enableTime: true, value: '2026-09-11T14:30:00' },
      ]),
    ])
    const inputs = [...container.querySelectorAll('input')]
    expect(inputs.map((input) => input.type)).toEqual(['date', 'time', 'datetime-local'])
    expect(inputs.map((input) => input.value)).toEqual(['2026-09-11', '14:30', '2026-09-11T14:30'])
    expect(screen.getByLabelText('Day')).toBe(inputs[0])
  })

  it('reduces ISO 8601 values to what each picker accepts', () => {
    expect(toPickerValue('2026-09-11T14:30:00', 'date')).toBe('2026-09-11')
    expect(toPickerValue('2026-09-11T14:30:00', 'time')).toBe('14:30')
    expect(toPickerValue('14:30:15', 'time')).toBe('14:30')
    expect(toPickerValue('2026-09-11', 'datetime-local')).toBe('')
    expect(toPickerValue('', 'date')).toBe('')
  })

  it('shows an instant in the local time zone and sends one back', () => {
    // The expected wall-clock time is derived here, so the test holds in any zone.
    const instant = new Date('2026-09-11T14:30:00Z')
    const pad = (part: number) => String(part).padStart(2, '0')
    const localDate = `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`
    const localTime = `${pad(instant.getHours())}:${pad(instant.getMinutes())}`

    expect(hasExplicitZone('2026-09-11T14:30:00Z')).toBe(true)
    expect(hasExplicitZone('2026-09-11T14:30:00-03:00')).toBe(true)
    expect(hasExplicitZone('2026-09-11T14:30:00')).toBe(false)
    expect(toPickerValue('2026-09-11T14:30:00Z', 'datetime-local')).toBe(`${localDate}T${localTime}`)
    expect(toPickerValue('2026-09-11T14:30:00Z', 'date')).toBe(localDate)

    expect(fromPickerValue(`${localDate}T${localTime}`, 'datetime-local', '2026-09-11T14:30:00Z')).toBe(
      '2026-09-11T14:30:00.000Z',
    )
    expect(fromPickerValue('2026-09-11T14:30', 'datetime-local', '2026-09-11T09:00:00')).toBe('2026-09-11T14:30')
    expect(fromPickerValue('2026-09-11', 'date', '2026-09-10T00:00:00Z')).toBe('2026-09-11')
  })
})

describe('Icon', () => {
  it('renders embedded glyphs for catalog names and inline paths for svgPath', () => {
    const { container } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Row', children: ['named', 'custom'] },
        { id: 'named', component: 'Icon', name: 'favorite', accessibility: { label: 'Favourite' } },
        { id: 'custom', component: 'Icon', name: { svgPath: 'M0 0h24v24H0z' } },
      ]),
    ])
    expect(screen.getByRole('img', { name: 'Favourite' })).toBeDefined()
    expect(container.querySelectorAll('svg')).toHaveLength(2)
    expect(container.querySelector('.m3e-a2ui-icon--custom path')?.getAttribute('d')).toBe('M0 0h24v24H0z')
  })

  it('maps catalog names to Material Symbols ligatures', () => {
    expect(toMaterialSymbol('arrowBack')).toBe('arrow_back')
    expect(toMaterialSymbol('play')).toBe('play_arrow')
    expect(toMaterialSymbol('favoriteOff')).toBe('favorite_border')
    expect(toMaterialSymbol('home')).toBe('home')
    expect(toMaterialSymbol('priority_high')).toBe('priority_high')
  })

  it('resolves Material Symbols names bound through data to embedded glyphs', () => {
    expect(toCatalogIconName('priority_high')).toBe('priorityHigh')
    expect(toCatalogIconName('arrow-upward')).toBe('arrowUpward')
    expect(toCatalogIconName('favorite')).toBe('favorite')
    expect(resolveIconGlyph('play_arrow')).toBeDefined()
    expect(resolveIconGlyph('trending_up')).toBeDefined()
    expect(resolveIconGlyph('not_a_symbol')).toBeUndefined()

    const { container } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Row', children: ['priority', 'trend'] },
        { id: 'priority', component: 'Icon', name: { path: '/priorityIcon' } },
        { id: 'trend', component: 'Icon', name: { path: '/trendIcon' } },
      ]),
      message.updateDataModel(SURFACE, { priorityIcon: 'priority_high', trendIcon: 'trending_up' }),
    ])
    expect(container.querySelectorAll('svg')).toHaveLength(2)
    expect(container.textContent).not.toContain('priority_high')
  })
})

describe('Tabs and Modal', () => {
  it('renders tabs with panels and switches between them', async () => {
    const user = userEvent.setup()
    renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        {
          id: 'root',
          component: 'Tabs',
          tabs: [
            { title: 'Overview', child: 'one' },
            { title: 'Details', child: 'two' },
          ],
        },
        { id: 'one', component: 'Text', text: 'Overview body' },
        { id: 'two', component: 'Text', text: 'Details body' },
      ]),
    ])
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeDefined()
    expect(screen.getByText('Overview body')).toBeDefined()
    expect(screen.queryByText('Details body')).toBeNull()
    await user.click(screen.getByRole('tab', { name: 'Details' }))
    await waitFor(() => expect(screen.getByText('Details body')).toBeDefined())
  })

  it('opens the modal content from its trigger', async () => {
    const user = userEvent.setup()
    const { actions } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Modal', trigger: 'open', content: 'body' },
        { id: 'open', component: 'Button', child: 'open_label', action: { event: { name: 'opened' } } },
        { id: 'open_label', component: 'Text', text: 'Open' },
        { id: 'body', component: 'Text', text: 'Inside the modal' },
      ]),
    ])
    expect(screen.queryByText('Inside the modal')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(screen.getByText('Inside the modal')).toBeDefined())
    expect(actions.map((action) => action.name)).toEqual(['opened'])
  })
})

describe('Text', () => {
  it('maps variants to heading elements and keeps captions in the variant colour', () => {
    const { container } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Column', children: ['a', 'b', 'c'] },
        { id: 'a', component: 'Text', text: 'Title', variant: 'h1' },
        { id: 'b', component: 'Text', text: 'Note', variant: 'caption' },
        { id: 'c', component: 'Text', text: 'Plain **bold** words' },
      ]),
    ])
    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeDefined()
    expect(container.querySelector('.m3e-a2ui-text--caption')?.tagName).toBe('SPAN')
    expect(container.querySelector('p strong')?.textContent).toBe('bold')
  })

  it('drops a redundant Markdown heading marker from a heading variant', () => {
    renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Column', children: ['a', 'b'] },
        { id: 'a', component: 'Text', text: '# Invitation Builder', variant: 'h1' },
        { id: 'b', component: 'Text', text: '## Details with **emphasis**', variant: 'h3' },
      ]),
    ])
    expect(screen.getByRole('heading', { level: 1, name: 'Invitation Builder' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 3, name: 'Details with emphasis' })).toBeDefined()
  })

  it('renders nested Markdown lists as lists inside list items', () => {
    const { container } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Text', text: 'Pack:\n- Fruit\n  - **Apple**\n  - Pear\n- Bread' },
      ]),
    ])
    const outer = container.querySelector('.m3e-a2ui-text--rich > ul')
    expect(outer?.children).toHaveLength(2)
    const nested = outer?.querySelector('li > ul')
    expect(nested?.querySelectorAll('li')).toHaveLength(2)
    expect(nested?.querySelector('strong')?.textContent).toBe('Apple')
  })

  it('renders a Markdown pipe table with column headers and alignment', () => {
    const { container } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        {
          id: 'root',
          component: 'Text',
          text: 'Order\n\n| Item | Price |\n| --- | ---: |\n| Tea | 4.50 |\n| `Milk` | 1.20 |',
        },
      ]),
    ])
    expect(screen.getByRole('table')).toBeDefined()
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Item', 'Price'])
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByRole('columnheader', { name: 'Price' }).className).toContain('m3e-a2ui-text__cell--right')
    expect(container.querySelector('td code')?.textContent).toBe('Milk')
    expect(container.querySelector('.m3e-a2ui-text__table-scroller table')).not.toBeNull()
  })
})

describe('forward-compatible v1.0 properties', () => {
  it('shows a Video poster from posterUrl', () => {
    const { container } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Video', url: 'https://example.com/clip.mp4', posterUrl: { path: '/poster' } },
      ]),
      message.updateDataModel(SURFACE, { poster: 'https://example.com/poster.jpg' }),
    ])
    const video = container.querySelector('video')
    expect(video?.getAttribute('src')).toBe('https://example.com/clip.mp4')
    expect(video?.getAttribute('poster')).toBe('https://example.com/poster.jpg')
  })

  it('shows a TextField placeholder on both the single-line field and the text area', () => {
    renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Column', children: ['email', 'notes'] },
        { id: 'email', component: 'TextField', label: 'Email', placeholder: 'you@example.com' },
        { id: 'notes', component: 'TextField', label: 'Notes', variant: 'longText', placeholder: 'Anything else?' },
      ]),
    ])
    expect(screen.getByPlaceholderText('you@example.com').tagName).toBe('INPUT')
    expect(screen.getByPlaceholderText('Anything else?').tagName).toBe('TEXTAREA')
  })

  it('snaps a Slider to the divisions steps declares', async () => {
    const user = userEvent.setup()
    const { surface } = renderSurface([
      message.createSurface(SURFACE),
      message.updateComponents(SURFACE, [
        { id: 'root', component: 'Slider', label: 'Rating', min: 0, max: 1, steps: 4, value: { path: '/rating' } },
      ]),
      message.updateDataModel(SURFACE, { rating: 0.3 }),
    ])
    const slider = screen.getByRole('slider', { name: 'Rating' }) as HTMLInputElement
    expect(slider.value).toBe('0.25')
    expect(screen.getByText('0.25')).toBeDefined()
    slider.focus()
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(surface.dataModel.get('/rating')).toBe(0.5))
    expect(stepPrecision(0.25)).toBe(2)
    expect(stepPrecision(1 / 3)).toBe(4)
    expect(stepPrecision(5)).toBe(0)
  })
})
