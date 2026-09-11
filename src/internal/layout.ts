import type { CSSProperties } from 'react'

import { cx } from './classNames'

const JUSTIFY_MODIFIERS: Readonly<Record<string, string>> = {
  center: 'center',
  end: 'end',
  spaceAround: 'space-around',
  spaceBetween: 'space-between',
  spaceEvenly: 'space-evenly',
  start: 'start',
  stretch: 'stretch',
}

const ALIGN_MODIFIERS: Readonly<Record<string, string>> = {
  start: 'start',
  center: 'center',
  end: 'end',
  stretch: 'stretch',
}

/**
 * Class list for a flex container: the block class plus one modifier each for
 * the catalog's `justify` and `align` values. Unknown values fall back to the
 * catalog defaults (`start` / `stretch`) rather than to no modifier, so a
 * container always has a defined layout.
 */
export function layoutClasses(
  block: string,
  justify: string | undefined,
  align: string | undefined,
): string {
  const justifyModifier = (justify && JUSTIFY_MODIFIERS[justify]) || 'start'
  const alignModifier = (align && ALIGN_MODIFIERS[align]) || 'stretch'
  return cx(block, `${block}--justify-${justifyModifier}`, `${block}--align-${alignModifier}`)
}

/**
 * The catalog's `weight` is a flex-grow factor for the component inside its
 * parent Row or Column. It is the one layout value that has to be inline: it
 * is a number chosen by the agent, not a design decision.
 */
export function weightStyle(weight: number | undefined): CSSProperties | undefined {
  if (weight === undefined || !Number.isFinite(weight)) return undefined
  return { flex: weight, minWidth: 0, minHeight: 0 }
}

export interface A2uiAccessibility {
  readonly label?: string
  readonly description?: string
}

/** Text resolved from a DynamicString; anything else is stringified. */
export function asText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}
