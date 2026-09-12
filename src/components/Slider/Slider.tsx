import { Slider as MaterialSlider, Text as MaterialText } from '@language-lit/material3-expressive'
import { DynamicNumberSchema } from '@a2ui/web_core/v0_9'
import { SliderApi } from '@a2ui/web_core/v0_9/basic_catalog'
import { useState } from 'react'

import { isInvalid, validationMessage } from '../../internal/checks'
import { asText, weightStyle } from '../../internal/layout'
import { useBoundValue } from '../../internal/useBoundValue'
import { createMaterial3Component } from '../../runtime/adapter'

/**
 * The v0.9.1 `Slider` plus `steps`, which the v1.0 basic catalog adds: the
 * number of discrete divisions in the range, with the value snapping to
 * them. Accepted ahead of a v1.0 runtime as forward compatibility (ADR 0004).
 */
const SliderApiWithSteps = {
  name: SliderApi.name,
  schema: SliderApi.schema.extend({
    steps: DynamicNumberSchema.optional().describe(
      'The number of discrete divisions in the slider range. If specified, the slider will snap to discrete values.',
    ),
  }),
}

/**
 * Without `steps` the range decides the precision: a range of at most 1
 * moves in hundredths, at most 10 in tenths, anything wider in whole
 * numbers. A 0–1 progress slider and a 0–100 volume slider both feel right.
 */
export function sliderPrecision(range: number): number {
  if (range <= 1) return 2
  if (range <= 10) return 1
  return 0
}

/**
 * With `steps` the division decides the precision: the fewest decimals that
 * represent the step exactly, capped at four so a third of a range shows as
 * `0.3333` rather than a float's full expansion.
 */
export function stepPrecision(step: number): number {
  for (let decimals = 0; decimals < 4; decimals += 1) {
    const scaled = step * 10 ** decimals
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9) return decimals
  }
  return 4
}

export const SliderImplementation = createMaterial3Component(SliderApiWithSteps, ({ props }) => {
  const min = typeof props.min === 'number' ? props.min : 0
  const max = typeof props.max === 'number' && props.max > min ? props.max : min + 100
  const steps =
    typeof props.steps === 'number' && Number.isInteger(props.steps) && props.steps >= 1 ? props.steps : undefined
  const step = steps === undefined ? undefined : (max - min) / steps
  const decimals = step === undefined ? sliderPrecision(max - min) : stepPrecision(step)
  const bound = typeof props.value === 'number' ? props.value : min
  const [value, setValue] = useBoundValue(bound, props.setValue)
  const [touched, setTouched] = useState(false)
  const label = asText(props.label) || asText(props.accessibility?.label)
  const showError = touched && isInvalid(props)
  const message = showError ? validationMessage(props) : undefined
  const settle = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next))
    const snapped = step === undefined ? clamped : min + Math.round((clamped - min) / step) * step
    return Number(snapped.toFixed(decimals))
  }
  const current = settle(value)

  return (
    <div className="m3e-a2ui-slider" style={weightStyle(props.weight)}>
      <div className="m3e-a2ui-slider__header">
        {label ? (
          <MaterialText as="span" variant="bodyMedium" className="m3e-a2ui-slider__label">
            {label}
          </MaterialText>
        ) : null}
        <MaterialText as="span" variant="labelLarge" className="m3e-a2ui-slider__value">
          {String(current)}
        </MaterialText>
      </div>
      <MaterialSlider
        min={min}
        max={max}
        // The design system counts the discrete values strictly between the
        // endpoints; the catalog counts the divisions. One division has no
        // interior value, which the design system treats as continuous, so
        // the snap above keeps that case on the two endpoints.
        steps={steps === undefined ? undefined : steps - 1}
        value={current}
        onValueChange={(next) => {
          setTouched(true)
          setValue(settle(next))
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
