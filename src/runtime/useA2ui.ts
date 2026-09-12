import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  MessageProcessor,
  type A2uiClientAction,
  type A2uiClientCapabilities,
  type A2uiClientDataModel,
  type A2uiMessage,
  type A2uiMessageListWrapper,
  type CapabilitiesOptions,
  type Catalog,
  type SurfaceModel,
} from '@a2ui/web_core/v0_9'

import { material3Catalogs } from '../catalog'
import type { Material3ComponentImplementation } from './adapter'

export type A2uiProtocolVersion = 'v0.9' | 'v0.9.1'

export interface UseA2uiOptions {
  /**
   * Catalogs the processor accepts `createSurface` for. Defaults to the
   * basic, minimal and Material extension catalogs. Read once, when the hook first
   * runs.
   */
  readonly catalogs?: readonly Catalog<Material3ComponentImplementation>[]
  /** Called with every client action a surface dispatches (a button's `event`). */
  readonly onAction?: (action: A2uiClientAction) => void | Promise<void>
  /**
   * Called when a message fails to process or a surface reports an error.
   * Without it, processing errors are thrown from `processMessages`.
   *
   * `EXPRESSION_ERROR` reports can be emitted while a surface is still
   * arriving, when a bound value is missing, or when a function remains
   * malformed. The hook forwards every raw report; the host should track its
   * stream boundary and distinguish an initialization diagnostic from an
   * expression error that remains actionable after data has arrived. A data
   * update alone is not evidence that an expression recovered.
   */
  readonly onError?: (error: unknown, surfaceId?: string) => void
  /** Protocol version for capabilities and the client data model. Defaults to `v0.9.1`. */
  readonly version?: A2uiProtocolVersion
}

export interface UseA2uiResult {
  /** The underlying processor, for hosts that need the full API. */
  readonly processor: MessageProcessor<Material3ComponentImplementation>
  /** Live surfaces in creation order. Each one renders with `A2uiSurface`. */
  readonly surfaces: readonly SurfaceModel<Material3ComponentImplementation>[]
  /**
   * Feeds server-to-client messages (a JSONL batch, already parsed) to the
   * processor. The messages are copied first, so the objects you pass are
   * never mutated and can be replayed.
   */
  readonly processMessages: (messages: readonly A2uiMessage[] | A2uiMessageListWrapper) => void
  /** The `a2uiClientCapabilities` object to send with the first request. */
  readonly getClientCapabilities: (options?: CapabilitiesOptions) => A2uiClientCapabilities
  /** The data model of every surface created with `sendDataModel`, or nothing. */
  readonly getClientDataModel: () => A2uiClientDataModel | undefined
  /** Deletes every surface. */
  readonly clear: () => void
}

type Surfaces = readonly SurfaceModel<Material3ComponentImplementation>[]

function isWrapper(
  messages: readonly A2uiMessage[] | A2uiMessageListWrapper,
): messages is A2uiMessageListWrapper {
  return !Array.isArray(messages)
}

function sameSurfaces(a: Surfaces, b: Surfaces): boolean {
  return a.length === b.length && a.every((surface, index) => surface === b[index])
}

function createSurfaceStore(processor: MessageProcessor<Material3ComponentImplementation>) {
  let snapshot: Surfaces = [...processor.model.surfacesMap.values()]
  const listeners = new Set<() => void>()
  let subscriptions: { unsubscribe(): void }[] = []

  const refresh = () => {
    const next = [...processor.model.surfacesMap.values()]
    if (sameSurfaces(snapshot, next)) return
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      if (listeners.size === 1) {
        subscriptions = [processor.onSurfaceCreated(refresh), processor.onSurfaceDeleted(refresh)]
        refresh()
      }
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          subscriptions.forEach((subscription) => subscription.unsubscribe())
          subscriptions = []
        }
      }
    },
    getSnapshot: () => snapshot,
  }
}

/**
 * Owns a `MessageProcessor` for the lifetime of a component.
 *
 * The hook is transport-agnostic: the host fetches, streams or receives A2UI
 * messages however its agent framework delivers them and hands the parsed
 * messages to `processMessages`. Surfaces appear in `surfaces` as
 * `createSurface` messages arrive and disappear on `deleteSurface`; actions
 * from any surface reach `onAction`. On unmount every surface is deleted, so a
 * StrictMode remount starts clean instead of tripping duplicate-surface errors.
 *
 * By default the processor accepts basic, minimal and Material extension
 * catalogs, and `getClientCapabilities` advertises all three ids.
 */
export function useA2ui(options: UseA2uiOptions = {}): UseA2uiResult {
  const { catalogs, onAction, onError, version = 'v0.9.1' } = options
  const onActionRef = useRef(onAction)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onActionRef.current = onAction
    onErrorRef.current = onError
  })

  const [processor] = useState(
    () =>
      new MessageProcessor<Material3ComponentImplementation>(
        [...(catalogs ?? material3Catalogs)],
        (action) => onActionRef.current?.(action),
        { version },
      ),
  )

  const store = useMemo(() => createSurfaceStore(processor), [processor])
  const surfaces = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  const clear = useCallback(() => {
    for (const id of [...processor.model.surfacesMap.keys()]) processor.model.deleteSurface(id)
  }, [processor])

  useEffect(() => {
    const errorSubscriptions = new Map<string, { unsubscribe(): void }>()
    const created = processor.onSurfaceCreated((surface) => {
      errorSubscriptions.set(
        surface.id,
        surface.onError.subscribe((error) => onErrorRef.current?.(error, surface.id)),
      )
    })
    const deleted = processor.onSurfaceDeleted((id) => {
      errorSubscriptions.get(id)?.unsubscribe()
      errorSubscriptions.delete(id)
    })
    return () => {
      created.unsubscribe()
      deleted.unsubscribe()
      errorSubscriptions.forEach((subscription) => subscription.unsubscribe())
      clear()
    }
  }, [processor, clear])

  // web_core stores `updateDataModel` values by reference and writes user
  // input into them, so without a copy the host's message objects — a
  // transcript kept in state, a fixture replayed later — would change
  // underneath it and replay with stale values.
  const processMessages = useCallback(
    (messages: readonly A2uiMessage[] | A2uiMessageListWrapper) => {
      try {
        processor.processMessages(structuredClone(isWrapper(messages) ? messages : [...messages]))
      } catch (error) {
        if (!onErrorRef.current) throw error
        onErrorRef.current(error)
      }
    },
    [processor],
  )

  const getClientCapabilities = useCallback(
    (capabilitiesOptions?: CapabilitiesOptions) => processor.getClientCapabilities(capabilitiesOptions),
    [processor],
  )
  const getClientDataModel = useCallback(() => processor.getClientDataModel(), [processor])

  return useMemo(
    () => ({ processor, surfaces, processMessages, getClientCapabilities, getClientDataModel, clear }),
    [processor, surfaces, processMessages, getClientCapabilities, getClientDataModel, clear],
  )
}
