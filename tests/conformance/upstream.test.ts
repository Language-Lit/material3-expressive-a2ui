import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  A2uiMessageSchema,
  ExpressionParser,
  MessageProcessor,
  type A2uiMessage,
} from '@a2ui/web_core/v0_9'

import { createMaterial3Catalog } from '../../src/catalog'

type DataModelCase = {
  name: string
  initial?: Record<string, unknown>
  watch?: string[]
  steps: Array<{
    op: 'get' | 'set' | 'delete' | 'dispose'
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
  messages: A2uiMessage[]
  expect: {
    surfaces: Record<
      string,
      {
        exists?: boolean
        catalogId?: string
        sendDataModel?: boolean
        dataModel?: unknown
        components?: Array<Record<string, unknown>>
      }
    >
  }
}

type ValidatorCase = {
  name: string
  steps: Array<{
    payload: A2uiMessage[]
    expect_error?: {
      category?: string
      details?: Array<{ path?: string; code?: string }>
    }
  }>
}

type SupportedVersion = 'v0.9' | 'v0.9.1'

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

function installedWebCoreVersion() {
  const entry = createRequire(import.meta.url).resolve('@a2ui/web_core/v0_9')
  let directory = path.dirname(entry)
  while (true) {
    try {
      const packageJson = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8')) as {
        name?: string
        version?: string
      }
      if (packageJson.name === '@a2ui/web_core' && packageJson.version !== undefined) return packageJson.version
    } catch {
      // Continue up from the public entry until the package root is found.
    }
    const parent = path.dirname(directory)
    if (parent === directory) throw new Error('Could not resolve @a2ui/web_core package.json')
    directory = parent
  }
}

const webCoreVersion = installedWebCoreVersion()

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

function createConformanceSurface(initial: Record<string, unknown> | undefined, version: SupportedVersion) {
  const processor = new MessageProcessor([createMaterial3Catalog({ id: 'test-catalog' })], undefined, {
    version,
  })
  processor.processMessages([
    {
      version,
      createSurface: { surfaceId: 's1', catalogId: 'test-catalog' },
    },
  ])
  if (initial !== undefined) {
    processor.processMessages([
      {
        version,
        updateDataModel: { surfaceId: 's1', value: structuredClone(initial) },
      },
    ])
  }
  const surface = processor.model.getSurface('s1')
  if (!surface) throw new Error('The conformance surface was not created')
  return { processor, model: surface.dataModel }
}

function applyDataModelStep(
  model: ReturnType<typeof createConformanceSurface>['model'],
  step: DataModelCase['steps'][number],
) {
  switch (step.op) {
    case 'get':
      return model.get(step.path ?? '/')
    case 'set':
      model.set(step.path ?? '/', structuredClone(step.value))
      return undefined
    case 'delete':
      model.set(step.path ?? '/', undefined)
      return undefined
    case 'dispose':
      model.dispose()
      return undefined
  }
}

describe.each(['v0.9', 'v0.9.1'] as const)(
  'A2UI upstream core/data_model.yaml vectors (%s)',
  (version) => {
  it('keeps the pinned suite non-empty', () => {
    expect(dataModelCases).toHaveLength(37)
  })

  for (const testCase of dataModelCases) {
    it(testCase.name, () => {
      const { model } = createConformanceSurface(testCase.initial, version)
      const notifications = new Map<string, number>()
      const subscriptions = (testCase.watch ?? []).map((watchedPath) => {
        notifications.set(watchedPath, 0)
        return model.subscribe(watchedPath, () => {
          notifications.set(watchedPath, (notifications.get(watchedPath) ?? 0) + 1)
        })
      })

      try {
        for (const [index, step] of testCase.steps.entries()) {
          for (const watchedPath of notifications.keys()) notifications.set(watchedPath, 0)
          const reason = testCase.name + ' step ' + index + ' (' + step.op + ')'

          if (step.expect_error !== undefined) {
            expect(() => applyDataModelStep(model, step), reason).toThrow(new RegExp(step.expect_error))
            continue
          }

          const value = applyDataModelStep(model, step)
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
  },
)

describe('A2UI upstream core/expressions.yaml', () => {
  it('keeps the pinned suite non-empty', () => {
    expect(expressionCases).toHaveLength(31)
  })

  for (const testCase of expressionCases) {
    const test =
      webCoreVersion === '0.10.7' && testCase.name === 'test_expr_error_invalid_number_two_points' ? it.fails : it
    test(testCase.name, () => {
      const parse = () => new ExpressionParser().parse(testCase.input)
      if (testCase.expect_error !== undefined) {
        expect(parse).toThrow(new RegExp(testCase.expect_error.message ?? ''))
      } else {
        expect(joinLiterals(parse())).toEqual(testCase.expect)
      }
    })
  }
})

describe.each(['v0.9', 'v0.9.1'] as const)('A2UI upstream core/message_processor.yaml through Material catalog (%s)', (version) => {
  it('keeps the pinned suite non-empty', () => {
    expect(messageProcessorCases).toHaveLength(2)
  })

  for (const testCase of messageProcessorCases) {
    it(testCase.name, () => {
      const processor = new MessageProcessor([createMaterial3Catalog({ id: 'test-catalog' })], undefined, {
        version,
      })
      processor.processMessages(testCase.messages.map((message) => ({ ...message, version })))

      for (const [surfaceId, expected] of Object.entries(testCase.expect.surfaces)) {
        const surface = processor.model.getSurface(surfaceId)
        if (expected.exists === false) {
          expect(surface).toBeUndefined()
          continue
        }
        expect(surface, surfaceId).toBeDefined()
        if (!surface) continue
        if (expected.catalogId !== undefined) expect(surface.catalog.id).toBe(expected.catalogId)
        if (expected.sendDataModel !== undefined) expect(surface.sendDataModel).toBe(expected.sendDataModel)
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
              else expect(component.properties[key]).toEqual(value)
            }
          }
        }
      }
    })
  }
})

describe.each(['v0.9', 'v0.9.1'] as const)('A2UI upstream core/validator.yaml schema vectors through MessageProcessor (%s)', (version) => {
  it('validates malformed envelopes with web_core and processes the valid envelope', () => {
    const testCase = validatorCases.find((candidate) => candidate.name === 'test_validator_0_9')
    expect(testCase).toBeDefined()
    if (!testCase) return

    for (const [index, step] of testCase.steps.entries()) {
      const messages = step.payload.map((message) =>
        message.version === 'v0.9' ? { ...message, version } : message,
      )
      const parsed = messages.map((message) => A2uiMessageSchema.safeParse(message))
      const reason = testCase.name + ' step ' + index
      if (step.expect_error !== undefined) {
        const failed = parsed.find((result) => !result.success)
        expect(failed, reason).toBeDefined()
        const expectedPath = step.expect_error.details?.[0]?.path?.replace(/^messages\.0\./, '')
        if (expectedPath !== undefined && failed && !failed.success) {
          expect(validationIssuePaths(failed.error), reason).toContain(expectedPath)
        }
        continue
      }

      expect(parsed.every((result) => result.success), reason).toBe(true)
      const processor = new MessageProcessor([createMaterial3Catalog({ id: 'standard' })], undefined, { version })
      processor.processMessages(parsed.map((result) => (result.success ? result.data : undefined)).filter(Boolean) as A2uiMessage[])
    }
  })
})
