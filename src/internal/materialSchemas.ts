import { DynamicBooleanSchema } from '@a2ui/web_core/v0_9'
import { CheckBoxApi, TextApi } from '@a2ui/web_core/v0_9/basic_catalog'

// Composition preserves web_core's binding metadata and validation ownership.
export const materialCommonSchema = TextApi.schema.pick({ weight: true, accessibility: true })
export const materialControlSchema = CheckBoxApi.schema
  .pick({ weight: true, accessibility: true, checks: true })
  .extend({
    disabled: DynamicBooleanSchema.optional().describe(
      'REF:common_types.json#/$defs/DynamicBoolean|Whether the control is unavailable.',
    ),
  })
