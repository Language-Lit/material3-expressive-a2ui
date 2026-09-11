import { Tabs as MaterialTabs, type TabItem } from '@language-lit/material3-expressive'
import { TabsApi } from '@a2ui/web_core/v0_9/basic_catalog'

import { asText, weightStyle } from '../../internal/layout'
import { createMaterial3Component } from '../../runtime/adapter'

export const TabsImplementation = createMaterial3Component(TabsApi, ({ props, buildChild }) => {
  const tabs = Array.isArray(props.tabs) ? props.tabs : []
  const items: TabItem[] = tabs.map((tab, index) => ({
    value: String(index),
    label: asText(tab.title),
    panel: typeof tab.child === 'string' ? buildChild(tab.child) : null,
  }))
  if (items.length === 0) return null
  return (
    <MaterialTabs
      items={items}
      aria-label={asText(props.accessibility?.label) || 'Tabs'}
      className="m3e-a2ui-tabs"
      style={weightStyle(props.weight)}
    />
  )
})
