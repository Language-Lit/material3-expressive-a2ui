/**
 * Restores a canonical protocol reference when a component-level description
 * replaced web_core's `REF:` metadata. The original schema supplies every
 * parse constraint; this helper changes metadata only.
 */
export function referencedSchema<T>(
  schema: T & { readonly description?: string; describe(description: string): T },
  definition: string,
): T {
  const description = schema.description
  const prefix = `REF:common_types.json#/$defs/${definition}`
  if (description === prefix || description?.startsWith(`${prefix}|`)) return schema
  const prose = description?.startsWith('REF:')
    ? description.split('|').slice(1).join('|')
    : description
  return schema.describe(
    `${prefix}${prose ? `|${prose}` : ''}`,
  )
}
