import type { AnnotationHit } from '@/types/elastic-search-document.interface'
import { storage } from '#imports'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import AnnotationCard from '@/components/AnnotationCard'
import AnnotationDrawer from '@/components/AnnotationDrawer'
import { useAnchorStatus } from '@/context/anchor-status.context'
import { AuthenticationContext } from '@/context/authentication.context'
import { AuthStorage } from '@/utils/auth-storage'
import {
  searchAnnotationsBySubmitter,
  searchAnnotationsByUrl,
} from '@/utils/elasticsearch-fetch'
import { extractDocumentURL } from '@/utils/extract-document-url'
import { onMessage, sendMessage } from '@/utils/messaging'

export default function Annotations() {
  const { isAuthenticated, oauth } = use(AuthenticationContext)
  const location = useLocation()
  const {
    orphanedIds: orphanedAnnotationIds,
    pendingIds: pendingAnnotationIds,
    recoveredIds: recoveredAnnotationIds,
    requestStatus,
  } = useAnchorStatus()

  const [annotations, setAnnotations] = useState<AnnotationHit[]>([])
  const [myAnnotations, setMyAnnotations] = useState<AnnotationHit[]>([])
  const [selected, setSelected] = useState<AnnotationHit | null>(null)
  const [_currentUrl, setCurrentUrl] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('Page Annotations')
  const [filteredAnnotationIds, setFilteredAnnotationIds] = useState<string[]>(
    [],
  )
  const [hoveredAnnotationIds, setHoveredAnnotationIds] = useState<string[]>(
    [],
  )

  const mergeAnnotations = (
    existing: AnnotationHit[],
    newAnnotations: AnnotationHit[],
  ): AnnotationHit[] => {
    const map = new Map<string, AnnotationHit>()

    existing.forEach(ann => map.set(ann._id, ann))

    newAnnotations.forEach(ann => map.set(ann._id, ann))

    return Array.from(map.values()).sort((a, b) => {
      const dateA = new Date(a._source.dc_date).getTime()
      const dateB = new Date(b._source.dc_date).getTime()
      return dateB - dateA
    })
  }

  const handleAnnotationClick = async (
    annotation: AnnotationHit,
    shouldScroll: boolean,
  ) => {
    setSelected(annotation)

    if (shouldScroll) {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        })
        if (tabs[0]?.id) {
          await sendMessage(
            'scrollToAnnotation',
            { annotationId: annotation._id },
            tabs[0].id,
          )
        }
      }
      catch (error) {
        console.error('Failed to scroll to annotation:', error)
      }
    }
  }

  const allAnnotations = Array.from(
    new Map(
      [...annotations, ...myAnnotations].map(ann => [ann._id, ann]),
    ).values(),
  )
  const orphanedAnnotations = allAnnotations.filter(ann =>
    orphanedAnnotationIds.includes(ann._id),
  )

  const pageAnnotations = annotations.filter(
    ann => !orphanedAnnotationIds.includes(ann._id),
  )

  const myPageAnnotations = myAnnotations.filter(
    ann => !orphanedAnnotationIds.includes(ann._id),
  )

  const tabs: Array<{
    name: string
    count: number | null
  }> = [
    { name: 'Page Annotations', count: pageAnnotations.length },
    { name: 'Orphans', count: orphanedAnnotations.length },
    { name: 'My Annotations', count: myPageAnnotations.length },
  ]

  const displayedAnnotations
    = filteredAnnotationIds.length > 0
      ? pageAnnotations.filter(ann => filteredAnnotationIds.includes(ann._id))
      : pageAnnotations

  const clearFilter = () => {
    setFilteredAnnotationIds([])
  }

  useEffect(() => {
    (async () => {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (tabs[0]?.url) {
        const documentUrl = extractDocumentURL(tabs[0].url)
        setCurrentUrl(documentUrl)
      }
    })()
  }, [])

  useEffect(() => {
    (async () => {
      const profile = await AuthStorage.getUser()
      if (
        !oauth
        || !oauth.identity_provider_identity
        || !profile
        || !profile.sub
      ) {
        return
      }
      const userData = await searchAnnotationsBySubmitter(
        oauth.identity_provider_identity,
        profile.sub,
      )
      setMyAnnotations(userData.hits.hits)
    })()
  }, [isAuthenticated, location])

  // Listen for highlight clicks - set persistent filter
  useEffect(() => {
    const unsubscribe = onMessage(
      'showAnnotationsFromHighlight',
      async (message) => {
        if (!message.data?.annotationIds)
          return

        const { annotationIds } = message.data

        // Set persistent filter (no timeout)
        setFilteredAnnotationIds(annotationIds)

        // If only one annotation, show it in the modal
        if (annotationIds.length === 1) {
          const annotation = annotations.find(
            ann => ann._id === annotationIds[0],
          )
          if (annotation) {
            setSelected(annotation)
          }
        }
        // If multiple annotations, they're now filtered in the list
        // User can click any to see details
      },
    )

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [annotations])

  // Listen for highlight hovers - set temporary hover state
  useEffect(() => {
    const unsubscribe = onMessage('hoverAnnotations', async (message) => {
      if (!message.data?.annotationIds) {
        setHoveredAnnotationIds([])
        return
      }

      const { annotationIds } = message.data
      setHoveredAnnotationIds(annotationIds)
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  // Watch tab-specific storage for frame URL changes
  useEffect(() => {
    let unwatch: (() => void) | undefined

    const setupWatcher = async () => {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        })
        const tabId = tabs[0]?.id
        if (!tabId)
          return

        const key = `session:frameUrls:${tabId}` as const

        // Check storage on mount for any URLs written before we mounted
        const storedUrls = await storage.getItem<string[]>(key)
        if (storedUrls && storedUrls.length > 0) {
          const data = await searchAnnotationsByUrl(storedUrls)
          setAnnotations(prev => mergeAnnotations(prev, data.hits.hits))
        }

        // Watch for changes to frame URLs in storage
        unwatch = storage.watch<string[]>(key, async (newUrls) => {
          if (!newUrls || newUrls.length === 0)
            return

          try {
            const data = await searchAnnotationsByUrl(newUrls)
            setAnnotations(prev => mergeAnnotations(prev, data.hits.hits))
          }
          catch (error) {
            console.error(
              '[Annotations] Error fetching annotations for new frame URLs:',
              error,
            )
          }
        })
      }
      catch (error) {
        console.error('[Annotations] Error setting up storage watcher:', error)
      }
    }

    setupWatcher()

    return () => {
      if (unwatch)
        unwatch()
    }
  }, [])

  // Request anchor status when annotations load
  // The anchorStatusUpdate listener is now in AnchorStatusProvider (App level)
  useEffect(() => {
    if (annotations.length === 0 && myAnnotations.length === 0)
      return
    requestStatus()
  }, [annotations.length, myAnnotations.length, requestStatus])

  if (activeTab === 'My Annotations') {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-gray-200">
          <nav aria-label="Tabs" className="-mb-px flex">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.name
              const isOrphansTab = tab.name === 'Orphans'

              return (
                <p
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`${
                    isActive
                      ? isOrphansTab
                        ? 'border-amber-500 text-amber-700'
                        : 'border-rda-500 text-rda-500'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } w-full border-b-2 px-1 py-4 text-center text-sm font-medium cursor-pointer flex items-center justify-center gap-1`}
                >
                  <span>{tab.name}</span>
                  {tab.count !== null && (
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full ${
                        isOrphansTab
                          ? 'bg-amber-100 text-amber-800'
                          : isActive
                            ? 'bg-rda-100 text-rda-800'
                            : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </p>
              )
            })}
          </nav>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {selected && (
            <AnnotationDrawer
              annotation={selected}
              setAnnotation={setSelected}
            />
          )}

          <div className="h-full overflow-y-auto">
            <h2 className="mx-2 mt-4 text-base/7 font-semibold text-gray-900">
              Personal Annotations found:
            </h2>

            {myPageAnnotations.length === 0 && (
              <div className="mx-2 my-8 border border-rda-500 rounded-md shadow ">
                <p className="text-gray-600 px-4 pt-4 text-base/7 font-medium">
                  No personal annotations found!
                </p>
                <p className="text-gray-600 px-4 pb-4 text-base/7 font-medium">
                  Start annotating pages to see them listed here.
                </p>
              </div>
            )}

            <div className="my-4 mx-2 space-y-4">
              {myPageAnnotations.length > 0
                && myPageAnnotations.map(annotation => (
                  <AnnotationCard
                    key={annotation._id}
                    annotation={annotation}
                    isOrphaned={false}
                    isPending={pendingAnnotationIds.includes(annotation._id)}
                    isRecovered={recoveredAnnotationIds.includes(
                      annotation._id,
                    )}
                    isHovered={false}
                    onClick={() => handleAnnotationClick(annotation, false)}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'Orphans') {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-gray-200">
          <nav aria-label="Tabs" className="-mb-px flex">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.name
              const isOrphansTab = tab.name === 'Orphans'

              return (
                <p
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`${
                    isActive
                      ? isOrphansTab
                        ? 'border-amber-500 text-amber-700'
                        : 'border-rda-500 text-rda-500'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } w-full border-b-2 px-1 py-4 text-center text-sm font-medium cursor-pointer flex items-center justify-center gap-1`}
                >
                  <span>{tab.name}</span>
                  {tab.count !== null && (
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full ${
                        isOrphansTab
                          ? 'bg-amber-100 text-amber-800'
                          : isActive
                            ? 'bg-rda-100 text-rda-800'
                            : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </p>
              )
            })}
          </nav>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {selected && (
            <AnnotationDrawer
              annotation={selected}
              setAnnotation={setSelected}
            />
          )}

          <div className="h-full overflow-y-auto">
            <div className="mx-2 mt-4 mb-4 p-3 bg-amber-50 border border-amber-300 rounded-md">
              <div className="flex items-start gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Orphaned Annotations
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    These annotations cannot be located on the current page. The
                    page content may have changed since the annotation was
                    created.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="mx-2 mt-4 text-base/7 font-semibold text-gray-900">
              Orphaned Annotations found:
            </h2>

            {orphanedAnnotations.length === 0 && (
              <div className="mx-2 my-8 border border-gray-300 rounded-md shadow">
                <p className="text-gray-600 px-4 pt-4 text-base/7 font-medium">
                  No orphaned annotations found!
                </p>
                <p className="text-gray-600 px-4 pb-4 text-base/7 font-medium">
                  All annotations on this page are successfully anchored.
                </p>
              </div>
            )}

            <div className="my-4 mx-2 space-y-4">
              {orphanedAnnotations.map(annotation => (
                <AnnotationCard
                  key={annotation._id}
                  annotation={annotation}
                  isOrphaned={true}
                  isPending={pendingAnnotationIds.includes(annotation._id)}
                  isRecovered={false}
                  isHovered={false}
                  onClick={() => handleAnnotationClick(annotation, false)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200">
        <nav aria-label="Tabs" className="-mb-px flex">
          {tabs.map(tab => (
            <p
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`${
                activeTab === tab.name
                  ? tab.name === 'Orphans'
                    ? 'border-amber-500 text-amber-700'
                    : 'border-rda-500 text-rda-500'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } w-full border-b-2 px-1 py-4 text-center text-sm font-medium cursor-pointer flex items-center justify-center gap-1`}
            >
              <span>{tab.name}</span>
              {tab.count !== null && (
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full ${
                    tab.name === 'Orphans'
                      ? 'bg-amber-100 text-amber-800'
                      : activeTab === tab.name
                        ? 'bg-rda-100 text-rda-800'
                        : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </p>
          ))}
        </nav>
      </div>

      {/* Filter Section */}
      {filteredAnnotationIds.length > 0 && (
        <div className="mx-2 mt-3 mb-2 p-3 bg-rda-50 border border-rda-300 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-5 text-rda-600"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
                />
              </svg>

              <span className="text-sm font-medium text-rda-900">
                Showing
                {' '}
                {filteredAnnotationIds.length}
                {' '}
                selected annotation
                {filteredAnnotationIds.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={clearFilter}
              className="text-sm font-medium text-rda-600 hover:text-rda-900 underline cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {selected && (
          <AnnotationDrawer annotation={selected} setAnnotation={setSelected} />
        )}

        <div className="h-full overflow-y-auto">
          <h2 className="mx-2 mt-4 text-base/7 font-semibold text-gray-900">
            Page Annotations found:
          </h2>

          {displayedAnnotations.length === 0
            && pageAnnotations.length === 0 && (
            <div className="mx-2 my-8 border border-rda-500 rounded-md shadow ">
              <p className="text-gray-600 px-4 pt-4 text-base/7 font-medium">
                No annotations found for this URL.
              </p>
              <p className="text-gray-600 px-4 pb-4 text-base/7 font-medium">
                Be the first to annotate it!
              </p>
            </div>
          )}

          {displayedAnnotations.length === 0 && pageAnnotations.length > 0 && (
            <div className="mx-2 my-8 border border-rda-500 rounded-md shadow ">
              <p className="text-gray-600 px-4 pt-4 text-base/7 font-medium">
                No annotations match the current filter.
              </p>
              <p className="text-gray-600 px-4 pb-4 text-base/7 font-medium">
                <button
                  onClick={clearFilter}
                  className="text-rda-600 hover:text-rda-700 underline font-semibold"
                >
                  Clear filter
                </button>
                {' '}
                to see all annotations.
              </p>
            </div>
          )}

          <div className="my-4 mx-2 space-y-4">
            {displayedAnnotations.length > 0
              && displayedAnnotations.map(annotation => (
                <AnnotationCard
                  key={annotation._id}
                  annotation={annotation}
                  isOrphaned={false}
                  isPending={pendingAnnotationIds.includes(annotation._id)}
                  isRecovered={recoveredAnnotationIds.includes(annotation._id)}
                  isHovered={hoveredAnnotationIds.includes(annotation._id)}
                  onClick={() => handleAnnotationClick(annotation, true)}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
