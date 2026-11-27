import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { ExpressionParser, MessageProcessor } from '@a2ui/web_core'
import { AgentToRendererMessageSchema, type AgentToRendererMessage } from '@a2ui/web_core/v1_0'

import { createMaterial3Catalog } from '../../src/catalog'

type DataModelCase = {
  name: string
  initial?: Record<string, unknown>
  watch?: string[]
  steps: Array<{
    op: 'get' | 'set' | 'delete' | 'dispose' | 'mutate_input'
    path?: string
    value?: unknown
    expect?: unknown
    expect_absent?: boolean
    expect_type?: 'list' | 'object'
    expect_error?: string
    expect_notified?: string[]
    expect_values?: Record<string, unknown>
  }>
}

type ExpressionCase = {
  name: string
  input: string
  expect?: unknown[]
  expect_error?: { message?: string }
}

type MessageProcessorCase = {
  name: string
  messages: AgentToRendererMessage[]
  expect: {
    surfaces: Record<
      string,
      {
        exists?: boolean
        catalogId?: string
        sendDataModel?: boolean
        metadata?: Record<string, unknown>
        dataModel?: unknown
        components?: Array<Record<string, unknown>>
      }
    >
  }
}

type ValidatorCase = {
  name: string
  steps: Array<{
    messages: AgentToRendererMessage[]
    expectError?: {
      category?: string
      details?: Array<{ path?: string; code?: string }>
    }
  }>
}

const fixture = (name: string) =>
  JSON.parse(readFileSync(path.join(__dirname, '../../fixtures/conformance', name), 'utf8')) as unknown

const dataModelCases = fixture('data-model.json') as DataModelCase[]
const expressionCases = fixture('expressions.json') as ExpressionCase[]
const messageProcessorCases = fixture('message-processor.json') as MessageProcessorCase[]
const validatorCases = fixture('validator-schema.json') as ValidatorCase[]
const manifest = fixture('manifest.json') as {
  sourceFiles: Record<string, { generatedFile: string; generatedSha256: string; caseCount: number }>
}

const conformanceDirectory = path.join(__dirname, '../../fixtures/conformance')

describe('pinned conformance fixture manifest', () => {
  it('matches every generated fixture hash and case count', () => {
    for (const entry of Object.values(manifest.sourceFiles)) {
      const file = readFileSync(path.join(conformanceDirectory, entry.generatedFile))
      expect(createHash('sha256').update(file).digest('hex')).toBe(entry.generatedSha256)
      expect(JSON.parse(file.toString())).toHaveLength(entry.caseCount)
    }
  })
})

function joinLiterals(parts: unknown[]) {
  const joined: unknown[] = []
  for (const part of parts) {
    const last = joined.length - 1
    if (typeof part === 'string' && last >= 0 && typeof joined[last] === 'string') {
      joined[last] = joined[last] + part
    } else {
      joined.push(part)
    }
  }
  return joined.filter((part) => part !== '')
}

function validationIssuePaths(error: unknown): string[] {
  const paths: string[] = []
  const visit = (value: unknown) => {
    if (value === null || typeof value !== 'object') return
    const issue = value as { path?: unknown; issues?: unknown; unionErrors?: unknown }
    if (Array.isArray(issue.path) && issue.path.length > 0) {
      paths.push(issue.path.map(String).join('.'))
    }
    if (Array.isArray(issue.issues)) issue.issues.forEach(visit)
    if (Array.isArray(issue.unionErrors)) issue.unionErrors.forEach(visit)
  }
  visit(error)
  return paths
}

function createConformanceSurface(initial: Record<string, unknown> | undefined) {
  const processor = new MessageProcessor([createMaterial3Catalog({ id: 'test-catalog-v10' })], undefined, {
    version: '1.0',
  })
  processor.processMessages([
    {
      version: '1.0',
      createSurface: {
        surfaceId: 's1',
        catalogId: 'test-catalog-v10',
        ...(initial !== undefined ? { dataModel: structuredClone(initial) } : {}),
      },
    },
  ])
  const surface = processor.model.getSurface('s1')
  if (!surface) throw new Error('The conformance surface was not created')
  return { processor, model: surface.dataModel }
}

