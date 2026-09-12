import { Text as MaterialText } from '@language-lit/material3-expressive'
import { AudioPlayerApi } from '@a2ui/web_core/v0_9/basic_catalog'

import { referencedSchema } from '../../internal/catalogSchemas'
import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

const api = {
  name: AudioPlayerApi.name,
  schema: AudioPlayerApi.schema.extend({
    url: referencedSchema(AudioPlayerApi.schema.shape.url, 'DynamicString'),
    description: referencedSchema(
      AudioPlayerApi.schema.shape.description,
      'DynamicString',
    ),
  }),
}

export const AudioPlayerImplementation = createMaterial3Component(api, ({ props }) => {
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
