import { CircularProgress, LinearProgress } from '@language-lit/material3-expressive'
import { DynamicBooleanSchema, DynamicNumberSchema, DynamicStringSchema } from '@a2ui/web_core/v0_9'

import { materialCommonSchema } from '../../internal/materialSchemas'
import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

const api = {
  name: 'Progress',
  schema: materialCommonSchema.extend({
    label: DynamicStringSchema.describe(
      'REF:common_types.json#/$defs/DynamicString|Accessible name of the operation in progress.',
    ),
    value: DynamicNumberSchema.optional().describe(
      'REF:common_types.json#/$defs/DynamicNumber|Progress from zero to max. Omit for indeterminate progress.',
    ),
    max: DynamicNumberSchema.optional().describe(
      'REF:common_types.json#/$defs/DynamicNumber|Positive upper bound; defaults to 1.',
    ),
    circular: DynamicBooleanSchema.optional().describe(
      'REF:common_types.json#/$defs/DynamicBoolean|Use circular progress instead of linear progress.',
    ),
  }),
}
export const ProgressImplementation = createMaterial3Component(api, ({ props }) => {
  const max =
    typeof props.max === 'number' && Number.isFinite(props.max) && props.max > 0 ? props.max : 1
  const value =
    typeof props.value === 'number' && Number.isFinite(props.value)
      ? Math.max(0, Math.min(max, props.value))
      : undefined
  const Progress = props.circular === true ? CircularProgress : LinearProgress
  return (
    <div className="m3e-a2ui-progress" style={weightStyle(props.weight)}>
      <Progress
        value={value}
        max={max}
        aria-label={asText(props.accessibility?.label) || asText(props.label)}
        aria-description={asText(props.accessibility?.description) || undefined}
      />
    </div>
  )
})
