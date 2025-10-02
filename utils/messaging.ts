import { defineExtensionMessaging } from "@webext-core/messaging";

interface ProtocolMap {
  toggleSidebar(data?: { action?: "mount" | "toggle" }): void;
  createAnnotation(data: { selectedText: string; url: string }): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
