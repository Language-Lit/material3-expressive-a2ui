/** The validation state the binder injects when a component declares `checks`. */
export interface CheckableState {
  readonly isValid?: boolean
  readonly validationErrors?: readonly string[]
}

export function isInvalid(state: CheckableState): boolean {
  return state.isValid === false
}

/** The messages of failed checks, joined for a supporting-text slot. */
export function validationMessage(state: CheckableState): string | undefined {
  if (state.isValid !== false) return undefined
  const errors = state.validationErrors?.filter((error) => error.trim() !== '') ?? []
  return errors.length > 0 ? errors.join(' ') : undefined
}
