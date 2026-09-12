import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { SpecExample } from '../../fixtures/messages'
import { renderSurface } from '../../fixtures/render'

const examplesDirectory = path.join(__dirname, '../../fixtures/examples')
const examples = readdirSync(examplesDirectory)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => ({ file, ...(JSON.parse(readFileSync(path.join(examplesDirectory, file), 'utf8')) as SpecExample) }))

describe('the basic catalog examples from the specification', () => {
  it('cover every example shipped with v0.9.1', () => {
    expect(examples.length).toBe(43)
  })

  for (const example of examples) {
    it(`renders ${example.file} (${example.name}) without unsupported components or surface errors`, () => {
      const { container, errors } = renderSurface(example.messages)
      expect(errors).toEqual([])
      expect(container.querySelector('.m3e-a2ui-unknown')).toBeNull()
      expect(container.querySelector('[data-a2ui-surface]')).not.toBeNull()
    })
  }

  it('renders the login form with Material text fields and a filled button', () => {
    const example = examples.find((item) => item.file === '00_simple-login-form.json')!
    renderSurface(example.messages)
    expect(screen.getByRole('heading', { name: 'Login' })).toBeDefined()
    expect(screen.getByLabelText('Username')).toBeDefined()
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password')
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeDefined()
  })

  it('expands a ChildList template once per item of the bound array', () => {
    const example = examples.find((item) => item.file === '34_child-list-template.json')!
    renderSurface(example.messages)
    expect(screen.getByText('Apple')).toBeDefined()
    expect(screen.getByText('Banana')).toBeDefined()
    expect(screen.getByText('Cherry')).toBeDefined()
    expect(screen.getAllByText('- Qty:')).toHaveLength(3)
  })

  it('renders Markdown text as headings, emphasis, lists and links', () => {
    const example = examples.find((item) => item.file === '35_markdown-text.json')!
    const { container } = renderSurface(example.messages)
    expect(screen.getByRole('heading', { name: 'Heading 1' })).toBeDefined()
    expect(container.querySelector('strong')?.textContent).toBe('bold')
    expect(container.querySelector('em')?.textContent).toBe('italic')
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Link to Google' }).getAttribute('href')).toBe('https://google.com')
    expect(container.innerHTML).not.toContain('**')
  })
})

const minimalDirectory = path.join(__dirname, '../../fixtures/minimal/examples')
const minimalExamples = readdirSync(minimalDirectory)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => ({ file, ...(JSON.parse(readFileSync(path.join(minimalDirectory, file), 'utf8')) as SpecExample) }))

describe('the minimal catalog examples from the specification', () => {
  it('cover every example shipped with v0.9.1', () => {
    expect(minimalExamples.length).toBe(7)
  })

  for (const example of minimalExamples) {
    it(`renders ${example.file} (${example.name}) without unsupported components or surface errors`, () => {
      const { container, errors } = renderSurface(example.messages)
      expect(errors).toEqual([])
      expect(container.querySelector('.m3e-a2ui-unknown')).toBeNull()
      expect(container.querySelector('[data-a2ui-surface]')).not.toBeNull()
    })
  }

  it('evaluates capitalize as the user types, starting from an empty field', async () => {
    const example = minimalExamples.find((item) => item.file === '6_capitalized_text.json')!
    const { errors } = renderSurface(example.messages)
    const output = screen.getByRole('heading', { level: 2 })
    expect(output.textContent).toBe('')
    await userEvent.type(screen.getByLabelText('Type something in lowercase:'), 'hello wORLD')
    expect(output.textContent).toBe('Hello world')
    expect(errors).toEqual([])
  })
})
