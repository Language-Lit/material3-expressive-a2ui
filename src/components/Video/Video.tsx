import { VideoApi } from '@a2ui/web_core/v0_9/basic_catalog'

import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

export const VideoImplementation = createMaterial3Component(VideoApi, ({ props }) => (
  <div className="m3e-a2ui-video" style={weightStyle(props.weight)}>
    <video
      className="m3e-a2ui-video__media"
      src={asText(props.url)}
      controls
      preload="metadata"
      aria-label={asText(props.accessibility?.label) || undefined}
    />
  </div>
))
