import { Card as MaterialCard } from '@language-lit/material3-expressive'
import { CardApi } from '@a2ui/web_core/v0_9/basic_catalog'

import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

/**
 * A2UI cards group content the agent chose to set apart. The implementation
 * guide recommends an outlined treatment so nested cards stay readable, and
 * the card is passive: interaction lives in the buttons it contains.
 */
export const CardImplementation = createMaterial3Component(CardApi, ({ props, buildChild }) => (
  <MaterialCard
    variant="outlined"
    as="div"
    className="m3e-a2ui-card"
    style={weightStyle(props.weight)}
    aria-label={asText(props.accessibility?.label) || undefined}
  >
    {typeof props.child === 'string' ? buildChild(props.child) : null}
  </MaterialCard>
))
