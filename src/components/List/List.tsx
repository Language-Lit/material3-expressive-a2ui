import { ListApi } from '@a2ui/web_core/v0_9/basic_catalog'

import { renderChildList } from '../../internal/children'
import { cx } from '../../internal/classNames'
import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

export const ListImplementation = createMaterial3Component(ListApi, ({ props, buildChild }) => {
  const direction = props.direction === 'horizontal' ? 'horizontal' : 'vertical'
  const align = props.align ?? 'stretch'
  const className = cx(
    'm3e-a2ui-list',
    `m3e-a2ui-list--${direction}`,
    `m3e-a2ui-list--align-${align}`,
    props.listStyle ? `m3e-a2ui-list--${props.listStyle}` : undefined,
  )
  const style = weightStyle(props.weight)
  const label = asText(props.accessibility?.label) || undefined

  if (props.listStyle === 'ordered' || props.listStyle === 'unordered') {
    const items = renderChildList(props.children, buildChild, (node, key) => (
      <li key={key} className="m3e-a2ui-list__item">
        {node}
      </li>
    ))
    return props.listStyle === 'ordered' ? (
      <ol className={className} style={style} aria-label={label}>
        {items}
      </ol>
    ) : (
      <ul className={className} style={style} aria-label={label}>
        {items}
      </ul>
    )
  }

  return (
    <div className={className} style={style} aria-label={label}>
      {renderChildList(props.children, buildChild)}
    </div>
  )
})
