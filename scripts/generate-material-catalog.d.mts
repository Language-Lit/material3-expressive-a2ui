export interface InlineFunctionSchema {
  readonly type?: string
  readonly description?: string
  readonly returnType?: string
  readonly requiresUserActivation?: boolean
  readonly properties?: Record<string, unknown>
  readonly required?: readonly string[]
}

export interface InlineCatalogDefinition {
  readonly $schema?: string
  readonly $id?: string
  readonly protocolVersion?: string
  readonly title?: string
  readonly description?: string
  readonly catalogId: string
  readonly components?: Record<string, unknown>
  readonly functions?: Record<string, InlineFunctionSchema>
  readonly $defs?: Record<string, unknown>
}

export interface MaterialCatalogSchema {
  readonly $id: string
  readonly $schema: string
  readonly protocolVersion: string
  readonly catalogId: string
  readonly title: string
  readonly description: string
  readonly components: Record<string, unknown>
  readonly functions: Record<string, InlineFunctionSchema>
  readonly $defs?: Record<string, unknown>
}

export const MATERIAL_CATALOG_ID: string
export const MATERIAL_CATALOG_ROUTE: string
export function buildMaterialCatalogSchema(inlineCatalog: InlineCatalogDefinition | undefined): MaterialCatalogSchema
export function validateMaterialCatalogSchema(schema: MaterialCatalogSchema): MaterialCatalogSchema
export function serializeMaterialCatalogSchema(schema: MaterialCatalogSchema): string
