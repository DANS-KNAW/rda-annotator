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
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
