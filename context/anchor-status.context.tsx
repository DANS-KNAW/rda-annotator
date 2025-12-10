import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { onMessage, sendMessage, AnchorStatus } from "@/utils/messaging";

interface AnchorStatusState {
  orphanedIds: string[];
  pendingIds: string[];
  recoveredIds: string[];
  anchoredIds: Set<string>;
}

interface AnchorStatusContextType {
  orphanedIds: string[];
  pendingIds: string[];
  recoveredIds: string[];
  /** Check if an annotation was ever successfully anchored */
  wasEverAnchored: (id: string) => boolean;
  /** Request fresh status from content script */
  requestStatus: () => Promise<void>;
  /** Reset all status (e.g., when changing pages) */
  resetStatus: () => void;
}

const AnchorStatusContext = createContext<AnchorStatusContextType | null>(null);

export function useAnchorStatus(): AnchorStatusContextType {
  const context = useContext(AnchorStatusContext);
  if (!context) {
    throw new Error(
      "useAnchorStatus must be used within an AnchorStatusProvider"
    );
  }
  return context;
}

interface AnchorStatusProviderProps {
  children: ReactNode;
}

export function AnchorStatusProvider({ children }: AnchorStatusProviderProps) {
  const [state, setState] = useState<AnchorStatusState>({
    orphanedIds: [],
    pendingIds: [],
    recoveredIds: [],
    anchoredIds: new Set(),
  });

  // Track IDs that were ever successfully anchored (survives re-renders)
  const everAnchoredRef = useRef<Set<string>>(new Set());

  // Handle individual status updates from content script
  useEffect(() => {
    const unsubscribe = onMessage("anchorStatusUpdate", async (message) => {
      if (!message.data) return;

      const { annotationId, status } = message.data;

      setState((prev) => {
        const newState = { ...prev };

        switch (status) {
          case "anchored":
            // Track that this annotation was successfully anchored
            everAnchoredRef.current.add(annotationId);
            newState.anchoredIds = new Set(prev.anchoredIds).add(annotationId);
            // Remove from orphaned/pending
            newState.orphanedIds = prev.orphanedIds.filter(
              (id) => id !== annotationId
            );
            newState.pendingIds = prev.pendingIds.filter(
              (id) => id !== annotationId
            );
            break;

          case "pending":
            if (!prev.pendingIds.includes(annotationId)) {
              newState.pendingIds = [...prev.pendingIds, annotationId];
            }
            break;

          case "orphaned":
            // Only mark as orphaned if it was never anchored
            // This prevents flickering from late orphaned updates from other frames
            if (!everAnchoredRef.current.has(annotationId)) {
              newState.pendingIds = prev.pendingIds.filter(
                (id) => id !== annotationId
              );
              if (!prev.orphanedIds.includes(annotationId)) {
                newState.orphanedIds = [...prev.orphanedIds, annotationId];
              }
            }
            break;

          case "recovered":
            everAnchoredRef.current.add(annotationId);
            if (!prev.recoveredIds.includes(annotationId)) {
              newState.recoveredIds = [...prev.recoveredIds, annotationId];
            }
            newState.orphanedIds = prev.orphanedIds.filter(
              (id) => id !== annotationId
            );
            newState.pendingIds = prev.pendingIds.filter(
              (id) => id !== annotationId
            );
            break;
        }

        return newState;
      });
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const requestStatus = useCallback(async () => {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tabs[0]?.id) {
        const status = await sendMessage(
          "requestAnchorStatus",
          undefined,
          tabs[0].id
        );

        if (status) {
          // Update everAnchored tracking
          status.anchored.forEach((id) => everAnchoredRef.current.add(id));
          status.recovered.forEach((id) => everAnchoredRef.current.add(id));

          setState({
            orphanedIds: status.orphaned,
            pendingIds: status.pending,
            recoveredIds: status.recovered,
            anchoredIds: new Set([...status.anchored, ...status.recovered]),
          });
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("Failed to request anchor status:", error);
      }
    }
  }, []);

  const resetStatus = useCallback(() => {
    everAnchoredRef.current.clear();
    setState({
      orphanedIds: [],
      pendingIds: [],
      recoveredIds: [],
      anchoredIds: new Set(),
    });
  }, []);

  const wasEverAnchored = useCallback((id: string) => {
    return everAnchoredRef.current.has(id);
  }, []);

  const value: AnchorStatusContextType = {
    orphanedIds: state.orphanedIds,
    pendingIds: state.pendingIds,
    recoveredIds: state.recoveredIds,
    wasEverAnchored,
    requestStatus,
    resetStatus,
  };

  return (
    <AnchorStatusContext.Provider value={value}>
      {children}
    </AnchorStatusContext.Provider>
  );
}
