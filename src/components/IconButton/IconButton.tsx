import { IconButton as MaterialIconButton, Icon } from '@language-lit/material3-expressive'
import { ActionSchema, DynamicStringSchema } from '@a2ui/web_core/v0_9'

import { materialControlSchema } from '../../internal/materialSchemas'
import { isInvalid } from '../../internal/checks'
import { resolveIconGlyph } from '../../internal/icons'
import { asText, weightStyle } from '../../internal/layout'
import { toMaterialSymbol } from '../Icon'
import { createMaterial3Component } from '../../runtime/adapter'

const api = {
  name: 'IconButton',
  schema: materialControlSchema.extend({
    label: DynamicStringSchema.describe(
      'REF:common_types.json#/$defs/DynamicString|Required accessible name describing the action.',
    ),
    icon: DynamicStringSchema.describe(
      'REF:common_types.json#/$defs/DynamicString|A catalog icon name or Material Symbols name.',
    ),
    action: ActionSchema,
  }),
}
export const IconButtonImplementation = createMaterial3Component(api, ({ props }) => {
  const name = asText(props.icon)
  const source = resolveIconGlyph(name) ?? toMaterialSymbol(name)
  return (
    <MaterialIconButton
      className="m3e-a2ui-icon-button"
      style={weightStyle(props.weight)}
      aria-label={asText(props.accessibility?.label) || asText(props.label)}
      aria-description={asText(props.accessibility?.description) || undefined}
      disabled={props.disabled === true || isInvalid(props)}
      onClick={() => props.action?.()}
    >
      {typeof source === 'string' ? <Icon source={source} /> : <Icon source={source} />}
    </MaterialIconButton>
  )
})
