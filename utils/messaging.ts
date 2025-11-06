import { defineExtensionMessaging } from "@webext-core/messaging";
import { AnnotationTarget } from "@/types/selector.interface";

interface ProtocolMap {
  toggleSidebar(data?: { action?: "mount" | "toggle" }): void;
  storeAnnotation(data: {
    target: AnnotationTarget;
    timestamp: number;
  }): Promise<{ success: boolean }>;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
