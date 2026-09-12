import { describe, expect, it } from 'vitest'

import { hasBlockMarkdown, parseMarkdownBlocks } from '../../src/internal/markdown'

describe('parseMarkdownBlocks', () => {
  it('nests an indented list under the item above it', () => {
    const blocks = parseMarkdownBlocks('- Fruit\n  - Apple\n  - Pear\n- Bread\n  1. Rye\n  2. Wheat\n- Milk')
    expect(blocks).toEqual([
      {
        kind: 'list',
        ordered: false,
        items: [
          { text: 'Fruit', children: { ordered: false, items: [{ text: 'Apple' }, { text: 'Pear' }] } },
          { text: 'Bread', children: { ordered: true, items: [{ text: 'Rye' }, { text: 'Wheat' }] } },
          { text: 'Milk' },
        ],
      },
    ])
  })

  it('nests more than one level and returns to an outer level by indent', () => {
    const blocks = parseMarkdownBlocks('- a\n  - b\n    - c\n  - d\n- e')
    expect(blocks).toEqual([
      {
        kind: 'list',
        ordered: false,
        items: [
          {
            text: 'a',
            children: {
              ordered: false,
              items: [{ text: 'b', children: { ordered: false, items: [{ text: 'c' }] } }, { text: 'd' }],
            },
          },
          { text: 'e' },
        ],
      },
    ])
  })

  it('keeps an indented marker as text when no list is open', () => {
    expect(parseMarkdownBlocks('Totals\n - Qty: 3')).toEqual([{ kind: 'paragraph', text: 'Totals\n - Qty: 3' }])
    expect(hasBlockMarkdown(' - Qty: 3')).toBe(false)
  })

  it('reads a pipe table with alignment, escaped pipes and short rows', () => {
    const blocks = parseMarkdownBlocks(
      ['| Item | Qty | Price |', '| :--- | :-: | ---: |', '| Tea \\| loose | 2 | 4.50 |', 'Sugar | 1', ''].join('\n'),
    )
    expect(blocks).toEqual([
      {
        kind: 'table',
        align: ['left', 'center', 'right'],
        header: ['Item', 'Qty', 'Price'],
        rows: [
          ['Tea | loose', '2', '4.50'],
          ['Sugar', '1', ''],
        ],
      },
    ])
    expect(hasBlockMarkdown('| a | b |\n| - | - |')).toBe(true)
  })

  it('ends a table at a line without a pipe and needs a matching delimiter row', () => {
    expect(parseMarkdownBlocks('| a | b |\n| --- | --- |\n| 1 | 2 |\nAfter the table')).toEqual([
      { kind: 'table', align: [undefined, undefined], header: ['a', 'b'], rows: [['1', '2']] },
      { kind: 'paragraph', text: 'After the table' },
    ])
    expect(parseMarkdownBlocks('| a | b |\n| --- |\n| 1 | 2 |')).toEqual([
      { kind: 'paragraph', text: '| a | b |\n| --- |\n| 1 | 2 |' },
    ])
    expect(parseMarkdownBlocks('a | b\n---')).toEqual([{ kind: 'paragraph', text: 'a | b\n---' }])
  })
})
