import { DynamicBooleanSchema } from '@a2ui/web_core/v0_9'
import { CheckBoxApi, TextApi } from '@a2ui/web_core/v0_9/basic_catalog'

import { referencedSchema } from './catalogSchemas'

// Composition preserves web_core's binding metadata and validation ownership.
export const materialCommonSchema = TextApi.schema
  .pick({ weight: true, accessibility: true })
  .extend({
    accessibility: referencedSchema(
      TextApi.schema.shape.accessibility,
      'AccessibilityAttributes',
    ),
  })
export const materialControlSchema = CheckBoxApi.schema
  .pick({ weight: true, accessibility: true, checks: true })
  .extend({
    accessibility: referencedSchema(
      CheckBoxApi.schema.shape.accessibility,
      'AccessibilityAttributes',
    ),
    disabled: DynamicBooleanSchema.optional().describe(
      'REF:common_types.json#/$defs/DynamicBoolean|Whether the control is unavailable.',
    ),
  })
