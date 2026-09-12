import { ListItem as MaterialListItem } from '@language-lit/material3-expressive'
import { ActionSchema, DynamicStringSchema } from '@a2ui/web_core/v0_9'

import { materialControlSchema } from '../../internal/materialSchemas'
import { isInvalid } from '../../internal/checks'
import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

const api = {
  name: 'ListItem',
  schema: materialControlSchema.extend({
    headline: DynamicStringSchema.describe(
      'REF:common_types.json#/$defs/DynamicString|Main item text.',
    ),
    supportingText: DynamicStringSchema.optional(),
    overline: DynamicStringSchema.optional(),
    action: ActionSchema.optional().describe(
      'REF:common_types.json#/$defs/Action|Makes the whole row an action button when supplied.',
    ),
  }),
}
export const ListItemImplementation = createMaterial3Component(api, ({ props }) => {
  const common = {
    className: 'm3e-a2ui-list-item',
    style: weightStyle(props.weight),
    headline: asText(props.headline),
    supportingText: asText(props.supportingText) || undefined,
    overline: asText(props.overline) || undefined,
    disabled: props.disabled === true || isInvalid(props),
    'aria-label': asText(props.accessibility?.label) || undefined,
    'aria-description': asText(props.accessibility?.description) || undefined,
  }
  return props.action ? (
    <MaterialListItem {...common} interaction="action" onClick={() => props.action?.()} />
  ) : (
    <MaterialListItem {...common} />
  )
})
