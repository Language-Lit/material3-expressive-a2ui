import { Slider as MaterialSlider, Text as MaterialText } from '@language-lit/material3-expressive'
import { SliderApi } from '@a2ui/web_core/v0_9/basic_catalog'
import { useState } from 'react'

import { isInvalid, validationMessage } from '../../internal/checks'
import { asText, weightStyle } from '../../internal/layout'
import { useBoundValue } from '../../internal/useBoundValue'
import { createMaterial3Component } from '../../runtime/adapter'

/**
 * The catalog has no `step`, so the range decides the precision: a range of
 * at most 1 moves in hundredths, at most 10 in tenths, anything wider in whole
 * numbers. A 0–1 progress slider and a 0–100 volume slider both feel right.
 */
export function sliderPrecision(range: number): number {
  if (range <= 1) return 2
  if (range <= 10) return 1
  return 0
}

export const SliderImplementation = createMaterial3Component(SliderApi, ({ props }) => {
  const min = typeof props.min === 'number' ? props.min : 0
  const max = typeof props.max === 'number' && props.max > min ? props.max : min + 100
  const decimals = sliderPrecision(max - min)
  const bound = typeof props.value === 'number' ? props.value : min
  const [value, setValue] = useBoundValue(bound, props.setValue)
  const [touched, setTouched] = useState(false)
  const label = asText(props.label) || asText(props.accessibility?.label)
  const showError = touched && isInvalid(props)
  const message = showError ? validationMessage(props) : undefined
  const clamped = Number(Math.min(max, Math.max(min, value)).toFixed(decimals))

  return (
    <div className="m3e-a2ui-slider" style={weightStyle(props.weight)}>
      <div className="m3e-a2ui-slider__header">
        {label ? (
          <MaterialText as="span" variant="bodyMedium" className="m3e-a2ui-slider__label">
            {label}
          </MaterialText>
        ) : null}
        <MaterialText as="span" variant="labelLarge" className="m3e-a2ui-slider__value">
          {String(clamped)}
        </MaterialText>
      </div>
      <MaterialSlider
        min={min}
        max={max}
        value={clamped}
        onValueChange={(next) => {
          setTouched(true)
          setValue(Number(next.toFixed(decimals)))
        }}
        aria-label={label || 'Slider'}
        aria-invalid={showError || undefined}
      />
      {message ? (
        <MaterialText as="span" variant="bodySmall" className="m3e-a2ui-field-error">
          {message}
        </MaterialText>
      ) : null}
    </div>
  )
})
