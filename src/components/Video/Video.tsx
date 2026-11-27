import { VideoApi } from '@a2ui/web_core/catalogs/basic/v1'

import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

export const VideoImplementation = createMaterial3Component(VideoApi, ({ props }) => (
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
