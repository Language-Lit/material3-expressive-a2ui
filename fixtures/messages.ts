import type { AgentToRendererMessage } from '@a2ui/web_core/v1_0'

import { BASIC_CATALOG_ID } from '../src/catalog'

export interface CreateSurfaceOptions {
  readonly catalogId?: string
  readonly components?: Record<string, unknown>[]
  readonly dataModel?: Record<string, unknown>
  readonly sendDataModel?: boolean
  readonly metadata?: Record<string, unknown>
}

/** Message builders that spell out the A2UI v1.0 wire format the tests exercise. */
export const message = {
  createSurface(surfaceId: string, options: CreateSurfaceOptions = {}): AgentToRendererMessage {
    const hasCatalogId = 'catalogId' in options
    const catalogId = hasCatalogId ? options.catalogId : BASIC_CATALOG_ID
    return {
      version: '1.0',
      createSurface: {
        surfaceId,
        ...(catalogId !== undefined ? { catalogId } : {}),
        ...(options.components !== undefined ? { components: options.components } : {}),
        ...(options.dataModel !== undefined ? { dataModel: options.dataModel } : {}),
        ...(options.sendDataModel !== undefined ? { sendDataModel: options.sendDataModel } : {}),
        ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
      },
    } as AgentToRendererMessage
  },
  updateComponents(surfaceId: string, components: Record<string, unknown>[]): AgentToRendererMessage {
    return { version: '1.0', updateComponents: { surfaceId, components } } as AgentToRendererMessage
  },
  updateDataModel(surfaceId: string, value: unknown, path?: string): AgentToRendererMessage {
    return {
      version: '1.0',
      updateDataModel: { surfaceId, ...(path ? { path } : {}), value },
    } as AgentToRendererMessage
  },
  deleteSurface(surfaceId: string): AgentToRendererMessage {
    return { version: '1.0', deleteSurface: { surfaceId } } as AgentToRendererMessage
  },
  callRendererFunction(
    surfaceId: string,
    functionCallId: string,
    call: string,
    args?: Record<string, unknown>,
    catalogId: string = BASIC_CATALOG_ID,
  ): AgentToRendererMessage {
    return {
      version: '1.0',
      callRendererFunction: {
        surfaceId,
        functionCallId,
        callFunction: { '@call': call, catalogId, ...(args ? { args } : {}) },
      },
    } as AgentToRendererMessage
  },
  agentFunctionResponse(
    functionCallId: string,
    payload: { value?: unknown; error?: { code: string; message: string } },
  ): AgentToRendererMessage {
    return {
      version: '1.0',
      agentFunctionResponse: { functionCallId, ...payload },
    } as AgentToRendererMessage
  },
}

export interface SpecExample {
  readonly name: string
  readonly description: string
  readonly messages: AgentToRendererMessage[]
}
