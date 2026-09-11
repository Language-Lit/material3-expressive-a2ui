import { Text as MaterialText } from '@language-lit/material3-expressive'
import { AudioPlayerApi } from '@a2ui/web_core/v0_9/basic_catalog'

import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

export const AudioPlayerImplementation = createMaterial3Component(AudioPlayerApi, ({ props }) => {
  const description = asText(props.description)
  return (
    <div className="m3e-a2ui-audio" style={weightStyle(props.weight)}>
      {description ? (
        <MaterialText as="p" variant="bodyMedium" className="m3e-a2ui-audio__description">
          {description}
        </MaterialText>
      ) : null}
      <audio
        className="m3e-a2ui-audio__media"
        src={asText(props.url)}
        controls
        preload="metadata"
        aria-label={asText(props.accessibility?.label) || description || undefined}
      />
    </div>
  )
})
