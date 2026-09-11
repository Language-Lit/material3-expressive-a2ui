import type { A2uiMessage } from '@a2ui/web_core/v0_9'

export interface Example {
  readonly file: string
  readonly name: string
  readonly description: string
  readonly messages: readonly A2uiMessage[]
}

const modules = import.meta.glob<{ name: string; description: string; messages: A2uiMessage[] }>(
  '../fixtures/examples/*.json',
  { eager: true, import: 'default' },
)

/** The v0.9.1 basic-catalog examples from the A2UI specification, in file order. */
export const examples: readonly Example[] = Object.entries(modules)
  .map(([path, module]) => ({
    file: path.split('/').pop() ?? path,
    name: module.name,
    description: module.description,
    messages: module.messages,
  }))
  .sort((a, b) => a.file.localeCompare(b.file))
