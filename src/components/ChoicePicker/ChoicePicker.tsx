import {
  Checkbox as MaterialCheckbox,
  Chip as MaterialChip,
  Radio as MaterialRadio,
  Text as MaterialText,
  TextField as MaterialTextField,
} from '@language-lit/material3-expressive'
import { ChoicePickerApi } from '@a2ui/web_core/v0_9/basic_catalog'
import { useId, useState } from 'react'

import { referencedSchema } from '../../internal/catalogSchemas'
import { isInvalid, validationMessage } from '../../internal/checks'
import { cx } from '../../internal/classNames'
import { asText, weightStyle } from '../../internal/layout'
import { useBoundValue } from '../../internal/useBoundValue'
import { createMaterial3Component } from '../../runtime/adapter'

const EMPTY: string[] = []
const optionsSchema = ChoicePickerApi.schema.shape.options
const optionSchema = optionsSchema.element.extend({
  label: referencedSchema(optionsSchema.element.shape.label, 'DynamicString'),
})
const api = {
  name: ChoicePickerApi.name,
  schema: ChoicePickerApi.schema.extend({
    label: referencedSchema(ChoicePickerApi.schema.shape.label, 'DynamicString'),
    options: optionSchema.array().describe(optionsSchema.description ?? ''),
    value: referencedSchema(ChoicePickerApi.schema.shape.value, 'DynamicStringList'),
  }),
}

/**
 * Selection is a string list either way: one entry when the picker is
 * mutually exclusive, any number otherwise. `checkbox` style renders radios
 * or checkboxes with labels; `chips` style renders filter chips.
 */
export const ChoicePickerImplementation = createMaterial3Component(api, ({ props, context }) => {
  const exclusive = props.variant !== 'multipleSelection'
  const chips = props.displayStyle === 'chips'
  const bound = Array.isArray(props.value) ? (props.value as string[]) : EMPTY
  const [selected, setSelected] = useBoundValue<string[]>(bound, props.setValue)
  const [query, setQuery] = useState('')
  const [touched, setTouched] = useState(false)
  const groupId = useId()
  const radioName = `${context.dataContext.surface.id}:${context.componentModel.id}`

  const options = Array.isArray(props.options) ? props.options : []
  const needle = query.trim().toLowerCase()
  const visible = needle
    ? options.filter((option) => asText(option.label).toLowerCase().includes(needle))
    : options

  const choose = (value: string, on: boolean) => {
    setTouched(true)
    if (exclusive) {
      if (on) setSelected([value])
      return
    }
    if (on) {
      if (!selected.includes(value)) setSelected([...selected, value])
    } else {
      setSelected(selected.filter((item) => item !== value))
    }
  }

  const label = asText(props.label)
  const showError = touched && isInvalid(props)
  const message = showError ? validationMessage(props) : undefined

  return (
    <div
      className={cx('m3e-a2ui-choice-picker', chips && 'm3e-a2ui-choice-picker--chips')}
      style={weightStyle(props.weight)}
      role={exclusive && !chips ? 'radiogroup' : 'group'}
      aria-labelledby={label ? groupId : undefined}
      aria-label={label ? undefined : asText(props.accessibility?.label) || undefined}
      aria-invalid={showError || undefined}
    >
      {label ? (
        <MaterialText as="span" variant="titleSmall" id={groupId} className="m3e-a2ui-choice-picker__label">
          {label}
        </MaterialText>
      ) : null}
      {props.filterable ? (
        <MaterialTextField
          label="Filter"
          type="search"
          variant="outlined"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="m3e-a2ui-choice-picker__filter"
        />
      ) : null}
      <div className="m3e-a2ui-choice-picker__options">
        {visible.map((option) => {
          const on = selected.includes(option.value)
          const optionLabel = asText(option.label)
          if (chips) {
            return (
              <MaterialChip
                key={option.value}
                kind="filter"
                selected={on}
                onSelectedChange={(next) => choose(option.value, next)}
              >
                {optionLabel}
              </MaterialChip>
            )
          }
          return (
            <label key={option.value} className="m3e-a2ui-choice-picker__option">
              {exclusive ? (
                <MaterialRadio
                  name={radioName}
                  value={option.value}
                  checked={on}
                  onCheckedChange={(next) => choose(option.value, next)}
                />
              ) : (
                <MaterialCheckbox
                  value={option.value}
                  checked={on}
                  onCheckedChange={(next) => choose(option.value, next)}
                />
              )}
              <MaterialText as="span" variant="bodyLarge">
                {optionLabel}
              </MaterialText>
            </label>
          )
        })}
      </div>
      {message ? (
        <MaterialText as="span" variant="bodySmall" className="m3e-a2ui-field-error">
          {message}
        </MaterialText>
      ) : null}
    </div>
  )
})
