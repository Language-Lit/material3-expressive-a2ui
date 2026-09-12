import type { A2uiMessage } from '@a2ui/web_core/v0_9'

export type DiagnosticPhase = 'initialization' | 'actionable'

export interface StreamingDiagnostic {
  readonly phase: DiagnosticPhase
  readonly error: unknown
  readonly surfaceId?: string
}

interface SurfaceState {
  dataModelSeen: boolean
  streamFinished: boolean
}

function isExpressionError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === 'EXPRESSION_ERROR',
  )
}

function surfaceIdOf(message: A2uiMessage): string | undefined {
  if ('createSurface' in message) return message.createSurface.surfaceId
  if ('updateDataModel' in message) return message.updateDataModel.surfaceId
  if ('deleteSurface' in message) return message.deleteSurface.surfaceId
  return undefined
}

/**
 * Tracks the small amount of stream state needed to label raw protocol
 * diagnostics. It deliberately has no recovery state: a data-model update is
 * evidence that initialization progressed, not evidence that an expression
 * subsequently succeeded. The host calls `finish` at the stream boundary so
 * a replay with no data-model message cannot leave later reports classified as
 * initialization forever.
 */
export function createStreamingDiagnosticTracker(
  onDiagnostic: (diagnostic: StreamingDiagnostic) => void,
) {
  const surfaces = new Map<string, SurfaceState>()

  return {
    observe(message: A2uiMessage) {
      const surfaceId = surfaceIdOf(message)
      if ('createSurface' in message) {
        if (!surfaces.has(message.createSurface.surfaceId)) {
          surfaces.set(message.createSurface.surfaceId, { dataModelSeen: false, streamFinished: false })
        }
      } else if ('updateDataModel' in message && surfaceId) {
        const state = surfaces.get(surfaceId) ?? { dataModelSeen: false, streamFinished: false }
        state.dataModelSeen = true
        surfaces.set(surfaceId, state)
      } else if ('deleteSurface' in message && surfaceId) {
        surfaces.delete(surfaceId)
      }
    },

    finish() {
      surfaces.forEach((state) => {
        state.streamFinished = true
      })
    },

    report(error: unknown, surfaceId?: string) {
      const state = surfaceId ? surfaces.get(surfaceId) : undefined
      const phase: DiagnosticPhase =
        isExpressionError(error) &&
        state !== undefined &&
        !state.dataModelSeen &&
        !state.streamFinished
          ? 'initialization'
          : 'actionable'
      onDiagnostic({ phase, error, surfaceId })
    },

    reset() {
      surfaces.clear()
    },
  }
}
