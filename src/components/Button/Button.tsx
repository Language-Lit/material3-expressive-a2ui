import { Button as MaterialButton, type ButtonVariant } from '@language-lit/material3-expressive'
import { ButtonApi } from '@a2ui/web_core/v0_9/basic_catalog'

import { isInvalid } from '../../internal/checks'
import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

/**
 * `primary` is the one filled button in a surface; `default` is tonal so it
 * reads as secondary next to it; `borderless` is a text button.
 */
const BUTTON_VARIANTS: Readonly<Record<string, ButtonVariant>> = {
  primary: 'filled',
  default: 'tonal',
  borderless: 'text',
}

export const ButtonImplementation = createMaterial3Component(ButtonApi, ({ props, buildChild }) => {
  const variant = BUTTON_VARIANTS[props.variant ?? 'default'] ?? 'tonal'
  const action = typeof props.action === 'function' ? props.action : undefined
  return (
    <MaterialButton
      variant={variant}
      className="m3e-a2ui-button"
      style={weightStyle(props.weight)}
      disabled={isInvalid(props)}
      onClick={action ? () => action() : undefined}
      aria-label={asText(props.accessibility?.label) || undefined}
      aria-description={asText(props.accessibility?.description) || undefined}
    >
      {typeof props.child === 'string' ? buildChild(props.child) : null}
    </MaterialButton>
  )
})
