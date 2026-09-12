import { Chip as MaterialChip } from '@language-lit/material3-expressive'
import { ActionSchema, DynamicBooleanSchema, DynamicStringSchema } from '@a2ui/web_core/v0_9'

import { materialControlSchema } from '../../internal/materialSchemas'
import { isInvalid } from '../../internal/checks'
import { asText, weightStyle } from '../../internal/layout'
import { useBoundValue } from '../../internal/useBoundValue'
import { createMaterial3Component } from '../../runtime/adapter'

const api = {
  name: 'Chip',
  schema: materialControlSchema.extend({
    label: DynamicStringSchema.describe(
      'REF:common_types.json#/$defs/DynamicString|Visible chip label.',
    ),
    value: DynamicBooleanSchema.optional().describe(
      'REF:common_types.json#/$defs/DynamicBoolean|When supplied, renders a filter chip with this selected state; otherwise an assist chip.',
    ),
    action: ActionSchema.optional().describe(
      'REF:common_types.json#/$defs/Action|Action dispatched on activation, after writing selected state when applicable.',
    ),
  }),
}
export const ChipImplementation = createMaterial3Component(api, ({ props, context }) => {
  const [value, setValue] = useBoundValue(props.value === true, props.setValue)
  // A bound value can be absent while the stream is arriving; mode follows
  // declaration, not the transient resolved value.
  const filter = 'value' in context.componentModel.properties
  const common = {
    className: 'm3e-a2ui-chip',
    style: weightStyle(props.weight),
    disabled: props.disabled === true || isInvalid(props),
    'aria-label': asText(props.accessibility?.label) || undefined,
    'aria-description': asText(props.accessibility?.description) || undefined,
  }
  return filter ? (
    <MaterialChip
      {...common}
      kind="filter"
      selected={value}
      onSelectedChange={(next) => {
        setValue(next)
        props.action?.()
      }}
    >
      {asText(props.label)}
    </MaterialChip>
  ) : (
    <MaterialChip {...common} kind="assist" onClick={() => props.action?.()}>
      {asText(props.label)}
    </MaterialChip>
  )
})
