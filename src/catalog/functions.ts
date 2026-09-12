import { createFunctionImplementation, type FunctionImplementation } from '@a2ui/web_core/v0_9'
import { EmailApi } from '@a2ui/web_core/v0_9/basic_catalog'

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
