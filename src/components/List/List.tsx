import { ListApi } from '@a2ui/web_core/catalogs/basic/v1'

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
  )
  const style = weightStyle(props.weight)
  const label = asText(props.accessibility?.label) || undefined

  return (
    <div role="list" className={className} style={style} aria-label={label}>
      {renderChildList(props.children, buildChild, (node, key) => (
        <div key={key} role="listitem" className="m3e-a2ui-list__item">
          {node}
        </div>
      ))}
    </div>
  )
})
