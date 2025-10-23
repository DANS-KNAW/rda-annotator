import { defineExtensionMessaging } from "@webext-core/messaging";

interface ProtocolMap {
  toggleSidebar(data?: { action?: "mount" | "toggle" }): void;
  storeAnnotation(data: {
    selectedText: string;
    url: string;
    timestamp: number;
  }): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
