import {
  A2uiExpressionError,
  createFunctionImplementation,
  type FunctionImplementation,
} from '@a2ui/web_core'
import {
  OpenUrlApi,
  OpenUrlImplementation as BaseOpenUrlImplementation,
} from '@a2ui/web_core/catalogs/basic/v1'

import { hasUserActivation } from '../internal/activation'

/**
 * The v1.0 basic catalog's `openUrl`, restricted to user-initiated actions
 * (ADR 0005). web_core validates the URL scheme, declares
 * `requiresUserActivation: true`, and opens with `noopener,noreferrer`; this
 * wrapper also enforces the package's synchronous action scope and live
 * browser `navigator.userActivation.isActive` check so a call evaluated
 * outside a real user gesture reports an expression error instead of opening
 * a tab.
 */
export const OpenUrlImplementation: FunctionImplementation & {
  readonly requiresUserActivation: true
} = Object.assign(
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
