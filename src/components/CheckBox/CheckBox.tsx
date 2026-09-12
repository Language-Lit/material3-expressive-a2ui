import { Checkbox as MaterialCheckbox, Text as MaterialText } from '@language-lit/material3-expressive'
import { CheckBoxApi } from '@a2ui/web_core/v0_9/basic_catalog'
import { useState } from 'react'

import { referencedSchema } from '../../internal/catalogSchemas'
import { isInvalid, validationMessage } from '../../internal/checks'
import { asText, weightStyle } from '../../internal/layout'
import { useBoundValue } from '../../internal/useBoundValue'
import { createMaterial3Component } from '../../runtime/adapter'

const api = {
  name: CheckBoxApi.name,
  schema: CheckBoxApi.schema.extend({
    label: referencedSchema(CheckBoxApi.schema.shape.label, 'DynamicString'),
    value: referencedSchema(CheckBoxApi.schema.shape.value, 'DynamicBoolean'),
  }),
}

export const CheckBoxImplementation = createMaterial3Component(api, ({ props }) => {
  const [checked, setChecked] = useBoundValue(props.value === true, props.setValue)
  const [touched, setTouched] = useState(false)
  const showError = touched && isInvalid(props)
  const message = showError ? validationMessage(props) : undefined
  return (
    <div className="m3e-a2ui-checkbox" style={weightStyle(props.weight)}>
      <label className="m3e-a2ui-checkbox__control">
        <MaterialCheckbox
          checked={checked}
          onCheckedChange={(next) => {
            setTouched(true)
            setChecked(next)
          }}
          aria-invalid={showError || undefined}
          aria-description={asText(props.accessibility?.description) || undefined}
        />
        <MaterialText as="span" variant="bodyLarge" className="m3e-a2ui-checkbox__label">
          {asText(props.label)}
        </MaterialText>
      </label>
      {message ? (
        <MaterialText as="span" variant="bodySmall" className="m3e-a2ui-field-error">
          {message}
        </MaterialText>
      ) : null}
    </div>
  )
})
