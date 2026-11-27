import { Catalog, type CatalogOptions, type FunctionImplementation } from '@a2ui/web_core'
import {
  BASIC_FUNCTIONS,
  createBasicCatalogFunctions,
} from '@a2ui/web_core/catalogs/basic/v1'

import {
  AudioPlayerImplementation,
  ButtonImplementation,
  CardImplementation,
  CarouselImplementation,
  CheckBoxImplementation,
  ChipImplementation,
  ChoicePickerImplementation,
  ColumnImplementation,
  DateTimeInputImplementation,
  DividerImplementation,
  IconButtonImplementation,
  IconImplementation,
  ImageImplementation,
  ListImplementation,
  ListItemImplementation,
  ModalImplementation,
  ProgressImplementation,
  RowImplementation,
  SegmentedButtonsImplementation,
  SelectImplementation,
  SliderImplementation,
  SwitchImplementation,
  TabsImplementation,
  TextFieldImplementation,
  TextImplementation,
  TooltipImplementation,
  VideoImplementation,
} from '../components'
import type { Material3ComponentImplementation } from '../runtime/adapter'
import { OpenUrlImplementation } from './functions'

/** The id of the A2UI v1.0 basic catalog, as agents name it in `createSurface` or `@catalogId`. */
export const BASIC_CATALOG_ID = 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json'

/** Every v1.0 basic-catalog component, implemented with Material 3 Expressive. */
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
  /** Catalog id to advertise. Defaults to the v1.0 basic catalog's id. */
  readonly id?: string
  /** Extra implementations. One with a basic-catalog name replaces that component. */
  readonly components?: readonly Material3ComponentImplementation[]
  /** Replaces the basic functions entirely. */
  readonly functions?: readonly FunctionImplementation[]
  /** Locale for `formatNumber`, `formatCurrency`, `formatDate`, and `pluralize`. Ignored when `functions` is given. */
  readonly locale?: string
  /** Optional catalog document metadata (`title`, `description`, `instructions`, etc.). */
  readonly document?: CatalogOptions
}

/**
 * The v1.0 specification's functions, with `openUrl` replaced by the package's
 * user-activation-guarded implementation (ADR 0005). A caller-supplied
 * `functions` list is used as given.
 */
function basicFunctions(locale?: string): FunctionImplementation[] {
  const functions = locale ? createBasicCatalogFunctions({ locale }) : BASIC_FUNCTIONS
  return functions.map((fn) => (fn.name === OpenUrlImplementation.name ? OpenUrlImplementation : fn))
}

/**
 * Builds a v1.0 catalog of the Material 3 implementations plus the basic functions.
 * Use it to extend the basic catalog under another id, to swap one component
 * for a host-specific one, or to localise the formatting functions.
 */
export function createMaterial3Catalog(
  options: CreateMaterial3CatalogOptions = {},
): Catalog<Material3ComponentImplementation> {
  const id = options.id ?? BASIC_CATALOG_ID
  const functions = options.functions ?? basicFunctions(options.locale)
  const documentOptions: CatalogOptions = {
    schemaUri: 'https://json-schema.org/draft/2020-12/schema',
    schemaId: id,
    declaredProtocolVersion: '1.0',
    commonTypesUri: 'common_types.json',
    ...options.document,
  }
  return new Catalog<Material3ComponentImplementation>(
    id,
    '1.0',
    [...material3Components, ...(options.components ?? [])],
    [...functions],
    documentOptions,
  )
}

/** The A2UI v1.0 basic catalog rendered with Material 3 Expressive. */
export const material3Catalog: Catalog<Material3ComponentImplementation> = createMaterial3Catalog({
  document: {
    title: 'A2UI Basic Catalog',
    description: 'Unified catalog of basic A2UI components and functions.',
  },
})

/** Package-owned v1.0 extension id; also advertised inline via renderer capabilities. */
export const MATERIAL_CATALOG_ID = 'https://m3e.language-lit.com/a2ui/catalogs/material3/catalog.json'

/** The nine additional Material components, without the basic components. */
export const material3ExtendedComponents: readonly Material3ComponentImplementation[] = [
  SwitchImplementation,
  SelectImplementation,
  IconButtonImplementation,
  ChipImplementation,
  ListItemImplementation,
  ProgressImplementation,
  CarouselImplementation,
  SegmentedButtonsImplementation,
  TooltipImplementation,
]

/** The v1.0 basic catalog plus Material-specific controls and presentation. */
export const material3ExtendedCatalog = createMaterial3Catalog({
  id: MATERIAL_CATALOG_ID,
  components: material3ExtendedComponents,
  document: {
    title: 'Material 3 Expressive A2UI Catalog',
    description: 'Material 3 Expressive extensions and the A2UI v1.0 basic catalog.',
  },
})

/** All shipped v1.0 catalogs, registered in basic then Material order. */
export const material3Catalogs: readonly Catalog<Material3ComponentImplementation>[] = [
  material3Catalog,
  material3ExtendedCatalog,
]
