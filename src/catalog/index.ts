import { Catalog, type FunctionImplementation } from '@a2ui/web_core/v0_9'
import { BASIC_FUNCTIONS, createBasicCatalogFunctions } from '@a2ui/web_core/v0_9/basic_catalog'

import {
  AudioPlayerImplementation,
  ButtonImplementation,
  CardImplementation,
  CheckBoxImplementation,
  ChoicePickerImplementation,
  ColumnImplementation,
  DateTimeInputImplementation,
  DividerImplementation,
  IconImplementation,
  ImageImplementation,
  ListImplementation,
  ModalImplementation,
  RowImplementation,
  SliderImplementation,
  TabsImplementation,
  TextImplementation,
  TextFieldImplementation,
  VideoImplementation,
} from '../components'
import type { Material3ComponentImplementation } from '../runtime/adapter'
import { CapitalizeImplementation } from './functions'

/** The id of the A2UI basic catalog, as agents name it in `createSurface`. */
export const BASIC_CATALOG_ID = 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json'

/**
 * The id of the A2UI minimal catalog: five of the basic components and one
 * function, for agents on small models that cannot carry the basic catalog's
 * schema in their prompt.
 */
export const MINIMAL_CATALOG_ID = 'https://a2ui.org/specification/v0_9/catalogs/minimal/catalog.json'

/** Every basic-catalog component, implemented with Material 3 Expressive. */
export const material3Components: readonly Material3ComponentImplementation[] = [
  TextImplementation,
  ImageImplementation,
  IconImplementation,
  VideoImplementation,
  AudioPlayerImplementation,
  RowImplementation,
  ColumnImplementation,
  ListImplementation,
  CardImplementation,
  TabsImplementation,
  ModalImplementation,
  DividerImplementation,
  ButtonImplementation,
  TextFieldImplementation,
  CheckBoxImplementation,
  ChoicePickerImplementation,
  SliderImplementation,
  DateTimeInputImplementation,
]

export interface CreateMaterial3CatalogOptions {
  /** Catalog id to advertise. Defaults to the basic catalog's id. */
  readonly id?: string
  /** Extra implementations. One with a basic-catalog name replaces that component. */
  readonly components?: readonly Material3ComponentImplementation[]
  /** Replaces the basic functions entirely. */
  readonly functions?: readonly FunctionImplementation[]
  /** Locale for `formatNumber`, `formatCurrency` and `pluralize`. Ignored when `functions` is given. */
  readonly locale?: string
}

/**
 * Builds a catalog of the Material 3 implementations plus the basic functions.
 * Use it to extend the basic catalog under another id, to swap one component
 * for a host-specific one, or to localise the formatting functions.
 */
export function createMaterial3Catalog(
  options: CreateMaterial3CatalogOptions = {},
): Catalog<Material3ComponentImplementation> {
  const functions =
    options.functions ??
    (options.locale ? createBasicCatalogFunctions({ locale: options.locale }) : BASIC_FUNCTIONS)
  return new Catalog<Material3ComponentImplementation>(
    options.id ?? BASIC_CATALOG_ID,
    [...material3Components, ...(options.components ?? [])],
    [...functions],
  )
}

/** The A2UI basic catalog rendered with Material 3 Expressive. */
export const material3Catalog: Catalog<Material3ComponentImplementation> = createMaterial3Catalog()

/**
 * The minimal catalog's components. The specification defines them with the
 * same properties as their basic-catalog namesakes, so the implementations
 * are shared.
 */
export const material3MinimalComponents: readonly Material3ComponentImplementation[] = [
  TextImplementation,
  RowImplementation,
  ColumnImplementation,
  ButtonImplementation,
  TextFieldImplementation,
]

/** The A2UI minimal catalog rendered with Material 3 Expressive. */
export const material3MinimalCatalog: Catalog<Material3ComponentImplementation> =
  new Catalog<Material3ComponentImplementation>(
    MINIMAL_CATALOG_ID,
    [...material3MinimalComponents],
    [CapitalizeImplementation],
  )

/**
 * Every specification catalog the package implements, in the order `useA2ui`
 * registers them by default. An agent that announces either id in
 * `createSurface` is accepted without configuration.
 */
export const material3Catalogs: readonly Catalog<Material3ComponentImplementation>[] = [
  material3Catalog,
  material3MinimalCatalog,
]
