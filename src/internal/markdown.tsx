import { Fragment, type ReactNode } from 'react'

/**
 * A deliberately small Markdown reader for the catalog's `Text` component.
 *
 * The A2UI basic catalog lets an agent send Markdown in `Text`. The official
 * renderer parses it with markdown-it and renders the resulting HTML. This
 * package has no runtime dependencies and never sets inner HTML, so it reads
 * the common subset directly into React nodes: headings, paragraphs, ordered
 * and unordered lists with nesting, pipe tables, bold, italic, inline code
 * and links (ADR 0003, ADR 0006). Everything else is shown as the literal
 * text the agent sent.
 */
export interface MarkdownListItem {
  readonly text: string
  /** A list indented under this item. */
  readonly children?: MarkdownList
}

export interface MarkdownList {
  readonly ordered: boolean
  readonly items: readonly MarkdownListItem[]
}

/** A column's alignment from the delimiter row's colons; `undefined` is the platform default. */
export type MarkdownAlign = 'left' | 'center' | 'right' | undefined

export type MarkdownBlock =
  | { readonly kind: 'heading'; readonly level: 1 | 2 | 3 | 4 | 5 | 6; readonly text: string }
  | { readonly kind: 'paragraph'; readonly text: string }
  | ({ readonly kind: 'list' } & MarkdownList)
  | {
      readonly kind: 'table'
      readonly align: readonly MarkdownAlign[]
      readonly header: readonly string[]
      readonly rows: readonly (readonly string[])[]
    }

// Block markers count only at column 0. A leading space before a dash is a
// label the agent spaced on purpose, not a list — unless a list is already
// open, where an indented marker nests under the item above it.
const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/
const ITEM = /^([ \t]*)(?:[-*+]|\d+[.)])[ \t]+(.*)$/
const NUMBERED_MARKER = /^[ \t]*\d+[.)]/
const TABLE_DELIMITER = /^\s*\|?(?:\s*:?-+:?\s*\|)*\s*:?-+:?\s*\|?\s*$/

/** Two spaces (or a tab) of indent open one more level of list. */
const INDENT_PER_LEVEL = 2

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

function headingLevel(marker: string): HeadingLevel {
  const level = Math.min(Math.max(marker.length, 1), 6)
  return level as HeadingLevel
}

function indentWidth(whitespace: string): number {
  let width = 0
  for (const char of whitespace) width += char === '\t' ? INDENT_PER_LEVEL : 1
  return width
}

interface OpenItem {
  readonly text: string
  children?: OpenList
}

interface OpenList {
  readonly ordered: boolean
  readonly indent: number
  readonly items: OpenItem[]
}

function closeList(list: OpenList): MarkdownList {
  return {
    ordered: list.ordered,
    items: list.items.map((item) =>
      item.children ? { text: item.text, children: closeList(item.children) } : { text: item.text },
    ),
  }
}

/** Splits a pipe row into trimmed cells, honouring `\|` and optional outer pipes. */
function splitTableRow(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '\\' && line[index + 1] === '|') {
      cell += '|'
      index += 1
    } else if (char === '|') {
      cells.push(cell)
      cell = ''
    } else {
      cell += char
    }
  }
  cells.push(cell)
  const trimmed = cells.map((value) => value.trim())
  if (trimmed.length > 1 && line.trimStart().startsWith('|')) trimmed.shift()
  if (trimmed.length > 1 && line.trimEnd().endsWith('|') && !line.trimEnd().endsWith('\\|')) trimmed.pop()
  return trimmed
}

function columnAlign(delimiter: string): MarkdownAlign {
  const left = delimiter.startsWith(':')
  const right = delimiter.endsWith(':')
  if (left && right) return 'center'
  if (right) return 'right'
  if (left) return 'left'
  return undefined
}

export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  let paragraph: string[] = []
  // The open lists, outermost first; the last one receives the next item.
  let lists: OpenList[] = []

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join('\n') })
      paragraph = []
    }
  }
  const flushLists = () => {
    const root = lists[0]
    if (root) blocks.push({ kind: 'list', ...closeList(root) })
    lists = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = (lines[index] ?? '').trimEnd()
    if (line.trim() === '') {
      flushParagraph()
      flushLists()
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      flushParagraph()
      flushLists()
      blocks.push({ kind: 'heading', level: headingLevel(heading[1] ?? '#'), text: heading[2] ?? '' })
      continue
    }
    const item = ITEM.exec(line)
    if (item) {
      const indent = indentWidth(item[1] ?? '')
      const text = item[2] ?? ''
      const ordered = NUMBERED_MARKER.test(line)
      if (lists.length === 0) {
        if (indent === 0) {
          flushParagraph()
          lists = [{ ordered, indent: 0, items: [{ text }] }]
          continue
        }
        // An indented marker with no list open is text the agent spaced.
      } else {
        while (lists.length > 1 && indent < (lists[lists.length - 1]?.indent ?? 0)) lists.pop()
        const current = lists[lists.length - 1]!
        const parent = current.items[current.items.length - 1]
        if (indent >= current.indent + INDENT_PER_LEVEL && parent) {
          const nested: OpenList = { ordered, indent, items: [{ text }] }
          parent.children = nested
          lists.push(nested)
        } else if (lists.length === 1 && ordered !== current.ordered) {
          flushLists()
          lists = [{ ordered, indent: 0, items: [{ text }] }]
        } else {
          current.items.push({ text })
        }
        continue
      }
    }
    const next = lines[index + 1]
    if (line.includes('|') && next !== undefined && TABLE_DELIMITER.test(next) && next.includes('|')) {
      const header = splitTableRow(line)
      const delimiters = splitTableRow(next)
      if (header.length === delimiters.length) {
        flushParagraph()
        flushLists()
        const rows: string[][] = []
        let cursor = index + 2
        while (cursor < lines.length) {
          const row = (lines[cursor] ?? '').trimEnd()
          if (row.trim() === '' || !row.includes('|')) break
          const cells = splitTableRow(row).slice(0, header.length)
          while (cells.length < header.length) cells.push('')
          rows.push(cells)
          cursor += 1
        }
        blocks.push({ kind: 'table', align: delimiters.map(columnAlign), header, rows })
        index = cursor - 1
        continue
      }
    }
    flushLists()
    paragraph.push(line)
  }
  flushParagraph()
  flushLists()
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
