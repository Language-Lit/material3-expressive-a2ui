import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  MessageProcessor,
  type ActionPayload,
  type A2uiWarningPayload,
  type CallOptions,
  type CapabilitiesOptions,
  type Catalog,
  type ExecutionContext,
  type OutboundMessageListener,
  type ProtocolVersion,
  type RendererCapabilities,
  type SurfaceModel,
  type ValidationConfig,
} from '@a2ui/web_core'
import {
  AgentToRendererMessageSchema,
  type AgentToRendererMessage,
  type FunctionCall,
  type RendererFunctionResponseMessage,
} from '@a2ui/web_core/v1_0'

import { material3Catalogs } from '../catalog'
import type { Material3ComponentImplementation } from './adapter'

export type A2uiProtocolVersion = '1.0'

/** A wrapper object holding a batch of v1.0 agent-to-renderer messages. */
export interface A2uiMessageListWrapper {
  readonly messages: readonly AgentToRendererMessage[]
}

/** Input accepted by `processMessages` and `processMessagesAsync`. */
export type A2uiMessageInput =
  | AgentToRendererMessage
  | readonly AgentToRendererMessage[]
  | A2uiMessageListWrapper

export interface UseA2uiOptions {
  /**
   * Catalogs the processor accepts `createSurface` and mixed-catalog `@catalogId`
   * references for. Defaults to the v1.0 basic and Material extension catalogs.
   * Read once, when the hook first runs.
   */
  readonly catalogs?: readonly Catalog<Material3ComponentImplementation>[]
  /** Called with every action a surface dispatches (a button's `event`). */
  readonly onAction?: (action: ActionPayload) => void | Promise<void>
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
  /** Called when a surface emits a non-fatal warning (such as `MISSING_DATA_BINDING`). */
  readonly onWarning?: (warning: A2uiWarningPayload, surfaceId: string) => void
  /**
   * Listener receiving outbound renderer-to-agent messages (required for
   * `callAgentFunction`, `rendererFunctionResponse`, and `unifiedOutbound`).
   */
  readonly outboundListener?: OutboundMessageListener
  /**
   * When true, `outboundListener` also receives action and error envelopes.
   * Requires `outboundListener`.
   */
  readonly unifiedOutbound?: boolean
  /** Optional validation configuration forwarded to `MessageProcessor`. */
  readonly validationConfig?: ValidationConfig
  /** Default timeout in milliseconds for `callAgentFunction` requests. */
  readonly defaultTimeoutMs?: number
  /** Protocol version for capabilities and data model reporting. Defaults to `'1.0'`. */
  readonly version?: A2uiProtocolVersion
}

export interface UseA2uiResult {
  /** The underlying processor, for hosts that need the full API. */
  readonly processor: MessageProcessor<Material3ComponentImplementation>
  /** Live surfaces in creation order. Each one renders with `A2uiSurface`. */
  readonly surfaces: readonly SurfaceModel<Material3ComponentImplementation>[]
  /**
   * Feeds agent-to-renderer messages (a single message, a JSONL batch, or a
   * `{ messages }` wrapper) to the processor. The batch is copied and each
   * v1.0 envelope is validated before processing, so an invalid version or
   * envelope cannot partially mutate the processor. The objects you pass are
   * never mutated and can be replayed. Component and state errors raised
   * during processing still follow web_core's normal error behavior.
   */
  readonly processMessages: (messages: A2uiMessageInput, context?: ExecutionContext) => void
  /**
   * Asynchronously feeds agent-to-renderer messages, executing any
   * `callRendererFunction` RPC calls and returning the resulting
   * `rendererFunctionResponse` messages.
   */
  readonly processMessagesAsync: (
    messages: A2uiMessageInput,
    context?: ExecutionContext,
  ) => Promise<RendererFunctionResponseMessage[]>
  /** Invokes a remote function on the agent for a surface. */
  readonly callAgentFunction: <TRes = unknown>(
    surfaceId: string,
    call: FunctionCall,
    options?: CallOptions,
  ) => Promise<TRes>
  /** The v1.0 `rendererCapabilities` object to send with the first request. */
  readonly getRendererCapabilities: (options?: CapabilitiesOptions) => RendererCapabilities
  /** Alias for `getRendererCapabilities`, kept for ergonomic migration. */
  readonly getClientCapabilities: (options?: CapabilitiesOptions) => RendererCapabilities
  /** The data model of every surface created with `sendDataModel`, or undefined. */
  readonly getRendererDataModel: (version?: ProtocolVersion) => Record<string, unknown> | undefined
  /** Alias for `getRendererDataModel`, kept for ergonomic migration. */
  readonly getClientDataModel: (version?: ProtocolVersion) => Record<string, unknown> | undefined
  /** Deletes every surface. */
  readonly clear: () => void
}

type Surfaces = readonly SurfaceModel<Material3ComponentImplementation>[]

function isMessageListWrapper(value: unknown): value is A2uiMessageListWrapper {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'messages' in value &&
    Array.isArray((value as { messages?: unknown }).messages)
  )
}

