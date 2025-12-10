import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { storage } from "#imports";
import { AnnotationTarget } from "@/types/selector.interface";

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
      const data = await storage.getItem<PendingAnnotationData>(
        "session:pendingAnnotation"
      );
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
      await storage.removeItem("session:pendingAnnotation");
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

  // Watch for storage changes (handles case where annotation is created while sidebar is open)
  useEffect(() => {
    const unwatch = storage.watch<PendingAnnotationData>(
      "session:pendingAnnotation",
      (newValue) => {
        if (import.meta.env.DEV) {
          console.log(
            "[PendingAnnotationContext] Storage changed:",
            newValue ? `timestamp: ${newValue.timestamp}` : "null"
          );
        }

        // Always update state to reflect storage
        // The navigation component uses timestamp to detect new annotations
        setPendingAnnotation(newValue || null);
        setIsReady(true);
        setIsLoading(false);
      }
    );

    return () => {
      unwatch();
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
