import { A2uiExpressionError, createFunctionImplementation, type FunctionImplementation } from '@a2ui/web_core/v0_9'
import {
  EmailApi,
  OpenUrlApi,
  OpenUrlImplementation as BaseOpenUrlImplementation,
} from '@a2ui/web_core/v0_9/basic_catalog'

import { hasUserActivation } from '../internal/activation'

/**
 * The minimal catalog's one function. The specification describes it as
 * "converts an input string to a capitalized version" and ships no reference
 * implementation, so this follows the `capitalize` of Python and Lodash,
 * which an agent written against the Python SDK will expect: the first
 * character upper-cased, the rest lower-cased.
 *
 * The argument is optional because the specification's own example binds it
 * to a path the agent never seeds: an empty field capitalizes to an empty
 * string rather than reporting an expression error on every keystroke.
 *
 * `zod` stays behind web_core, so the argument schema is composed from the
 * basic catalog's `email` argument — a string with the same coercion — made
 * optional, rather than written from scratch.
 */
export const CapitalizeImplementation: FunctionImplementation = createFunctionImplementation(
  {
    name: 'capitalize',
    returnType: 'string',
    schema: EmailApi.schema.extend({
      value: EmailApi.schema.shape.value.optional().describe('The text to capitalize.'),
    }),
  },
  ({ value }) => {
    if (typeof value !== 'string' || value === '') return ''
    const [first = '', ...rest] = value
    return first.toUpperCase() + rest.join('').toLowerCase()
  },
)

/**
 * The basic catalog's `openUrl`, restricted to user-initiated actions
 * (ADR 0005). web_core's implementation already allows only `http` and
 * `https` and opens with `noopener,noreferrer`; this one refuses to run
 * outside the scope of an action a component dispatched from a user
 * gesture, so a call placed in a `Text` expression or re-evaluated by a
 * data-model update reports an expression error instead of opening a tab.
 *
 * `requiresUserActivation` is the marker the specification's proposal gives
 * such functions; web_core does not read it yet, but a host inspecting the
 * function list can.
 */
export const OpenUrlImplementation: FunctionImplementation & { readonly requiresUserActivation: true } =
  Object.assign(
    createFunctionImplementation(OpenUrlApi, (args, context, abortSignal) => {
      if (!hasUserActivation()) {
        throw new A2uiExpressionError(
          'openUrl runs only from a user-initiated action, such as a Button click. ' +
            'It was evaluated while rendering, in an expression, or outside a user gesture.',
          'openUrl',
        )
      }
      BaseOpenUrlImplementation.execute(args, context, abortSignal)
    }),
    { requiresUserActivation: true as const },
  )
