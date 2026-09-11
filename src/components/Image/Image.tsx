import { ImageApi } from '@a2ui/web_core/v0_9/basic_catalog'

import { cx } from '../../internal/classNames'
import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

const VARIANT_MODIFIERS: Readonly<Record<string, string>> = {
  icon: 'icon',
  avatar: 'avatar',
  smallFeature: 'small-feature',
  mediumFeature: 'medium-feature',
  largeFeature: 'large-feature',
  header: 'header',
}

const FIT_MODIFIERS: Readonly<Record<string, string>> = {
  contain: 'contain',
  cover: 'cover',
  fill: 'fill',
  none: 'none',
  scaleDown: 'scale-down',
}

export const ImageImplementation = createMaterial3Component(ImageApi, ({ props }) => {
  const variant = VARIANT_MODIFIERS[props.variant ?? 'mediumFeature'] ?? 'medium-feature'
  const fit = FIT_MODIFIERS[props.fit ?? 'fill'] ?? 'fill'
  const alt = asText(props.description) || asText(props.accessibility?.label)
  return (
    <img
      className={cx('m3e-a2ui-image', `m3e-a2ui-image--${variant}`, `m3e-a2ui-image--fit-${fit}`)}
      src={asText(props.url)}
      alt={alt}
      style={weightStyle(props.weight)}
    />
  )
})
