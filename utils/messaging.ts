import { defineExtensionMessaging } from "@webext-core/messaging";
import { AnnotationTarget } from "@/types/selector.interface";

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
  showAnnotationsFromHighlight(data: { annotationIds: string[] }): Promise<void>;
  hoverAnnotations(data: { annotationIds: string[] }): Promise<void>;
  getFrameUrls(): Promise<{ urls: string[] }>;
  frameUrlsChanged(data: { urls: string[] }): Promise<void>;
  anchorStatusUpdate(data: {
    annotationId: string;
    anchored: boolean;
  }): Promise<void>;
  requestAnchorStatus(): Promise<{
    anchored: string[];
    orphaned: string[];
  }>;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
