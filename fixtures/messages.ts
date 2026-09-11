import type { A2uiMessage } from '@a2ui/web_core/v0_9'

import { BASIC_CATALOG_ID } from '../src/catalog'

/** Message builders that spell out the wire format the tests exercise. */
export const message = {
  createSurface(
    surfaceId: string,
    options: { catalogId?: string; theme?: Record<string, unknown>; sendDataModel?: boolean } = {},
  ): A2uiMessage {
    return {
      version: 'v0.9',
      createSurface: {
        surfaceId,
        catalogId: options.catalogId ?? BASIC_CATALOG_ID,
        ...(options.theme ? { theme: options.theme } : {}),
        ...(options.sendDataModel !== undefined ? { sendDataModel: options.sendDataModel } : {}),
      },
    } as A2uiMessage
  },
  updateComponents(surfaceId: string, components: Record<string, unknown>[]): A2uiMessage {
    return { version: 'v0.9', updateComponents: { surfaceId, components } } as A2uiMessage
  },
  updateDataModel(surfaceId: string, value: unknown, path?: string): A2uiMessage {
    return {
      version: 'v0.9',
      updateDataModel: { surfaceId, ...(path ? { path } : {}), value },
    } as A2uiMessage
  },
  deleteSurface(surfaceId: string): A2uiMessage {
    return { version: 'v0.9', deleteSurface: { surfaceId } } as A2uiMessage
  },
}

export interface SpecExample {
  readonly name: string
  readonly description: string
  readonly messages: A2uiMessage[]
}
