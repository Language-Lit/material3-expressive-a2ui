import { Divider as MaterialDivider } from '@language-lit/material3-expressive'
import { DividerApi } from '@a2ui/web_core/v0_9/basic_catalog'

import { cx } from '../../internal/classNames'
import { weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

export const DividerImplementation = createMaterial3Component(DividerApi, ({ props }) => {
  const vertical = props.axis === 'vertical'
  return (
    <MaterialDivider
      orientation={vertical ? 'vertical' : 'horizontal'}
      className={cx('m3e-a2ui-divider', vertical && 'm3e-a2ui-divider--vertical')}
      style={weightStyle(props.weight)}
    />
  )
})
