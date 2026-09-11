import { Text as MaterialText } from '@language-lit/material3-expressive'
import { DateTimeInputApi } from '@a2ui/web_core/v0_9/basic_catalog'
import { useState } from 'react'

import { isInvalid, validationMessage } from '../../internal/checks'
import { cx } from '../../internal/classNames'
import { asText, weightStyle } from '../../internal/layout'
import { useBoundValue } from '../../internal/useBoundValue'
import { createMaterial3Component } from '../../runtime/adapter'

type PickerType = 'date' | 'time' | 'datetime-local'

interface WallClock {
  readonly date?: string
  readonly time?: string
}

const DATE_TIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/
const ZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i
const pad = (part: number) => String(part).padStart(2, '0')

/** Whether an ISO 8601 date-time names its offset, and so denotes an instant rather than a wall-clock time. */
export function hasExplicitZone(value: string): boolean {
  return DATE_TIME.test(value) && ZONE_SUFFIX.test(value)
}

function localWallClock(value: string): WallClock {
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return {}
  return {
    date: `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`,
    time: `${pad(instant.getHours())}:${pad(instant.getMinutes())}`,
  }
}

function literalWallClock(value: string): WallClock {
  const dateTime = DATE_TIME.exec(value)
  if (dateTime) return { date: dateTime[1], time: dateTime[2] }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { date: value }
  if (/^\d{2}:\d{2}/.test(value)) return { time: value.slice(0, 5) }
  return {}
}

/**
 * Reduces an ISO 8601 value to what the native picker of `type` accepts.
 * A value with an explicit offset is an instant and is shown in the user's
 * own time zone; one without is taken as written.
 */
export function toPickerValue(value: string, type: PickerType): string {
  if (!value) return ''
  const parts = hasExplicitZone(value) ? localWallClock(value) : literalWallClock(value)
  if (type === 'date') return parts.date ?? ''
  if (type === 'time') return parts.time ?? ''
  return parts.date && parts.time ? `${parts.date}T${parts.time}` : ''
}

/**
 * Turns what the picker produced back into the data model's ISO 8601 form.
 * When the bound value was an instant, the picked local time is emitted as
 * a UTC instant, so the agent keeps the semantics it sent.
 */
export function fromPickerValue(picked: string, type: PickerType, previous: string): string {
  if (!picked || type !== 'datetime-local' || !hasExplicitZone(previous)) return picked
  const instant = new Date(picked)
  return Number.isNaN(instant.getTime()) ? picked : instant.toISOString()
}

/**
 * The base library has no date or time picker yet, so this is the one
 * component that renders a native input, dressed in the outlined text field's
 * tokens. Values stay ISO 8601 in both directions, as the catalog requires.
 */
export const DateTimeInputImplementation = createMaterial3Component(DateTimeInputApi, ({ props }) => {
  const enableDate = props.enableDate === true
  const enableTime = props.enableTime === true
  const type: PickerType =
    enableDate && !enableTime ? 'date' : enableTime && !enableDate ? 'time' : 'datetime-local'
  const [value, setValue] = useBoundValue(asText(props.value), props.setValue)
  const [touched, setTouched] = useState(false)
  const showError = touched && isInvalid(props)
  const message = showError ? validationMessage(props) : undefined
  const fallbackLabel = type === 'date' ? 'Date' : type === 'time' ? 'Time' : 'Date and time'
  const label = asText(props.label) || asText(props.accessibility?.label) || fallbackLabel

  return (
    <label
      className={cx('m3e-a2ui-datetime', showError && 'm3e-a2ui-datetime--error')}
      style={weightStyle(props.weight)}
    >
      <MaterialText as="span" variant="bodySmall" className="m3e-a2ui-datetime__label">
        {label}
      </MaterialText>
      <input
        className="m3e-a2ui-datetime__input"
        type={type}
        value={toPickerValue(value, type)}
        min={toPickerValue(asText(props.min), type) || undefined}
        max={toPickerValue(asText(props.max), type) || undefined}
        onChange={(event) => {
          setTouched(true)
          setValue(fromPickerValue(event.target.value, type, value))
        }}
        onBlur={() => setTouched(true)}
        aria-invalid={showError || undefined}
        aria-description={asText(props.accessibility?.description) || undefined}
      />
      {message ? (
        <MaterialText as="span" variant="bodySmall" className="m3e-a2ui-field-error">
          {message}
        </MaterialText>
      ) : null}
    </label>
  )
})
