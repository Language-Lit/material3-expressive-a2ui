import { Carousel as MaterialCarousel } from '@language-lit/material3-expressive'
import { ChildListSchema } from '@a2ui/web_core/v0_9'

import { materialCommonSchema } from '../../internal/materialSchemas'
import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

const api = {
  name: 'Carousel',
  schema: materialCommonSchema.extend({
    children: ChildListSchema.describe(
      'REF:common_types.json#/$defs/ChildList|Items in a hero carousel; accepts explicit child IDs or a data template.',
    ),
  }),
}
export const CarouselImplementation = createMaterial3Component(api, ({ props, buildChild }) => {
  const items = (props.children ?? []).map((child, index) => ({
    key: typeof child === 'string' ? `${child}#${index}` : `${child.id}@${child.basePath}`,
    content: typeof child === 'string' ? buildChild(child) : buildChild(child.id, child.basePath),
  }))
  return (
    <MaterialCarousel
      className="m3e-a2ui-carousel"
      style={weightStyle(props.weight)}
      layout="hero"
      items={items}
      aria-label={asText(props.accessibility?.label) || 'Carousel'}
      aria-description={asText(props.accessibility?.description) || undefined}
    />
  )
})
