import { DynamicStringSchema } from '@a2ui/web_core/v0_9'
import { VideoApi } from '@a2ui/web_core/v0_9/basic_catalog'

import { referencedSchema } from '../../internal/catalogSchemas'
import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

/**
 * The v0.9.1 `Video` plus `posterUrl`, which the v1.0 basic catalog adds.
 * Accepting it ahead of a v1.0 runtime is forward compatibility (ADR 0004):
 * an agent that knows the newer catalog gets its poster instead of having
 * the property stripped.
 */
const VideoApiWithPoster = {
  name: VideoApi.name,
  schema: VideoApi.schema.extend({
    url: referencedSchema(VideoApi.schema.shape.url, 'DynamicString'),
    posterUrl: referencedSchema(
      DynamicStringSchema.optional().describe(
        'The URL of the poster image to display before the video plays.',
      ),
      'DynamicString',
    ),
  }),
}

export const VideoImplementation = createMaterial3Component(VideoApiWithPoster, ({ props }) => (
  <div className="m3e-a2ui-video" style={weightStyle(props.weight)}>
    <video
      className="m3e-a2ui-video__media"
      src={asText(props.url)}
      poster={asText(props.posterUrl) || undefined}
      controls
      preload="metadata"
      aria-label={asText(props.accessibility?.label) || undefined}
    />
  </div>
))
