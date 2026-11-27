import { spec } from '@a2ui/web_core'
import { DynamicBooleanSchema } from '@a2ui/web_core/v1_0'
import { CheckBoxApi, TextApi } from '@a2ui/web_core/catalogs/basic/v1'

// Composition preserves web_core's v1.0 specDef('Weight'), `@checks` mixin,
// and REF:#/$defs/... metadata without importing zod directly.
export const materialCommonBase = TextApi.schema.pick({ weight: true })

export const materialControlBase = CheckBoxApi.schema
  .pick({ '@checks': true, weight: true })
  .extend({
    disabled: DynamicBooleanSchema.optional().describe(
      'REF:#/$defs/DynamicBoolean|Whether the control is unavailable.',
    ),
  })

export function defineMaterialCommonSchema<T extends { strict(): T }>(schema: T): T {
  return spec(schema.strict() as never, { mixins: [] }) as unknown as T
}

export function defineMaterialControlSchema<T extends { strict(): T }>(schema: T): T {
  return spec(schema.strict() as never, { mixins: ['Checkable'] }) as unknown as T
}
