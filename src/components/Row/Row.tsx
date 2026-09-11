import { RowApi } from '@a2ui/web_core/v0_9/basic_catalog'

import { renderChildList } from '../../internal/children'
import { asText, layoutClasses, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

export const RowImplementation = createMaterial3Component(RowApi, ({ props, buildChild }) => (
  <div
    className={layoutClasses('m3e-a2ui-row', props.justify, props.align)}
    style={weightStyle(props.weight)}
    aria-label={asText(props.accessibility?.label) || undefined}
  >
    {renderChildList(props.children, buildChild)}
  </div>
))
