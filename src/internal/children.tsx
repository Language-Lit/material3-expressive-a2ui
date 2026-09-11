import { Fragment, type ReactNode } from 'react'
import type { ResolvedChildRef } from '@a2ui/web_core/v0_9'

import type { BuildChild } from '../runtime/adapter'

/** What the binder hands a component for a `ChildList` property. */
export type ResolvedChildList = readonly (string | ResolvedChildRef)[] | undefined

/**
 * Builds every entry of a resolved child list. A string entry is a component
 * id rendered in the parent's data scope; an object entry came from a
 * template (`{componentId, path}`) and carries the absolute data path of the
 * item it stands for, which becomes that child's scope.
 */
export function renderChildList(
  children: ResolvedChildList,
  buildChild: BuildChild,
  wrap?: (node: ReactNode, key: string) => ReactNode,
): ReactNode[] {
  if (!children) return []
  return children.map((child, index) => {
    const key = typeof child === 'string' ? `${child}#${index}` : `${child.id}@${child.basePath}`
    const node = typeof child === 'string' ? buildChild(child) : buildChild(child.id, child.basePath)
    return wrap ? wrap(node, key) : <Fragment key={key}>{node}</Fragment>
  })
}
