import { SegmentedButtonGroup, Text } from '@language-lit/material3-expressive'
import {
  DynamicBooleanSchema,
  DynamicStringSchema,
  DynamicStringListSchema,
} from '@a2ui/web_core/v0_9'
import { ChoicePickerApi } from '@a2ui/web_core/v0_9/basic_catalog'
import { useId, useState } from 'react'

import { materialControlSchema } from '../../internal/materialSchemas'
import { isInvalid, validationMessage } from '../../internal/checks'
import { asText, weightStyle } from '../../internal/layout'
import { useBoundValue } from '../../internal/useBoundValue'
import { createMaterial3Component } from '../../runtime/adapter'

const EMPTY: string[] = []
const api = {
  name: 'SegmentedButtons',
  schema: materialControlSchema.extend({
    label: DynamicStringSchema.describe(
      'REF:common_types.json#/$defs/DynamicString|Visible label for the group.',
    ),
    options: ChoicePickerApi.schema.shape.options,
    value: DynamicStringListSchema.describe(
      'REF:common_types.json#/$defs/DynamicStringList|Selected values; single selection uses zero or one entry.',
    ),
    multiple: DynamicBooleanSchema.optional().describe(
      'REF:common_types.json#/$defs/DynamicBoolean|Allow multiple selections instead of one.',
    ),
  }),
}
export const SegmentedButtonsImplementation = createMaterial3Component(api, ({ props }) => {
  const [value, setValue] = useBoundValue(props.value ?? EMPTY, props.setValue)
  const [touched, setTouched] = useState(false)
  const labelId = useId()
  const errorId = useId()
  const error = touched && isInvalid(props)
  const message = error ? validationMessage(props) : undefined
  const common = {
    segments: (props.options ?? []).map((option) => ({
      value: option.value,
      label: asText(option.label),
    })),
    disabled: props.disabled === true,
    'aria-labelledby': props.accessibility?.label ? undefined : labelId,
    'aria-label': asText(props.accessibility?.label) || undefined,
    'aria-description': asText(props.accessibility?.description) || undefined,
    'aria-invalid': error || undefined,
    'aria-describedby': message ? errorId : undefined,
    onBlur: () => setTouched(true),
  }
  return (
    <div className="m3e-a2ui-segmented-buttons" style={weightStyle(props.weight)}>
      <Text as="span" variant="titleSmall" id={labelId}>
        {asText(props.label)}
      </Text>
      {props.multiple === true ? (
        <SegmentedButtonGroup
          {...common}
          multiple
          value={value}
          onValueChange={(next) => {
            setTouched(true)
            setValue([...next])
          }}
        />
      ) : (
        <SegmentedButtonGroup
          {...common}
          value={value[0] ?? ''}
          onValueChange={(next) => {
            setTouched(true)
            setValue([next])
          }}
        />
      )}
      {message ? (
        <Text as="span" variant="bodySmall" id={errorId} className="m3e-a2ui-field-error">
          {message}
        </Text>
      ) : null}
    </div>
  )
})
