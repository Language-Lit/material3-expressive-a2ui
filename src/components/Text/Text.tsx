import { Text as MaterialText, type TypographyRoleName } from '@language-lit/material3-expressive'
import { TextApi } from '@a2ui/web_core/v0_9/basic_catalog'
import type { CSSProperties, ReactNode } from 'react'

import { cx } from '../../internal/classNames'
import { asText, weightStyle } from '../../internal/layout'
import {
  hasBlockMarkdown,
  parseMarkdownBlocks,
  renderInline,
  renderParagraph,
  type MarkdownAlign,
  type MarkdownBlock,
  type MarkdownList,
} from '../../internal/markdown'
import { createMaterial3Component } from '../../runtime/adapter'

type A2uiTextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'caption' | 'body'
type BlockElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'

interface TextMapping {
  readonly as: BlockElement
  readonly variant: TypographyRoleName
}

/**
 * The catalog's seven text variants on the Material type scale. Headings
 * step down the headline and title roles; `caption` is small body text in
 * the variant colour; `body` is the default reading size.
 */
const TEXT_MAPPING: Readonly<Record<A2uiTextVariant, TextMapping>> = {
  h1: { as: 'h1', variant: 'headlineLarge' },
  h2: { as: 'h2', variant: 'headlineMedium' },
  h3: { as: 'h3', variant: 'headlineSmall' },
  h4: { as: 'h4', variant: 'titleLarge' },
  h5: { as: 'h5', variant: 'titleMedium' },
  caption: { as: 'span', variant: 'bodySmall' },
  body: { as: 'p', variant: 'bodyLarge' },
}

/** Markdown headings inside a body text stay below the component's own headings. */
const MARKDOWN_HEADINGS: readonly TextMapping[] = [
  { as: 'h2', variant: 'headlineSmall' },
  { as: 'h3', variant: 'titleLarge' },
  { as: 'h4', variant: 'titleMedium' },
  { as: 'h5', variant: 'titleSmall' },
  { as: 'h6', variant: 'titleSmall' },
  { as: 'h6', variant: 'titleSmall' },
]

/** A heading variant already sets the level, so a leading `#` marker is redundant. */
const HEADING_MARKER = /^#{1,6}\s+/

function isTextVariant(value: unknown): value is A2uiTextVariant {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TEXT_MAPPING, value)
}

interface BlockTextProps {
  readonly as: BlockElement
  readonly variant: TypographyRoleName
  readonly className?: string
  readonly style?: CSSProperties
  readonly 'aria-label'?: string
  readonly children: ReactNode
}

/** The base `Text` types its element per call, so each element is spelled out once. */
function BlockText({ as, ...rest }: BlockTextProps) {
  switch (as) {
    case 'h1':
      return <MaterialText as="h1" {...rest} />
    case 'h2':
      return <MaterialText as="h2" {...rest} />
    case 'h3':
      return <MaterialText as="h3" {...rest} />
    case 'h4':
      return <MaterialText as="h4" {...rest} />
    case 'h5':
      return <MaterialText as="h5" {...rest} />
    case 'h6':
      return <MaterialText as="h6" {...rest} />
    case 'p':
      return <MaterialText as="p" {...rest} />
    default:
      return <MaterialText as="span" {...rest} />
  }
}

/** A list and, under any item that has one, its nested list (ADR 0006). */
function ListBlock({ list }: { readonly list: MarkdownList }) {
  const items = list.items.map((item, index) => (
    <li key={index}>
      <MaterialText as="span" variant="bodyLarge">
        {renderInline(item.text)}
      </MaterialText>
      {item.children ? <ListBlock list={item.children} /> : null}
    </li>
  ))
  return list.ordered ? (
    <ol className="m3e-a2ui-text__list">{items}</ol>
  ) : (
    <ul className="m3e-a2ui-text__list">{items}</ul>
  )
}

function cellClassName(align: MarkdownAlign): string | undefined {
  return align ? `m3e-a2ui-text__cell--${align}` : undefined
}

function Block({ block }: { readonly block: MarkdownBlock }) {
  if (block.kind === 'heading') {
    const mapping = MARKDOWN_HEADINGS[block.level - 1] ?? MARKDOWN_HEADINGS[5]!
    return (
      <BlockText as={mapping.as} variant={mapping.variant} className="m3e-a2ui-text__heading">
        {renderInline(block.text)}
      </BlockText>
    )
  }
  if (block.kind === 'list') {
    return <ListBlock list={block} />
  }
  if (block.kind === 'table') {
    // A pipe table is the one Markdown block with its own width. It scrolls
    // inside the text rather than widening the surface (ADR 0006).
    return (
      <div className="m3e-a2ui-text__table-scroller">
        <table className="m3e-a2ui-text__table">
          <thead>
            <tr>
              {block.header.map((cell, index) => (
                <th key={index} scope="col" className={cellClassName(block.align[index])}>
                  <MaterialText as="span" variant="labelLarge">
                    {renderInline(cell)}
                  </MaterialText>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, index) => (
                  <td key={index} className={cellClassName(block.align[index])}>
                    <MaterialText as="span" variant="bodyMedium">
                      {renderInline(cell)}
                    </MaterialText>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return (
    <MaterialText as="p" variant="bodyLarge" className="m3e-a2ui-text__paragraph">
      {renderParagraph(block.text)}
    </MaterialText>
  )
}

export const TextImplementation = createMaterial3Component(TextApi, ({ props }) => {
  const variant: A2uiTextVariant = isTextVariant(props.variant) ? props.variant : 'body'
  const mapping = TEXT_MAPPING[variant]
  const text = asText(props.text)
  const style = weightStyle(props.weight)
  const className = cx('m3e-a2ui-text', `m3e-a2ui-text--${variant}`)
  const label = asText(props.accessibility?.label) || undefined

  if (variant === 'body' && hasBlockMarkdown(text)) {
    return (
      <div className={cx(className, 'm3e-a2ui-text--rich')} style={style} aria-label={label}>
        {parseMarkdownBlocks(text).map((block, index) => (
          <Block key={index} block={block} />
        ))}
      </div>
    )
  }

  const inline = variant === 'body' ? text : text.replace(HEADING_MARKER, '')
  return (
    <BlockText as={mapping.as} variant={mapping.variant} className={className} style={style} aria-label={label}>
      {renderParagraph(inline)}
    </BlockText>
  )
})
