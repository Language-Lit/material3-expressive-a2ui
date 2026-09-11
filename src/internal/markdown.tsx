import { Fragment, type ReactNode } from 'react'

/**
 * A deliberately small Markdown reader for the catalog's `Text` component.
 *
 * The A2UI basic catalog lets an agent send Markdown in `Text`. The official
 * renderer parses it with markdown-it and renders the resulting HTML. This
 * package has no runtime dependencies and never sets inner HTML, so it reads
 * the common subset directly into React nodes: headings, paragraphs, ordered
 * and unordered lists, bold, italic, inline code and links. Everything else
 * is shown as the literal text the agent sent.
 */
export type MarkdownBlock =
  | { readonly kind: 'heading'; readonly level: 1 | 2 | 3 | 4 | 5 | 6; readonly text: string }
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly string[] }

// Block markers count only at column 0. A leading space before a dash is a
// label the agent spaced on purpose, not a list.
const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/
const BULLET = /^[-*+]\s+(.*)$/
const NUMBERED = /^\d+[.)]\s+(.*)$/

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

function headingLevel(marker: string): HeadingLevel {
  const level = Math.min(Math.max(marker.length, 1), 6)
  return level as HeadingLevel
}

export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join('\n') })
      paragraph = []
    }
  }
  const flushList = () => {
    if (list) {
      blocks.push({ kind: 'list', ordered: list.ordered, items: list.items })
      list = null
    }
  }

  for (const rawLine of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trimEnd()
    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ kind: 'heading', level: headingLevel(heading[1] ?? '#'), text: heading[2] ?? '' })
      continue
    }
    const bullet = BULLET.exec(line)
    const numbered = bullet ? null : NUMBERED.exec(line)
    const item = bullet?.[1] ?? numbered?.[1]
    if (item !== undefined) {
      flushParagraph()
      const ordered = numbered !== null
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push(item)
      continue
    }
    flushList()
    paragraph.push(line)
  }
  flushParagraph()
  flushList()
  return blocks
}

/**
 * True when the text needs more than a single paragraph to render. A single
 * line is inline text unless it is a heading: an agent that sends " - Qty: "
 * as a label means those characters, not a one-item list.
 */
export function hasBlockMarkdown(source: string): boolean {
  if (!source.includes('\n') && !HEADING.test(source)) return false
  const blocks = parseMarkdownBlocks(source)
  return blocks.length > 1 || (blocks.length === 1 && blocks[0]?.kind !== 'paragraph')
}

const INLINE =
  /\*\*(.+?)\*\*|`([^`\n]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)|\*([^*\n]+?)\*|(?<![A-Za-z0-9])_([^_\n]+?)_(?![A-Za-z0-9])/g

function safeHref(url: string): string | undefined {
  return /^(https?:|mailto:|tel:)/i.test(url) ? url : undefined
}

/** Renders inline Markdown (bold, italic, code, links) within one line. */
export function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = []
  let last = 0
  let key = 0
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0
    if (index > last) nodes.push(text.slice(last, index))
    const [whole, bold, code, linkText, linkUrl, italic, underscoreItalic] = match
    if (bold !== undefined) {
      nodes.push(<strong key={key++}>{renderInline(bold)}</strong>)
    } else if (code !== undefined) {
      nodes.push(
        <code key={key++} className="m3e-a2ui-text__code">
          {code}
        </code>,
      )
    } else if (linkText !== undefined && linkUrl !== undefined) {
      const href = safeHref(linkUrl)
      nodes.push(
        href ? (
          <a key={key++} className="m3e-a2ui-text__link" href={href} target="_blank" rel="noreferrer noopener">
            {renderInline(linkText)}
          </a>
        ) : (
          whole
        ),
      )
    } else {
      const content = italic ?? underscoreItalic ?? ''
      nodes.push(<em key={key++}>{renderInline(content)}</em>)
    }
    last = index + whole.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  if (nodes.length === 0) return ''
  if (nodes.length === 1 && typeof nodes[0] === 'string') return nodes[0]
  return nodes
}

/** Renders a paragraph: inline Markdown per line, soft breaks between lines. */
export function renderParagraph(text: string): ReactNode {
  const lines = text.split('\n')
  if (lines.length === 1) return renderInline(text)
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {renderInline(line)}
    </Fragment>
  ))
}
