import { Button as MaterialButton, Dialog as MaterialDialog } from '@language-lit/material3-expressive'
import { ModalApi } from '@a2ui/web_core/v0_9/basic_catalog'
import { useState } from 'react'

import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

/**
 * The trigger is whatever component the agent named, usually a Button with
 * its own action. Its click bubbles to the wrapper, which opens the dialog,
 * so the action still dispatches and the modal still opens.
 */
export const ModalImplementation = createMaterial3Component(ModalApi, ({ props, buildChild }) => {
  const [open, setOpen] = useState(false)
  const label = asText(props.accessibility?.label) || 'Dialog'
  return (
    <div className="m3e-a2ui-modal" style={weightStyle(props.weight)}>
      <div className="m3e-a2ui-modal__trigger" onClick={() => setOpen(true)}>
        {typeof props.trigger === 'string' ? buildChild(props.trigger) : null}
      </div>
      <MaterialDialog
        open={open}
        onOpenChange={setOpen}
        aria-label={label}
        className="m3e-a2ui-modal__dialog"
        actions={
          <MaterialButton variant="text" onClick={() => setOpen(false)}>
            Close
          </MaterialButton>
        }
      >
        <div className="m3e-a2ui-modal__content">
          {open && typeof props.content === 'string' ? buildChild(props.content) : null}
        </div>
      </MaterialDialog>
    </div>
  )
})
