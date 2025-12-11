import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { AnnotationTarget } from "@/types/selector.interface";
import { sendMessage } from "@/utils/messaging";
import { isDev } from "@/utils/is-dev";

/**
 * Data structure for a pending annotation (text selection waiting to be annotated)
 */
export interface PendingAnnotationData {
  target: AnnotationTarget;
  timestamp: number;
}

interface PendingAnnotationContextType {
  /** The pending annotation data, or null if none */
  pendingAnnotation: PendingAnnotationData | null;
  /** Whether we're currently checking for pending data */
  isLoading: boolean;
  /** Whether data has been confirmed loaded (even if null) */
  isReady: boolean;
  /** Clear the pending annotation (after successful use or cancellation) */
  clearPendingAnnotation: () => Promise<void>;
  /** Force a refresh from storage */
  refreshFromStorage: () => Promise<void>;
}

const PendingAnnotationContext =
  createContext<PendingAnnotationContextType | null>(null);

export function usePendingAnnotation(): PendingAnnotationContextType {
  const context = useContext(PendingAnnotationContext);
  if (!context) {
    throw new Error(
      "usePendingAnnotation must be used within a PendingAnnotationProvider"
    );
  }
  return context;
}

interface PendingAnnotationProviderProps {
  children: ReactNode;
}

export function PendingAnnotationProvider({
  children,
}: PendingAnnotationProviderProps) {
  const [pendingAnnotation, setPendingAnnotation] =
    useState<PendingAnnotationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const loadFromStorage = useCallback(async () => {
    try {
      // Use messaging to access session storage - browser.storage.session is not available in iframe contexts on Firefox
      const data = await sendMessage("getSessionStorageItem", {
        key: "session:pendingAnnotation",
      }) as PendingAnnotationData | null;
      setPendingAnnotation(data || null);
    } catch (error) {
      console.error(
        "[PendingAnnotationContext] Failed to load from storage:",
        error
      );
      setPendingAnnotation(null);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, []);

  const clearPendingAnnotation = useCallback(async () => {
    try {
      // Use messaging to access session storage - browser.storage.session is not available in iframe contexts on Firefox
      await sendMessage("removeSessionStorageItem", {
        key: "session:pendingAnnotation",
      });
      setPendingAnnotation(null);
    } catch (error) {
      console.error("[PendingAnnotationContext] Failed to clear:", error);
    }
  }, []);

  const refreshFromStorage = useCallback(async () => {
    setIsLoading(true);
    await loadFromStorage();
  }, [loadFromStorage]);

  // Initial load from storage
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Track the last known timestamp to detect changes
  const lastTimestampRef = useRef<number | null>(null);

  // Poll for storage changes (storage.watch is not available in iframe contexts on Firefox)
  // This handles the case where annotation is created while sidebar is open
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const data = await sendMessage("getSessionStorageItem", {
          key: "session:pendingAnnotation",
        }) as PendingAnnotationData | null;

        // Only update if there's a new annotation (different timestamp)
        if (data?.timestamp !== lastTimestampRef.current) {
          if (isDev) {
            console.log(
              "[PendingAnnotationContext] Storage changed:",
              data ? `timestamp: ${data.timestamp}` : "null"
            );
          }

          lastTimestampRef.current = data?.timestamp ?? null;
          setPendingAnnotation(data || null);
          setIsReady(true);
          setIsLoading(false);
        }
      } catch (error) {
        // Silently ignore polling errors
      }
    }, 500); // Poll every 500ms

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const value: PendingAnnotationContextType = {
    pendingAnnotation,
    isLoading,
    isReady,
    clearPendingAnnotation,
    refreshFromStorage,
  };

  return (
    <PendingAnnotationContext.Provider value={value}>
      {children}
    </PendingAnnotationContext.Provider>
  );
}
