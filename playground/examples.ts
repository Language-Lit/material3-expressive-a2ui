import type { A2uiMessage } from '@a2ui/web_core/v0_9'

export type ExampleCatalog = 'basic' | 'minimal'

export interface Example {
  /** Deep-link key: the file name for a basic example, `minimal/<file>` for a minimal one. */
  readonly file: string
  readonly name: string
  readonly description: string
  readonly catalog: ExampleCatalog
  readonly messages: readonly A2uiMessage[]
}

interface ExampleModule {
  readonly name: string
  readonly description: string
  readonly messages: A2uiMessage[]
}

const basicModules = import.meta.glob<ExampleModule>('../fixtures/examples/*.json', {
  eager: true,
  import: 'default',
})
const minimalModules = import.meta.glob<ExampleModule>('../fixtures/minimal/examples/*.json', {
  eager: true,
  import: 'default',
})

function collect(modules: Record<string, ExampleModule>, catalog: ExampleCatalog): Example[] {
  return Object.entries(modules)
    .map(([path, module]) => {
      const basename = path.split('/').pop() ?? path
      return {
        file: catalog === 'basic' ? basename : `${catalog}/${basename}`,
        name: catalog === 'basic' ? module.name : `Minimal · ${module.name}`,
        description: module.description,
        catalog,
        messages: module.messages,
      }
    })
    .sort((a, b) => a.file.localeCompare(b.file))
}

/**
 * The v0.9.1 examples from the A2UI specification: the basic catalog's in
 * file order, then the minimal catalog's.
 */
export const examples: readonly Example[] = [...collect(basicModules, 'basic'), ...collect(minimalModules, 'minimal')]
