import { defineExtensionMessaging } from "@webext-core/messaging";
import { AnnotationTarget } from "@/types/selector.interface";
import type { ElasticsearchResponse } from "@/types/elastic-search-document.interface";
import type { DataSource } from "@/types/datasource.interface";

export type AnchorStatus = "anchored" | "pending" | "orphaned" | "recovered";

interface ProtocolMap {
  toggleSidebar(data?: { action?: "mount" | "toggle" }): void;
  storeAnnotation(data: {
    target: AnnotationTarget;
    timestamp: number;
  }): Promise<{ success: boolean }>;
  scrollToAnnotation(data: { annotationId: string }): Promise<void>;
  removeTemporaryHighlight(): Promise<void>;
  reloadAnnotations(): Promise<void>;
  getExtensionState(): Promise<{ enabled: boolean }>;
  showAnnotationsFromHighlight(data: {
    annotationIds: string[];
  }): Promise<void>;
  hoverAnnotations(data: { annotationIds: string[] }): Promise<void>;
  getFrameUrls(): Promise<{ urls: string[] }>;
  frameUrlsChanged(data: { urls: string[] }): Promise<void>;
  registerFrameUrl(data: { url: string }): Promise<void>;
  anchorStatusUpdate(data: {
    annotationId: string;
    status: AnchorStatus;
  }): Promise<void>;
  requestAnchorStatus(): Promise<{
    anchored: string[];
    pending: string[];
    orphaned: string[];
    recovered: string[];
  }>;

  // API proxy messages - route through background to bypass CORS/Brave Shields
  searchAnnotations(data: {
    type: "byUrl" | "bySubmitter";
    urls?: string | string[];
    submitterUuid?: string;
    oldSubmitterUuid?: string;
  }): Promise<ElasticsearchResponse>;

  fetchVocabularies(data: {
    subject_scheme?: string;
    scheme_uri?: string;
    value_scheme?: string;
    value_uri?: string;
    namespace?: string;
    amount?: number;
    offset?: number;
    deleted?: boolean;
  }): Promise<DataSource[]>;

  createAnnotation(data: {
    payload: Record<string, unknown>;
  }): Promise<{ success: boolean; data?: unknown; error?: string }>;

  // Identity API proxy - browser.identity is not available in iframe contexts on Firefox
  getAuthRedirectUrl(): Promise<string>;
  launchAuthFlow(data: { url: string }): Promise<string | undefined>;

  // Session storage proxy - browser.storage.session is not available in iframe contexts on Firefox
  getSessionStorageItem<T>(data: { key: string }): Promise<T | null>;
  removeSessionStorageItem(data: { key: string }): Promise<void>;

  // Tabs API proxy - browser.tabs is not available in iframe contexts on Firefox
  getActiveTab(): Promise<{ id?: number; url?: string }>;

  // Highlight click proxy - route through background for Firefox iframe compatibility
  storeHighlightClick(data: {
    annotationIds: string[];
    timestamp: number;
  }): Promise<{ success: boolean }>;

  // Highlight hover proxy - route through background for Firefox iframe compatibility
  storeHighlightHover(data: {
    annotationIds: string[];
  }): Promise<{ success: boolean }>;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
