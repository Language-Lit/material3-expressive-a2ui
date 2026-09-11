import { useCallback, useState } from 'react'

/**
 * Local mirror of a two-way bound value.
 *
 * The binder only writes back to the data model when the property was a
 * `{path}` binding; a literal value has no setter target. Mirroring the value
 * locally keeps a control editable either way: a bound field round-trips
 * through the model, a literal one behaves like an uncontrolled control.
 * When the bound value changes from outside, the mirror follows it.
 */
export function useBoundValue<T>(
  bound: T,
  setBound: ((value: T) => void) | undefined,
): [T, (value: T) => void] {
  const [local, setLocal] = useState(bound)
  const [previous, setPrevious] = useState(bound)
  if (!Object.is(previous, bound)) {
    setPrevious(bound)
    setLocal(bound)
  }
  const update = useCallback(
    (value: T) => {
      setLocal(value)
      setBound?.(value)
    },
    [setBound],
  )
  return [Object.is(previous, bound) ? local : bound, update]
}
