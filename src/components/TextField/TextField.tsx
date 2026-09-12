import {
  TextArea as MaterialTextArea,
  TextField as MaterialTextField,
} from '@language-lit/material3-expressive'
import { DynamicStringSchema } from '@a2ui/web_core/v0_9'
import { TextFieldApi } from '@a2ui/web_core/v0_9/basic_catalog'
import { useState } from 'react'

import { isInvalid, validationMessage } from '../../internal/checks'
import { asText, weightStyle } from '../../internal/layout'
import { useBoundValue } from '../../internal/useBoundValue'
import { createMaterial3Component } from '../../runtime/adapter'

/**
 * The v0.9.1 `TextField` plus `placeholder`, which the v1.0 basic catalog
 * adds. Accepted ahead of a v1.0 runtime as forward compatibility (ADR 0004).
 */
const TextFieldApiWithPlaceholder = {
  name: TextFieldApi.name,
  schema: TextFieldApi.schema.extend({
    placeholder: DynamicStringSchema.optional().describe('The placeholder text for the input field.'),
  }),
}

export const TextFieldImplementation = createMaterial3Component(TextFieldApiWithPlaceholder, ({ props }) => {
  const variant = props.variant ?? 'shortText'
  const [value, setValue] = useBoundValue(asText(props.value), props.setValue)
  const [touched, setTouched] = useState(false)
  // Checks evaluate from the first render, so an empty required field would
  // start out red. Errors show once the user has been in the field; the
  // Button that gates on `isValid` is disabled from the start regardless.
  const showError = touched && isInvalid(props)
  const supportingText = showError ? validationMessage(props) : undefined

  const common = {
    label: asText(props.label),
    variant: 'outlined' as const,
    value,
    placeholder: asText(props.placeholder) || undefined,
    error: showError,
    supportingText,
    className: 'm3e-a2ui-text-field',
    style: weightStyle(props.weight),
    onBlur: () => setTouched(true),
    'aria-description': asText(props.accessibility?.description) || undefined,
  }

  if (variant === 'longText') {
    return (
      <MaterialTextArea
        {...common}
        rows={3}
        onChange={(event) => {
          setTouched(true)
          setValue(event.target.value)
        }}
      />
    )
  }

  return (
    <MaterialTextField
      {...common}
      type={variant === 'obscured' ? 'password' : variant === 'number' ? 'number' : 'text'}
      inputMode={variant === 'number' ? 'decimal' : undefined}
      pattern={props.validationRegexp}
      onChange={(event) => {
        setTouched(true)
        setValue(event.target.value)
      }}
    />
  )
})