function validateMessageInput(input: A2uiMessageInput): AgentToRendererMessage[] {
  const rawList = Array.isArray(input)
    ? [...input]
    : isMessageListWrapper(input)
      ? [...input.messages]
      : [input]
  const copied = structuredClone(rawList)
  return copied.map((item) => AgentToRendererMessageSchema.parse(item))
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
 * v1.0 messages however its agent framework delivers them and hands the parsed
 * messages to `processMessages` (or `processMessagesAsync` for RPCs). Surfaces
 * appear in `surfaces` as `createSurface` messages arrive and disappear on
 * `deleteSurface`; actions from any surface reach `onAction`. On unmount every
 * surface is deleted, so a StrictMode remount starts clean instead of tripping
 * duplicate-surface errors.
 *
 * By default the processor accepts the v1.0 basic and Material extension
 * catalogs, and `getRendererCapabilities` advertises both ids.
 */
export function useA2ui(options: UseA2uiOptions = {}): UseA2uiResult {
  const {
    catalogs,
    onAction,
    onError,
    onWarning,
    outboundListener,
    unifiedOutbound,
    validationConfig,
    defaultTimeoutMs,
    version = '1.0',
  } = options
  const onActionRef = useRef(onAction)
  const onErrorRef = useRef(onError)
  const onWarningRef = useRef(onWarning)
  const outboundListenerRef = useRef(outboundListener)
  useEffect(() => {
    onActionRef.current = onAction
    onErrorRef.current = onError
    onWarningRef.current = onWarning
    outboundListenerRef.current = outboundListener
  })

  const [processor] = useState(
    () =>
      new MessageProcessor<Material3ComponentImplementation>(
        [...(catalogs ?? material3Catalogs)],
        (action) => onActionRef.current?.(action),
        {
          version,
          ...(outboundListener
            ? {
                outboundListener: (message) => outboundListenerRef.current?.(message),
              }
            : {}),
          ...(unifiedOutbound !== undefined ? { unifiedOutbound } : {}),
          ...(validationConfig !== undefined ? { validationConfig } : {}),
          ...(defaultTimeoutMs !== undefined ? { defaultTimeoutMs } : {}),
        },
      ),
  )

  const store = useMemo(() => createSurfaceStore(processor), [processor])
  const surfaces = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  const clear = useCallback(() => {
    for (const id of [...processor.model.surfacesMap.keys()]) processor.model.deleteSurface(id)
  }, [processor])

  useEffect(() => {
    const surfaceSubscriptions = new Map<string, { unsubscribe(): void }[]>()
    const created = processor.onSurfaceCreated((surface) => {
      const subs = [
        surface.onError.subscribe((error) => onErrorRef.current?.(error, surface.id)),
        surface.onWarning.subscribe((warning) => onWarningRef.current?.(warning, surface.id)),
      ]
      surfaceSubscriptions.set(surface.id, subs)
    })
    const deleted = processor.onSurfaceDeleted((id) => {
      surfaceSubscriptions.get(id)?.forEach((subscription) => subscription.unsubscribe())
      surfaceSubscriptions.delete(id)
    })
    return () => {
      created.unsubscribe()
      deleted.unsubscribe()
      surfaceSubscriptions.forEach((subs) =>
        subs.forEach((subscription) => subscription.unsubscribe()),
      )
      clear()
    }
  }, [processor, clear])

  // web_core stores `updateDataModel` values by reference and writes user
  // input into them, so without a copy the host's message objects — a
  // transcript kept in state, a fixture replayed later — would change
  // underneath it and replay with stale values.
  const processMessages = useCallback(
    (messages: A2uiMessageInput, context?: ExecutionContext) => {
      try {
        const validated = validateMessageInput(messages)
        processor.processMessages(validated, context)
      } catch (error) {
        if (!onErrorRef.current) throw error
        onErrorRef.current(error)
      }
    },
    [processor],
  )

  const processMessagesAsync = useCallback(
    async (
      messages: A2uiMessageInput,
      context?: ExecutionContext,
    ): Promise<RendererFunctionResponseMessage[]> => {
      try {
        const validated = validateMessageInput(messages)
        return await processor.processMessagesAsync(validated, context)
      } catch (error) {
        if (!onErrorRef.current) throw error
        onErrorRef.current(error)
        return []
      }
    },
    [processor],
  )

  const callAgentFunction = useCallback(
    <TRes = unknown>(surfaceId: string, call: FunctionCall, callOptions?: CallOptions) =>
      processor.callAgentFunction<TRes>(surfaceId, call, callOptions),
    [processor],
  )

  const getRendererCapabilities = useCallback(
    (capabilitiesOptions?: CapabilitiesOptions) => {
      const versions =
        capabilitiesOptions?.versions && capabilitiesOptions.versions.length > 0
          ? capabilitiesOptions.versions
          : [capabilitiesOptions?.version ?? version]
      return processor.getRendererCapabilities({ ...capabilitiesOptions, versions })
    },
    [processor, version],
  )

  const getRendererDataModel = useCallback(
    (targetVersion?: ProtocolVersion) => processor.getRendererDataModel(targetVersion),
    [processor],
  )

  return useMemo(
    () => ({
      processor,
      surfaces,
      processMessages,
      processMessagesAsync,
      callAgentFunction,
      getRendererCapabilities,
      getClientCapabilities: getRendererCapabilities,
      getRendererDataModel,
      getClientDataModel: getRendererDataModel,
      clear,
    }),
    [
      processor,
      surfaces,
      processMessages,
      processMessagesAsync,
      callAgentFunction,
      getRendererCapabilities,
      getRendererDataModel,
      clear,
    ],
  )
}