function setNestedProperty(target: unknown, pointer: string, value: unknown) {
  if (!target || typeof target !== 'object') return
  const segments = pointer.replace(/^\//, '').split('/').filter(Boolean)
  let current = target as Record<string, unknown>
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i]!
    current = current[segment] as Record<string, unknown>
  }
  const last = segments.at(-1)
  if (last !== undefined) current[last] = value
}

function applyDataModelStep(
  model: ReturnType<typeof createConformanceSurface>['model'],
  step: DataModelCase['steps'][number],
  state: { lastSetInput: unknown },
) {
  switch (step.op) {
    case 'get':
      return model.get(step.path ?? '/')
    case 'set': {
      const copy = structuredClone(step.value)
      state.lastSetInput = copy
      model.set(step.path ?? '/', copy)
      return undefined
    }
    case 'mutate_input':
      setNestedProperty(state.lastSetInput, step.path ?? '/', structuredClone(step.value))
      return undefined
    case 'delete':
      model.set(step.path ?? '/', undefined)
      return undefined
    case 'dispose':
      model.dispose()
      return undefined
  }
}

describe('A2UI upstream core/data_model.yaml vectors (1.0)', () => {
  it('keeps the pinned suite non-empty', () => {
    expect(dataModelCases.length).toBeGreaterThanOrEqual(50)
  })

  for (const testCase of dataModelCases) {
    it(testCase.name, () => {
      const { model } = createConformanceSurface(testCase.initial)
      const notifications = new Map<string, number>()
      const subscriptions = (testCase.watch ?? []).map((watchedPath) => {
        notifications.set(watchedPath, 0)
        return model.subscribe(watchedPath, () => {
          notifications.set(watchedPath, (notifications.get(watchedPath) ?? 0) + 1)
        })
      })
      const state = { lastSetInput: undefined as unknown }

      try {
        for (const [index, step] of testCase.steps.entries()) {
          for (const watchedPath of notifications.keys()) notifications.set(watchedPath, 0)
          const reason = testCase.name + ' step ' + index + ' (' + step.op + ')'

          if (step.expect_error !== undefined) {
            expect(() => applyDataModelStep(model, step, state), reason).toThrow(new RegExp(step.expect_error))
            continue
          }

          const value = applyDataModelStep(model, step, state)
          if (step.op === 'get') {
            if (step.expect_absent === true) expect(value, reason).toBeUndefined()
            if (step.expect_type !== undefined) {
              if (step.expect_type === 'list') {
                expect(Array.isArray(value), reason).toBe(true)
              } else {
                expect(value !== null && typeof value === 'object' && !Array.isArray(value), reason).toBe(true)
              }
            }
            if ('expect' in step) expect(value, reason).toEqual(step.expect)
          }
          if (step.expect_notified !== undefined) {
            const actual: string[] = []
            for (const [watchedPath, count] of notifications) {
              for (let i = 0; i < count; i += 1) actual.push(watchedPath)
            }
            expect(actual.sort(), reason).toEqual([...step.expect_notified].sort())
          }
          for (const [watchedPath, expected] of Object.entries(step.expect_values ?? {})) {
            const subscription = subscriptions[(testCase.watch ?? []).indexOf(watchedPath)]
            expect(subscription, reason + ': ' + watchedPath + ' is not watched').toBeDefined()
            expect(subscription?.value, reason).toEqual(expected)
          }
        }
      } finally {
        for (const subscription of subscriptions) subscription.unsubscribe()
        model.dispose()
      }
    })
  }
})

