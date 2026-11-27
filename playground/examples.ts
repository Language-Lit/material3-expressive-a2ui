import type { AgentToRendererMessage } from '@a2ui/web_core/v1_0'

export type ExampleCatalog = 'basic' | 'material'

export interface Example {
  /** Deep-link key: the file name for a basic example, `<catalog>/<file>` for other catalogs. */
  readonly file: string
  readonly name: string
  readonly description: string
  readonly catalog: ExampleCatalog
  readonly messages: readonly AgentToRendererMessage[]
}

interface ExampleModule {
  readonly name: string
  readonly description: string
  readonly messages: AgentToRendererMessage[]
}

const basicModules = import.meta.glob<ExampleModule>('../fixtures/examples/*.json', {
  eager: true,
  import: 'default',
})

const materialModules = import.meta.glob<ExampleModule>('../fixtures/material/examples/*.json', {
  eager: true,
  import: 'default',
})

function collect(modules: Record<string, ExampleModule>, catalog: ExampleCatalog): Example[] {
  return Object.entries(modules)
    .map(([path, module]) => {
      const basename = path.split('/').pop() ?? path
      return {
        file: catalog === 'basic' ? basename : `${catalog}/${basename}`,
        name: catalog === 'basic' ? module.name : `Material · ${module.name}`,
        description: module.description,
        catalog,
        messages: module.messages,
      }
    })
    .sort((a, b) => a.file.localeCompare(b.file))
}

/**
 * The A2UI v1.0 examples from the specification: the basic catalog's in file
 * order, followed by package-authored Material extension examples.
 */
export const examples: readonly Example[] = [...collect(basicModules, 'basic'), ...collect(materialModules, 'material')]
