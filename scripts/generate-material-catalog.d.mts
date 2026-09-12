export interface InlineFunctionDefinition {
  readonly name: string
  readonly description?: string
  readonly returnType: string
  readonly parameters: Record<string, unknown>
}

export interface InlineCatalogDefinition {
  readonly catalogId: string
  readonly components?: Record<string, unknown>
  readonly functions?: readonly InlineFunctionDefinition[]
  readonly theme?: Record<string, unknown>
}

export interface MaterialCatalogSchema {
  readonly $id: string
  readonly $schema: string
  readonly catalogId: string
  readonly title: string
  readonly description: string
  readonly components: Record<string, unknown>
  readonly functions: readonly InlineFunctionDefinition[]
  readonly theme?: Record<string, unknown>
}

export const MATERIAL_CATALOG_ID: string
export const MATERIAL_CATALOG_ROUTE: string
export function buildMaterialCatalogSchema(inlineCatalog: InlineCatalogDefinition | undefined): MaterialCatalogSchema
export function validateMaterialCatalogSchema(schema: MaterialCatalogSchema): MaterialCatalogSchema
export function serializeMaterialCatalogSchema(schema: MaterialCatalogSchema): string
