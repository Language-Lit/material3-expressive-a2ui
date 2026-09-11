import { memo, useCallback, useRef, useSyncExternalStore, type FC, type ReactNode } from 'react'
import {
  GenericBinder,
  type ComponentApi,
  type ComponentContext,
  type InferredComponentApiSchemaType,
  type ResolveA2uiProps,
} from '@a2ui/web_core/v0_9'

/** Builds a child component by id, optionally in a different data scope. */
export type BuildChild = (componentId: string, basePath?: string) => ReactNode

/** What a surface renderer passes to an implementation's `render`. */
export interface A2uiHostProps {
  readonly context: ComponentContext
  readonly buildChild: BuildChild
}

/** What a Material 3 render function receives: resolved props plus the host props. */
export interface A2uiRenderProps<Props> extends A2uiHostProps {
  readonly props: Props
}

/** The binder's output for a component API: literals resolved, actions callable, setters generated. */
export type ResolvedProps<Api extends ComponentApi> = ResolveA2uiProps<
  InferredComponentApiSchemaType<Api>
>

/**
 * A render-only component implementation.
 *
 * It carries the API's name and schema (so a `Catalog` can validate messages
 * and advertise capabilities) and a `render` component that binds itself.
 * Because it declares no `view`, it is portable: this package's `A2uiSurface`,
 * the official `@a2ui/react` surface (through its render fallback) and
 * CopilotKit's vendored surface all render it the same way.
 */
export interface Material3ComponentImplementation<Api extends ComponentApi = ComponentApi>
  extends ComponentApi<Api['schema']> {
  readonly name: string
  readonly schema: Api['schema']
  readonly render: FC<A2uiHostProps>
}

interface BinderSlot<Props> {
  readonly context: ComponentContext
  readonly binder: GenericBinder<Props>
}

/**
 * Wraps a Material 3 render function as an A2UI component implementation.
 *
 * The wrapper owns one `GenericBinder` per component context. The binder
 * subscribes to the data model and to component updates on the first React
 * subscriber and tears everything down on the last, so mounting and
 * unmounting — including StrictMode's simulated remount — leaves no listeners
 * behind. Props reach the render function through `useSyncExternalStore`, so
 * a data-model change re-renders exactly the components bound to it.
 */
export function createMaterial3Component<Api extends ComponentApi>(
  api: Api,
  Render: FC<A2uiRenderProps<ResolvedProps<Api>>>,
): Material3ComponentImplementation<Api> {
  type Props = ResolvedProps<Api>

  const MemoizedRender = memo(Render, (previous, next) => {
    if (previous.props !== next.props) return false
    if (previous.buildChild !== next.buildChild) return false
    if (previous.context.componentModel !== next.context.componentModel) return false
    return previous.context.dataContext.path === next.context.dataContext.path
  })
  MemoizedRender.displayName = `Material3(${api.name})`

  const Host: FC<A2uiHostProps> = ({ context, buildChild }) => {
    const slot = useRef<BinderSlot<Props> | null>(null)
    if (!slot.current || slot.current.context !== context) {
      slot.current?.binder.dispose()
      slot.current = { context, binder: new GenericBinder<Props>(context, api.schema) }
    }
    const binder = slot.current.binder

    const subscribe = useCallback(
      (onChange: () => void) => {
        const subscription = binder.subscribe(onChange)
        return () => subscription.unsubscribe()
      },
      [binder],
    )
    const getSnapshot = useCallback(() => binder.snapshot, [binder])
    const props = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

    return <MemoizedRender props={props ?? ({} as Props)} context={context} buildChild={buildChild} />
  }
  Host.displayName = `A2ui(${api.name})`

  return { name: api.name, schema: api.schema, render: Host }
}
