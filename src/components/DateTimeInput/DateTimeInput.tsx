import * as Material3 from '@language-lit/material3-expressive'
import { DateTimeInputApi } from '@a2ui/web_core/v0_9/basic_catalog'
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type FocusEventHandler,
  type ReactNode,
} from 'react'

import { referencedSchema } from '../../internal/catalogSchemas'
import { isInvalid, validationMessage } from '../../internal/checks'
import { cx } from '../../internal/classNames'
import { asText, weightStyle } from '../../internal/layout'
import { useBoundValue } from '../../internal/useBoundValue'
import { createMaterial3Component } from '../../runtime/adapter'

const api = {
  name: DateTimeInputApi.name,
  schema: DateTimeInputApi.schema.extend({
    value: referencedSchema(DateTimeInputApi.schema.shape.value, 'DynamicString'),
    min: referencedSchema(DateTimeInputApi.schema.shape.min, 'DynamicString'),
    max: referencedSchema(DateTimeInputApi.schema.shape.max, 'DynamicString'),
    label: referencedSchema(DateTimeInputApi.schema.shape.label, 'DynamicString'),
  }),
}

type PickerType = 'date' | 'time' | 'datetime-local'

interface PickerCapabilityProps {
  readonly label: ReactNode
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly min?: string
  readonly max?: string
  readonly presentation?: 'modal'
  readonly error?: boolean
  readonly supportingText?: ReactNode
  readonly style?: CSSProperties
  readonly onBlur?: FocusEventHandler<HTMLInputElement>
  readonly 'aria-description'?: string
}

type PickerCapability = ComponentType<PickerCapabilityProps>

/**
 * Picker exports arrived after the current Material peer floor. A namespace
 * capability check keeps the 1.2 fallback loadable without asking the ESM
 * linker for names that release does not export.
 */
const materialPickerCapabilities = Material3 as typeof Material3 & {
  readonly DatePicker?: PickerCapability
  readonly TimePicker?: PickerCapability
  readonly DateTimePicker?: PickerCapability
}

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
 * Reduces an ISO 8601 value to the civil shape the picker of `type` accepts.
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

function pickerFor(type: PickerType): PickerCapability | undefined {
  if (type === 'date') return materialPickerCapabilities.DatePicker
  if (type === 'time') return materialPickerCapabilities.TimePicker
  return materialPickerCapabilities.DateTimePicker
}

/**
 * Uses the peer's Material picker when that optional capability exists. The
 * native input remains as a compatibility fallback for the declared 1.2 peer
 * floor, which predates the picker exports.
 */
export const DateTimeInputImplementation = createMaterial3Component(api, ({ props }) => {
  const enableDate = props.enableDate === true
  const enableTime = props.enableTime === true
  const type: PickerType =
    enableDate && !enableTime ? 'date' : enableTime && !enableDate ? 'time' : 'datetime-local'
  const boundValue = asText(props.value)
  const [value, setValue] = useBoundValue(boundValue, props.setValue)
  const representationValue = useRef(boundValue)
  const observedBoundValue = useRef(boundValue)
  const lastLocalWrite = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (boundValue === observedBoundValue.current) return
    const isLocalEcho = boundValue === lastLocalWrite.current
    observedBoundValue.current = boundValue
    lastLocalWrite.current = undefined
    if (!isLocalEcho) representationValue.current = boundValue
  }, [boundValue])
  const [touched, setTouched] = useState(false)
  const showError = touched && isInvalid(props)
  const message = showError ? validationMessage(props) : undefined
  const fallbackLabel = type === 'date' ? 'Date' : type === 'time' ? 'Time' : 'Date and time'
  const label = asText(props.label) || asText(props.accessibility?.label) || fallbackLabel
  const description = asText(props.accessibility?.description) || undefined
  const MaterialPicker = pickerFor(type)
  const writePickerValue = (picked: string) => {
    setTouched(true)
    const next = fromPickerValue(picked, type, representationValue.current)
    lastLocalWrite.current = next
    setValue(next)
  }

  if (MaterialPicker) {
    return (
      <MaterialPicker
        label={label}
        value={toPickerValue(value, type)}
        onValueChange={writePickerValue}
        min={toPickerValue(asText(props.min), type) || undefined}
        max={toPickerValue(asText(props.max), type) || undefined}
        presentation="modal"
        error={showError}
        supportingText={message}
        style={weightStyle(props.weight)}
        onBlur={() => setTouched(true)}
        aria-description={description}
      />
    )
  }

  return (
    <label
      className={cx('m3e-a2ui-datetime', showError && 'm3e-a2ui-datetime--error')}
      style={weightStyle(props.weight)}
    >
      <Material3.Text as="span" variant="bodySmall" className="m3e-a2ui-datetime__label">
        {label}
      </Material3.Text>
      <input
        className="m3e-a2ui-datetime__input"
        type={type}
        value={toPickerValue(value, type)}
        min={toPickerValue(asText(props.min), type) || undefined}
        max={toPickerValue(asText(props.max), type) || undefined}
        onChange={(event) => writePickerValue(event.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={showError || undefined}
        aria-description={description}
      />
      {message ? (
        <Material3.Text as="span" variant="bodySmall" className="m3e-a2ui-field-error">
          {message}
        </Material3.Text>
      ) : null}
    </label>
  )
})
