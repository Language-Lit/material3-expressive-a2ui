import { CircularProgress, LinearProgress } from '@language-lit/material3-expressive'
import { DynamicBooleanSchema, DynamicNumberSchema, DynamicStringSchema } from '@a2ui/web_core/v1_0'

import { defineMaterialCommonSchema, materialCommonBase } from '../../internal/materialSchemas'
import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

const api = {
  name: 'Progress',
  schema: defineMaterialCommonSchema(
    materialCommonBase.extend({
      label: DynamicStringSchema.describe(
        'REF:#/$defs/DynamicString|Accessible name of the operation in progress.',
      ),
      value: DynamicNumberSchema.optional().describe(
        'REF:#/$defs/DynamicNumber|Progress from zero to max. Omit for indeterminate progress.',
      ),
      max: DynamicNumberSchema.optional().describe(
        'REF:#/$defs/DynamicNumber|Positive upper bound; defaults to 1.',
      ),
      circular: DynamicBooleanSchema.optional().describe(
        'REF:#/$defs/DynamicBoolean|Use circular progress instead of linear progress.',
      ),
    }),
  ),
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
