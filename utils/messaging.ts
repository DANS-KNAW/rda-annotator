import type { DataSource } from '@/types/datasource.interface'
import type { ElasticsearchResponse } from '@/types/elastic-search-document.interface'
import type { AnnotationTarget } from '@/types/selector.interface'
import { defineExtensionMessaging } from '@webext-core/messaging'

export type AnchorStatus = 'anchored' | 'pending' | 'orphaned' | 'recovered'

interface ProtocolMap {
  toggleSidebar: (data?: { action?: 'mount' | 'toggle' }) => void
  storeAnnotation: (data: {
    target: AnnotationTarget
    timestamp: number
  }) => Promise<{ success: boolean }>
  scrollToAnnotation: (data: { annotationId: string }) => Promise<void>
  removeTemporaryHighlight: () => Promise<void>
  reloadAnnotations: () => Promise<void>
  getExtensionState: () => Promise<{ enabled: boolean }>
  showAnnotationsFromHighlight: (data: {
    annotationIds: string[]
  }) => Promise<void>
  hoverAnnotations: (data: { annotationIds: string[] }) => Promise<void>
  getFrameUrls: () => Promise<{ urls: string[] }>
  frameUrlsChanged: (data: { urls: string[] }) => Promise<void>
  registerFrameUrl: (data: { url: string }) => Promise<void>
  anchorStatusUpdate: (data: {
    annotationId: string
    status: AnchorStatus
  }) => Promise<void>
  requestAnchorStatus: () => Promise<{
    anchored: string[]
    pending: string[]
    orphaned: string[]
    recovered: string[]
  }>

  // API proxy messages - route through background to bypass CORS/Brave Shields
  searchAnnotations: (data: {
    type: 'byUrl' | 'bySubmitter'
    urls?: string | string[]
    submitterUuid?: string
    oldSubmitterUuid?: string
  }) => Promise<ElasticsearchResponse>

  fetchVocabularies: (data: {
    subject_scheme?: string
    scheme_uri?: string
    value_scheme?: string
    value_uri?: string
    namespace?: string
    amount?: number
    offset?: number
    deleted?: boolean
  }) => Promise<DataSource[]>

  createAnnotation: (data: {
    payload: Record<string, unknown>
  }) => Promise<{ success: boolean, data?: unknown, error?: string }>
}

export const { sendMessage, onMessage }
  = defineExtensionMessaging<ProtocolMap>()
