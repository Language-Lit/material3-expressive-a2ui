import { Icon as MaterialIcon, type IconSource } from '@language-lit/material3-expressive'
import { IconApi } from '@a2ui/web_core/v0_9/basic_catalog'
import type { CSSProperties } from 'react'

import { resolveIconGlyph } from '../../internal/icons'
import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

const SYMBOL_OVERRIDES: Readonly<Record<string, string>> = {
  play: 'play_arrow',
  rewind: 'fast_rewind',
  favoriteOff: 'favorite_border',
  starOff: 'star_border',
}

/** The Material Symbols ligature for a catalog icon name (`arrowBack` → `arrow_back`); symbol names pass through. */
export function toMaterialSymbol(name: string): string {
  if (/[_-]/.test(name)) return name.toLowerCase().replace(/-/g, '_')
  return SYMBOL_OVERRIDES[name] ?? name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function Glyph({
  source,
  label,
  style,
}: {
  readonly source: IconSource | string
  readonly label: string | undefined
  readonly style: CSSProperties | undefined
}) {
  if (label) {
    return typeof source === 'string' ? (
      <MaterialIcon source={source} decorative={false} label={label} className="m3e-a2ui-icon" style={style} />
    ) : (
      <MaterialIcon source={source} decorative={false} label={label} className="m3e-a2ui-icon" style={style} />
    )
  }
  return typeof source === 'string' ? (
    <MaterialIcon source={source} className="m3e-a2ui-icon" style={style} />
  ) : (
    <MaterialIcon source={source} className="m3e-a2ui-icon" style={style} />
  )
}

export const IconImplementation = createMaterial3Component(IconApi, ({ props }) => {
  const label = asText(props.accessibility?.label) || undefined
  const style = weightStyle(props.weight)
  const name: unknown = props.name

  if (typeof name === 'string') {
    // Catalog names and the Material Symbols names agents bind through data
    // ship as embedded glyphs. Anything else falls back to a ligature, which
    // renders when the host loads the Material Symbols font.
    const source = resolveIconGlyph(name) ?? toMaterialSymbol(name)
    return <Glyph source={source} label={label} style={style} />
  }

  if (name && typeof name === 'object' && 'svgPath' in name && typeof name.svgPath === 'string') {
    return (
      <svg
        className="m3e-a2ui-icon m3e-a2ui-icon--custom"
        viewBox="0 0 24 24"
        style={style}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        focusable="false"
      >
        <path d={name.svgPath} />
      </svg>
    )
  }

  if (name && typeof name === 'object' && 'path' in name && typeof name.path === 'string') {
    return <img className="m3e-a2ui-icon m3e-a2ui-icon--image" src={name.path} alt={label ?? ''} style={style} />
  }

  return null
})