describe('A2UI upstream core/expressions.yaml (1.0)', () => {
  it('keeps the pinned suite non-empty', () => {
    expect(expressionCases.length).toBeGreaterThanOrEqual(90)
  })

  for (const testCase of expressionCases) {
    it(testCase.name, () => {
      const parse = () => new ExpressionParser().parse(testCase.input)
      if (testCase.expect_error !== undefined) {
        expect(parse).toThrow(new RegExp(testCase.expect_error.message ?? ''))
      } else {
        expect(joinLiterals(parse())).toEqual(testCase.expect)
      }
    })
  }
})

describe('A2UI upstream core/message_processor_v1_0.yaml through Material catalog', () => {
  it('keeps the pinned suite non-empty', () => {
    expect(messageProcessorCases.length).toBeGreaterThanOrEqual(9)
  })

  for (const testCase of messageProcessorCases) {
    it(testCase.name, () => {
      const processor = new MessageProcessor([createMaterial3Catalog({ id: 'test-catalog-v10' })], undefined, {
        version: '1.0',
      })
      processor.processMessages(testCase.messages)

      for (const [surfaceId, expected] of Object.entries(testCase.expect.surfaces)) {
        const surface = processor.model.getSurface(surfaceId)
        if (expected.exists === false) {
          expect(surface).toBeUndefined()
          continue
        }
        expect(surface, surfaceId).toBeDefined()
        if (!surface) continue
        if (expected.catalogId !== undefined) expect(surface.defaultCatalog?.id).toBe(expected.catalogId)
        if (expected.sendDataModel !== undefined) expect(surface.sendDataModel).toBe(expected.sendDataModel)
        if (expected.metadata !== undefined) expect(surface.metadata).toEqual(expected.metadata)
        if (expected.dataModel !== undefined) expect(surface.dataModel.get('/')).toEqual(expected.dataModel)
        if (expected.components !== undefined) {
          const actual = [...surface.componentsModel.entries]
          expect(actual.map(([id]) => id).sort()).toEqual(expected.components.map(({ id }) => id).sort())
          for (const expectedComponent of expected.components) {
            const id = expectedComponent.id
            if (typeof id !== 'string') throw new Error('Conformance component is missing id')
            const component = surface.componentsModel.get(id)
            expect(component, id).toBeDefined()
            if (!component) continue
            for (const [key, value] of Object.entries(expectedComponent)) {
              if (key === 'id') continue
              if (key === 'component') expect(component.type).toBe(value)
              else if (key === '@metadata') {
                if (value === null) expect(component.metadata).toBeUndefined()
                else expect(component.metadata).toEqual(value)
              } else {
                expect(component.properties[key]).toEqual(value)
              }
            }
          }
        }
      }
    })
  }
})

describe('A2UI upstream core/validator_v1_0.yaml schema vectors through MessageProcessor (1.0)', () => {
  it('validates malformed envelopes with web_core and processes the valid envelopes', () => {
    const testCase = validatorCases.find((candidate) => candidate.name === 'test_validator_1_0')
    expect(testCase).toBeDefined()
    if (!testCase) return

    const processor = new MessageProcessor(
      [createMaterial3Catalog({ id: 'https://a2ui.org/catalogs/basic/v1/catalog.json' })],
      undefined,
      { version: '1.0' },
    )

    for (const [index, step] of testCase.steps.entries()) {
      const parsed = step.messages.map((message) => AgentToRendererMessageSchema.safeParse(message))
      const reason = testCase.name + ' step ' + index
      if (step.expectError !== undefined) {
        const failed = parsed.find((result) => !result.success)
        expect(failed, reason).toBeDefined()
        const expectedPath = step.expectError.details?.[0]?.path?.replace(/^messages\.0\./, '')
        if (expectedPath !== undefined && failed && !failed.success) {
          expect(validationIssuePaths(failed.error), reason).toContain(expectedPath)
        }
        continue
      }

      expect(parsed.every((result) => result.success), reason).toBe(true)
      processor.processMessages(
        parsed
          .map((result) => (result.success ? result.data : undefined))
          .filter(Boolean) as AgentToRendererMessage[],
      )
    }
  })
})
