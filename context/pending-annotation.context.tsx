import type {
  ReactNode,
} from 'react'
import type { AnnotationTarget } from '@/types/selector.interface'
import { storage } from '#imports'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

/**
 * Data structure for a pending annotation (text selection waiting to be annotated)
 */
export interface PendingAnnotationData {
  target: AnnotationTarget
  timestamp: number
}

interface PendingAnnotationContextType {
  /** The pending annotation data, or null if none */
  pendingAnnotation: PendingAnnotationData | null
  /** Whether we're currently checking for pending data */
  isLoading: boolean
  /** Whether data has been confirmed loaded (even if null) */
  isReady: boolean
  /** Clear the pending annotation (after successful use or cancellation) */
  clearPendingAnnotation: () => Promise<void>
  /** Force a refresh from storage */
  refreshFromStorage: () => Promise<void>
}

const PendingAnnotationContext
  = createContext<PendingAnnotationContextType | null>(null)

// eslint-disable-next-line react-refresh/only-export-components -- hooks are conventionally co-located with their providers
export function usePendingAnnotation(): PendingAnnotationContextType {
  const context = useContext(PendingAnnotationContext)
  if (!context) {
    throw new Error(
      'usePendingAnnotation must be used within a PendingAnnotationProvider',
    )
  }
  return context
}

interface PendingAnnotationProviderProps {
  children: ReactNode
}

export function PendingAnnotationProvider({
  children,
}: PendingAnnotationProviderProps) {
  const [pendingAnnotation, setPendingAnnotation]
    = useState<PendingAnnotationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)

  const loadFromStorage = useCallback(
    async (retriesRemaining = 10): Promise<void> => {
      try {
        // Use local storage instead of session storage for Firefox compatibility
        // session storage has cross-context issues in Firefox MV3
        const data = await storage.getItem<PendingAnnotationData>(
          'local:pendingAnnotation',
        )

        // If no data found and we have retries left, wait and try again
        // This handles the race condition where storage write from background
        // hasn't fully propagated to the sidebar context yet
        // Firefox may need more time for cross-context storage propagation
        if (!data && retriesRemaining > 0) {
          if (import.meta.env.DEV) {
            console.debug(
              `[PendingAnnotationContext] No data found, retrying (${retriesRemaining} left)...`,
            )
          }
          await new Promise(resolve => setTimeout(resolve, 150))
          return loadFromStorage(retriesRemaining - 1)
        }

        // Data found or retries exhausted - update state
        setPendingAnnotation(data || null)
        setIsLoading(false)
        setIsReady(true)
      }
      catch (error) {
        console.error(
          '[PendingAnnotationContext] Failed to load from storage:',
          error,
        )
        setPendingAnnotation(null)
        setIsLoading(false)
        setIsReady(true)
      }
    },
    [],
  )

  const clearPendingAnnotation = useCallback(async () => {
    try {
      await storage.removeItem('local:pendingAnnotation')
      setPendingAnnotation(null)
    }
    catch (error) {
      console.error('[PendingAnnotationContext] Failed to clear:', error)
    }
  }, [])

  const refreshFromStorage = useCallback(async () => {
    setIsLoading(true)
    await loadFromStorage()
  }, [loadFromStorage])

  // Initial load from storage
  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  // Watch for storage changes (handles case where annotation is created while sidebar is open)
  useEffect(() => {
    let unwatch: (() => void) | undefined
    try {
      unwatch = storage.watch<PendingAnnotationData>(
        'local:pendingAnnotation',
        (newValue) => {
          if (import.meta.env.DEV) {
            console.debug(
              '[PendingAnnotationContext] Storage changed:',
              newValue ? `timestamp: ${newValue.timestamp}` : 'null',
            )
          }

          // Always update state to reflect storage
          // The navigation component uses timestamp to detect new annotations
          setPendingAnnotation(newValue || null)
          setIsReady(true)
          setIsLoading(false)
        },
      )
    }
    catch (error) {
      // storage.watch may not work in Firefox sidebar iframe context
      console.warn('[PendingAnnotationContext] storage.watch not available:', error)
    }

    return () => {
      unwatch?.()
    }
  }, [])

  const value: PendingAnnotationContextType = {
    pendingAnnotation,
    isLoading,
    isReady,
    clearPendingAnnotation,
    refreshFromStorage,
  }

  return (
    <PendingAnnotationContext value={value}>
      {children}
    </PendingAnnotationContext>
  )
}
