import { Select as MaterialSelect } from '@language-lit/material3-expressive'
import { DynamicStringSchema } from '@a2ui/web_core/v0_9'
import { ChoicePickerApi } from '@a2ui/web_core/v0_9/basic_catalog'
import { useState } from 'react'

import { materialControlSchema } from '../../internal/materialSchemas'
import { isInvalid, validationMessage } from '../../internal/checks'
import { asText, weightStyle } from '../../internal/layout'
import { useBoundValue } from '../../internal/useBoundValue'
import { createMaterial3Component } from '../../runtime/adapter'

const api = {
  name: 'Select',
  schema: materialControlSchema.extend({
    label: DynamicStringSchema.describe(
      'REF:common_types.json#/$defs/DynamicString|Visible label for the select.',
    ),
    value: DynamicStringSchema.describe(
      'REF:common_types.json#/$defs/DynamicString|Selected option value; a path binding writes changes back.',
    ),
    options: ChoicePickerApi.schema.shape.options,
  }),
}
export const SelectImplementation = createMaterial3Component(api, ({ props }) => {
  const [value, setValue] = useBoundValue(asText(props.value), props.setValue)
  const [touched, setTouched] = useState(false)
  const error = touched && isInvalid(props)
  return (
    <MaterialSelect
      className="m3e-a2ui-select"
      style={weightStyle(props.weight)}
      label={asText(props.label)}
      value={value}
      variant="outlined"
      options={(props.options ?? []).map((option) => ({
        value: option.value,
        label: asText(option.label),
      }))}
      onValueChange={(next) => {
        setTouched(true)
        setValue(next)
      }}
      onBlur={() => setTouched(true)}
      disabled={props.disabled === true}
      error={error}
      supportingText={error ? validationMessage(props) : undefined}
      aria-label={asText(props.accessibility?.label) || undefined}
      aria-description={asText(props.accessibility?.description) || undefined}
    />
  )
})
