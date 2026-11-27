import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { AgentToRendererMessage } from '@a2ui/web_core/v1_0'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useRef } from 'react'
import { describe, expect, it } from 'vitest'

import type { SpecExample } from '../../fixtures/messages'
import { message } from '../../fixtures/messages'
import { wrap } from '../../fixtures/render'
import { A2uiSurface } from '../../src/runtime/A2uiSurface'
import { useA2ui } from '../../src/runtime/useA2ui'
import {
  createStreamingDiagnosticTracker,
  type StreamingDiagnostic,
} from '../../playground/diagnostics'

const login = JSON.parse(
  readFileSync(path.join(__dirname, '../../fixtures/examples/login-form.json'), 'utf8'),
) as SpecExample

interface StreamHarness {
  readonly stream: (message: AgentToRendererMessage) => void
  readonly finish: () => void
  readonly diagnostics: readonly StreamingDiagnostic[]
}

function Harness({ onReady }: { onReady: (harness: StreamHarness) => void }) {
  const reports = useRef<StreamingDiagnostic[]>([])
  const tracker = useRef(createStreamingDiagnosticTracker((report) => reports.current.push(report)))
  const a2ui = useA2ui({
    onError: (error, surfaceId) => tracker.current.report(error, surfaceId),
  })

  useEffect(() => {
    onReady({
      stream: (next) => {
        tracker.current.observe(next)
        a2ui.processMessages([next])
      },
      finish: () => tracker.current.finish(),
      get diagnostics() {
        return reports.current
      },
    })
  }, [a2ui.processMessages, onReady])

  return (
    <>
      {a2ui.surfaces.map((surface) => (
        <A2uiSurface key={surface.id} surface={surface} />
      ))}
    </>
  )
}

describe('streaming playground diagnostics', () => {
  it('keeps login expression reports inspectable before seed without inventing later failures', async () => {
    let harness!: StreamHarness
    const onReady = (next: StreamHarness) => {
      harness = next
    }
    render(wrap(<Harness onReady={onReady} />))

    for (const next of login.messages.slice(0, 2)) {
      await act(async () => harness.stream(next))
    }

    expect(harness.diagnostics.every((report) => report.phase === 'initialization')).toBe(true)

    const beforeSeed = harness.diagnostics.length
    const seed = login.messages[2]
    if (seed) {
      await act(async () => harness.stream(seed))
    }
    expect(harness.diagnostics).toHaveLength(beforeSeed)

    const user = userEvent.setup()
    const button = screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct horse')
    expect(button.disabled).toBe(false)
    expect(harness.diagnostics).toHaveLength(beforeSeed)
    await user.clear(screen.getByLabelText('Email'))
    expect(button.disabled).toBe(true)
    expect(harness.diagnostics).toHaveLength(beforeSeed)
  })

  it('keeps a malformed function actionable after a no-data replay finishes', async () => {
    let harness!: StreamHarness
    const onReady = (next: StreamHarness) => {
      harness = next
    }
    render(wrap(<Harness onReady={onReady} />))

    const malformed = {
      '@call': 'missingFunction',
      args: { value: { '@path': '/value' } },
    }
    const stream = [
      message.createSurface('malformed', { sendDataModel: true }),
      message.updateComponents('malformed', [{ id: 'root', component: 'Text', text: malformed }]),
    ]
    for (const next of stream) {
      await act(async () => harness.stream(next))
    }

    expect(harness.diagnostics.some((report) => report.phase === 'initialization')).toBe(true)
    expect(harness.diagnostics.some((report) => report.phase === 'actionable')).toBe(false)

    await act(async () => harness.finish())
    await act(async () =>
      harness.stream(
        message.updateComponents('malformed', [
          {
            id: 'root',
            component: 'Text',
            text: { '@call': 'anotherMissingFunction', args: { value: { '@path': '/value' } } },
          },
        ]),
      ),
    )
    expect(harness.diagnostics.at(-1)?.phase).toBe('actionable')
  })
})
