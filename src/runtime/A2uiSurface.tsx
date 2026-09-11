import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react'
import { ComponentContext, type ComponentModel, type SurfaceModel } from '@a2ui/web_core/v0_9'
import { Text } from '@language-lit/material3-expressive'

import { cx } from '../internal/classNames'
import type { BuildChild, Material3ComponentImplementation } from './adapter'

/** The component id every A2UI surface starts rendering from. */
export const ROOT_COMPONENT_ID = 'root'

/** A surface whose catalog holds Material 3 implementations. */
export type A2uiSurfaceModel = SurfaceModel<Material3ComponentImplementation>

/** The theme fields the basic catalog defines for `createSurface`. */
export interface A2uiSurfaceTheme {
  readonly primaryColor?: string
  readonly iconUrl?: string
  readonly agentDisplayName?: string
}

interface A2uiSurfaceOwnProps {
  /** The surface to render, from a `MessageProcessor` or `useA2ui`. */
  readonly surface: A2uiSurfaceModel
  /** The component to start from. The protocol fixes it to `root`. */
  readonly rootId?: string
  /**
   * Whether to show the agent's name and icon from the surface theme above
   * the content. On by default; nothing is shown when the theme has neither.
   */
  readonly attribution?: boolean
}

export type A2uiSurfaceProps = A2uiSurfaceOwnProps &
  Omit<ComponentPropsWithoutRef<'div'>, keyof A2uiSurfaceOwnProps | 'children'>

function useComponentModel(surface: A2uiSurfaceModel, id: string): ComponentModel | undefined {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const created = surface.componentsModel.onCreated.subscribe((model) => {
        if (model.id === id) onChange()
      })
      const deleted = surface.componentsModel.onDeleted.subscribe((deletedId) => {
        if (deletedId === id) onChange()
      })
      return () => {
        created.unsubscribe()
        deleted.unsubscribe()
      }
    },
    [surface, id],
  )
  const getSnapshot = useCallback(() => surface.componentsModel.get(id), [surface, id])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Shown for a component that is referenced but has not arrived yet. Agents
 * stream `updateComponents` incrementally, so a parent can name a child a
 * message or two before the child exists.
 */
function Placeholder({ id }: { readonly id: string }) {
  return <span className="m3e-a2ui-placeholder" data-a2ui-component={id} aria-busy="true" />
}

function UnknownComponent({
  surface,
  model,
}: {
  readonly surface: A2uiSurfaceModel
  readonly model: ComponentModel
}) {
  useEffect(() => {
    void surface.dispatchError({
      code: 'UNKNOWN_COMPONENT',
      message: `Component "${model.type}" (id "${model.id}") is not in catalog "${surface.catalog.id}".`,
      componentId: model.id,
    })
  }, [surface, model])
  return (
    <div className="m3e-a2ui-unknown" role="note" data-a2ui-component={model.id}>
      <Text as="span" variant="bodySmall">
        Unsupported component “{model.type}”
      </Text>
    </div>
  )
}

interface ChildProps {
  readonly surface: A2uiSurfaceModel
  readonly id: string
  readonly basePath: string
}

function ResolvedChild({
  surface,
  model,
  basePath,
}: {
  readonly surface: A2uiSurfaceModel
  readonly model: ComponentModel
  readonly basePath: string
}) {
  const context = useMemo(
    () => new ComponentContext(surface, model.id, basePath),
    [surface, model, basePath],
  )
  const buildChild = useCallback<BuildChild>(
    (childId, childPath) => {
      const path = childPath ?? basePath
      return <DeferredChild key={`${childId}@${path}`} surface={surface} id={childId} basePath={path} />
    },
    [surface, basePath],
  )
  const implementation = surface.catalog.components.get(model.type)
  if (!implementation) return <UnknownComponent surface={surface} model={model} />
  const Render = implementation.render
  return <Render context={context} buildChild={buildChild} />
}

const DeferredChild = memo(function DeferredChild({ surface, id, basePath }: ChildProps) {
  const model = useComponentModel(surface, id)
  if (!model) return <Placeholder id={id} />
  return <ResolvedChild surface={surface} model={model} basePath={basePath} />
})

/**
 * Renders one A2UI surface with the Material 3 catalog.
 *
 * Each component subscribes to its own model, so streamed updates re-render
 * only what changed. The frame is a plain block: the host decides where a
 * surface sits (a chat bubble, a panel, a page) and this component fills it.
 */
export function A2uiSurface({
  surface,
  rootId = ROOT_COMPONENT_ID,
  attribution = true,
  className,
  style,
  ...rest
}: A2uiSurfaceProps) {
  const theme = (surface.theme ?? {}) as A2uiSurfaceTheme
  const agentName = typeof theme.agentDisplayName === 'string' ? theme.agentDisplayName : undefined
  const iconUrl = typeof theme.iconUrl === 'string' ? theme.iconUrl : undefined
  const showAttribution = attribution && (agentName !== undefined || iconUrl !== undefined)
  const frameStyle =
    typeof theme.primaryColor === 'string'
      ? ({ ...style, '--m3e-a2ui-agent-color': theme.primaryColor } as CSSProperties)
      : style

  return (
    <div
      {...rest}
      className={cx('m3e-a2ui-surface', className)}
      style={frameStyle}
      data-a2ui-surface={surface.id}
    >
      {showAttribution ? (
        <div className="m3e-a2ui-surface__agent">
          {iconUrl !== undefined ? (
            <img className="m3e-a2ui-surface__agent-icon" src={iconUrl} alt="" />
          ) : null}
          {agentName !== undefined ? (
            <Text as="span" variant="labelLarge" className="m3e-a2ui-surface__agent-name">
              {agentName}
            </Text>
          ) : null}
        </div>
      ) : null}
      <DeferredChild surface={surface} id={rootId} basePath="/" />
    </div>
  )
}
