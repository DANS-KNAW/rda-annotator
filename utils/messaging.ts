import { defineExtensionMessaging } from "@webext-core/messaging";
import { AnnotationTarget } from "@/types/selector.interface";

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
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
