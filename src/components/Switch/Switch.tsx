import { Switch as MaterialSwitch, Text } from '@language-lit/material3-expressive'
import { DynamicBooleanSchema, DynamicStringSchema } from '@a2ui/web_core/v0_9'
import { useId, useState } from 'react'

import { materialControlSchema } from '../../internal/materialSchemas'
import { isInvalid, validationMessage } from '../../internal/checks'
import { asText, weightStyle } from '../../internal/layout'
import { useBoundValue } from '../../internal/useBoundValue'
import { createMaterial3Component } from '../../runtime/adapter'

const api = {
  name: 'Switch',
  schema: materialControlSchema.extend({
    label: DynamicStringSchema.describe(
      'REF:common_types.json#/$defs/DynamicString|Visible label for the switch.',
    ),
    value: DynamicBooleanSchema.describe(
      'REF:common_types.json#/$defs/DynamicBoolean|Checked state; a path binding writes changes back.',
    ),
  }),
}
export const SwitchImplementation = createMaterial3Component(api, ({ props }) => {
  const [value, setValue] = useBoundValue(props.value === true, props.setValue)
  const [touched, setTouched] = useState(false)
  const errorId = useId()
  const error = touched && isInvalid(props)
  const message = error ? validationMessage(props) : undefined
  return (
    <div className="m3e-a2ui-switch" style={weightStyle(props.weight)}>
      <label className="m3e-a2ui-switch__label">
        <MaterialSwitch
          checked={value}
          disabled={props.disabled === true}
          onCheckedChange={(next) => {
            setTouched(true)
            setValue(next)
          }}
          onBlur={() => setTouched(true)}
          aria-invalid={error || undefined}
          aria-describedby={message ? errorId : undefined}
          aria-label={asText(props.accessibility?.label) || undefined}
          aria-description={asText(props.accessibility?.description) || undefined}
        />
        <Text as="span" variant="bodyLarge">
          {asText(props.label)}
        </Text>
      </label>
      {message ? (
        <Text as="span" variant="bodySmall" id={errorId} className="m3e-a2ui-field-error">
          {message}
        </Text>
      ) : null}
    </div>
  )
})
