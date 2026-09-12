import { useCallback, useEffect, useRef, useState } from 'react'
import type { A2uiClientAction } from '@a2ui/web_core/v0_9'
import {
  Button,
  Material3Provider,
  SegmentedButtonGroup,
  Select,
  Surface,
  Text,
} from '@language-lit/material3-expressive'

import { A2uiSurface } from '../src/runtime/A2uiSurface'
import { useA2ui } from '../src/runtime/useA2ui'
import { examples } from './examples'

type ColorMode = 'light' | 'dark' | 'system'

const STEP_MS = 350

interface LogEntry {
  readonly kind: 'action' | 'error'
  readonly text: string
  readonly count: number
}

// A surface error carries its full validation report; the first clause is
// enough to read in a log. Repeats collapse onto the latest entry.
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const { code, message } = error as { code?: string; message?: string }
    const summary = String(message ?? '').split(': [')[0] ?? ''
    return code ? `${code} · ${summary}` : summary
  }
  return JSON.stringify(error)
}

function append(entries: readonly LogEntry[], entry: Omit<LogEntry, 'count'>): LogEntry[] {
  const [latest, ...rest] = entries
  if (latest && latest.kind === entry.kind && latest.text === entry.text) {
    return [{ ...latest, count: latest.count + 1 }, ...rest]
  }
  return [{ ...entry, count: 1 }, ...entries]
}

// `?example=<file>` deep-links an example, so a check or a bug report can name
// one exactly. Unknown values fall back to the first example.
const requested = new URLSearchParams(window.location.search).get('example')
const initialExample =
  examples.find((example) => example.file === requested)?.file ?? examples[0]?.file ?? ''

export function App() {
  const [colorMode, setColorMode] = useState<ColorMode>('system')
  const [selected, setSelected] = useState(initialExample)
  const [log, setLog] = useState<LogEntry[]>([])
  const timers = useRef<number[]>([])

  const a2ui = useA2ui({
    onAction: (action: A2uiClientAction) => {
      setLog((entries) =>
        append(entries, {
          kind: 'action',
          text: `${action.name} from ${action.sourceComponentId}: ${JSON.stringify(action.context)}`,
        }),
      )
    },
    onError: (error, surfaceId) => {
      setLog((entries) =>
        append(entries, { kind: 'error', text: `${surfaceId ?? 'processor'}: ${describeError(error)}` }),
      )
    },
  })

  const { processMessages, clear, surfaces } = a2ui

  useEffect(() => {
    document.documentElement.dataset.m3eColorMode = colorMode
  }, [colorMode])

  const stop = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }, [])

  // Messages are fed one at a time with a short delay, the way an agent
  // streams them, so the placeholder and incremental states are visible.
  const play = useCallback(
    (file: string) => {
      stop()
      clear()
      setLog([])
      const example = examples.find((item) => item.file === file)
      if (!example) return
      example.messages.forEach((message, index) => {
        timers.current.push(
          window.setTimeout(() => processMessages([message]), index * STEP_MS),
        )
      })
    },
    [processMessages, clear, stop],
  )

  useEffect(() => {
    play(selected)
    return stop
  }, [selected, play, stop])

  const current = examples.find((item) => item.file === selected)

  return (
    <Material3Provider colorMode={colorMode} style={{ blockSize: '100%' }}>
      <div className="pg-shell">
        <div className="pg-bar">
          <div>
            <Text as="h1" variant="titleLarge" style={{ margin: 0 }}>
              A2UI · Material 3 Expressive
            </Text>
            <Text as="p" variant="bodySmall" style={{ margin: 0 }}>
              The specification’s basic and minimal examples plus the Material extension catalog, streamed one message at a time.
            </Text>
          </div>
          <div className="pg-bar__actions">
            <Select
              label="Example"
              options={examples.map((example) => ({ value: example.file, label: example.name }))}
              value={selected}
              onValueChange={setSelected}
              className="pg-select"
            />
            <Button variant="tonal" onClick={() => play(selected)}>
              Replay
            </Button>
            <SegmentedButtonGroup
              segments={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
              value={colorMode}
              onValueChange={(value) => setColorMode(value as ColorMode)}
            />
          </div>
        </div>

        <div className="pg-body">
          <Surface color="surface" shape="extra-large" className="pg-stage">
            {current ? (
              <Text as="p" variant="bodyMedium" className="pg-stage__description">
                {current.description}
              </Text>
            ) : null}
            {surfaces.map((surface) => (
              <A2uiSurface key={surface.id} surface={surface} className="pg-surface" />
            ))}
          </Surface>
          <Surface color="surface-container-low" shape="extra-large" className="pg-log">
            <Text as="h2" variant="titleSmall" style={{ margin: 0 }}>
              Client → server
            </Text>
            {log.length === 0 ? (
              <Text as="p" variant="bodySmall" style={{ margin: 0 }}>
                Actions and errors the surface sends back appear here.
              </Text>
            ) : (
              <ul className="pg-log__list">
                {log.map((entry, index) => (
                  <li key={index} className={entry.kind === 'error' ? 'pg-log__error' : undefined}>
                    <Text as="span" variant="bodySmall">
                      {entry.text}
                      {entry.count > 1 ? ` ×${entry.count}` : ''}
                    </Text>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </div>
      </div>
    </Material3Provider>
  )
}
