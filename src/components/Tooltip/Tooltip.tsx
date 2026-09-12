import { Tooltip as MaterialTooltip } from '@language-lit/material3-expressive'
import { ComponentIdSchema, DynamicStringSchema } from '@a2ui/web_core/v0_9'
import { useEffect, useMemo, useRef, useState } from 'react'

import { materialCommonSchema } from '../../internal/materialSchemas'
import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

const api = {
  name: 'Tooltip',
  schema: materialCommonSchema.extend({
    child: ComponentIdSchema.describe(
      'REF:common_types.json#/$defs/ComponentId|One child containing a native focusable control, such as IconButton.',
    ),
    text: DynamicStringSchema.describe(
      'REF:common_types.json#/$defs/DynamicString|Plain non-interactive tooltip text. Never a replacement for the control label.',
    ),
  }),
}
export const TooltipImplementation = createMaterial3Component(api, ({ props, buildChild }) => {
  const wrapper = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    setOpen(anchor !== null && anchor === anchor.ownerDocument.activeElement)
  }, [anchor])
  const anchorRef = useMemo(() => ({ current: anchor }), [anchor])
  useEffect(() => {
    const element = wrapper.current
    if (!element) return
    // BuildChild deliberately has no ref channel. Observe only our own DOM
    // to find the native control, including a child that arrives later.
    const update = () =>
      setAnchor(element.querySelector<HTMLElement>('button, input, textarea, select, a[href]'))
    update()
    const observer = new MutationObserver(update)
    observer.observe(element, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={wrapper}
      className="m3e-a2ui-tooltip"
      style={weightStyle(props.weight)}
      aria-label={asText(props.accessibility?.label) || undefined}
      aria-description={asText(props.accessibility?.description) || undefined}
    >
      {props.child ? buildChild(props.child) : null}
      {anchor ? (
        <MaterialTooltip
          open={open}
          onOpenChange={setOpen}
          anchorRef={anchorRef}
          content={asText(props.text)}
        />
      ) : null}
    </div>
  )
})
