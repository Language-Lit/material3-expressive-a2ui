/**
 * The user-activation scope (ADR 0005).
 *
 * A2UI's `openUrl` opens a tab. The specification's draft proposal on
 * user-initiated functions restricts such functions to the execution scope
 * of an action a component dispatched from a user gesture, so an agent
 * cannot open a tab by putting the call in a `Text` expression, in a bound
 * property, or in a value that a data-model update re-evaluates.
 *
 * The adapter enters this scope around every action closure it hands to a
 * render function, and leaves it when the closure returns. web_core resolves
 * a `functionCall` action synchronously inside that closure, so a guarded
 * function sees the scope exactly when a component's action is running, and
 * never during rendering, expression evaluation, or reactive updates.
 */
let depth = 0

/** Runs `run` inside the user-activation scope. */
export function runUserActivation<T>(run: () => T): T {
  depth += 1
  try {
    return run()
  } finally {
    depth -= 1
  }
}

interface UserActivationLike {
  readonly isActive: boolean
}

/**
 * True while a component action is running and, where the browser reports
 * user activation, while that activation is live. A scope entered from a
 * programmatic click on a page with no recent gesture is not activation.
 */
export function hasUserActivation(): boolean {
  if (depth === 0) return false
  const activation =
    typeof navigator === 'undefined'
      ? undefined
      : (navigator as Navigator & { userActivation?: UserActivationLike }).userActivation
  return activation === undefined || activation.isActive
}
