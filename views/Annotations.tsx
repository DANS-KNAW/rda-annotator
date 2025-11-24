import { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router";
import {
  searchAnnotationsByUrl,
  searchAnnotationsBySubmitter,
} from "@/utils/elasticsearch-fetch";
import { AnnotationHit } from "@/types/elastic-search-document.interface";
import { AuthStorage } from "@/utils/auth-storage";
import AnnotationDrawer from "@/components/AnnotationDrawer";
import { AuthenticationContext } from "@/context/authentication.context";
import { sendMessage, onMessage } from "@/utils/messaging";
import { extractDocumentURL } from "@/utils/extract-document-url";

export default function Annotations() {
  const { isAuthenticated, oauth } = useContext(AuthenticationContext);
  const location = useLocation();

  const [annotations, setAnnotations] = useState<AnnotationHit[]>([]);
  const [myAnnotations, setMyAnnotations] = useState<AnnotationHit[]>([]);
  const [selected, setSelected] = useState<AnnotationHit | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("Page Annotations");
  const [filteredAnnotationIds, setFilteredAnnotationIds] = useState<string[]>(
    []
  );
  const [hoveredAnnotationIds, setHoveredAnnotationIds] = useState<string[]>(
    []
  );

  const mergeAnnotations = (
    existing: AnnotationHit[],
    newAnnotations: AnnotationHit[]
  ): AnnotationHit[] => {
    const map = new Map<string, AnnotationHit>();

    existing.forEach((ann) => map.set(ann._id, ann));

    newAnnotations.forEach((ann) => map.set(ann._id, ann));

    return Array.from(map.values()).sort((a, b) => {
      const dateA = new Date(a._source.dc_date).getTime();
      const dateB = new Date(b._source.dc_date).getTime();
      return dateB - dateA;
    });
  };

  const handleAnnotationClick = async (
    annotation: AnnotationHit,
    shouldScroll: boolean
  ) => {
    setSelected(annotation);

    if (shouldScroll) {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]?.id) {
          await sendMessage(
            "scrollToAnnotation",
            { annotationId: annotation._id },
            tabs[0].id
          );
        }
      } catch (error) {
        console.error("Failed to scroll to annotation:", error);
      }
    }
  };

  const tabs = [{ name: "Page Annotations" }, { name: "My Annotations" }];

  // Filter annotations based on selected filter
  const displayedAnnotations =
    filteredAnnotationIds.length > 0
      ? annotations.filter((ann) => filteredAnnotationIds.includes(ann._id))
      : annotations;

  const clearFilter = () => {
    setFilteredAnnotationIds([]);
  };

  useEffect(() => {
    (async () => {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]?.url) {
        const documentUrl = extractDocumentURL(tabs[0].url);
        setCurrentUrl(documentUrl);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const profile = await AuthStorage.getUser();
      if (
        !oauth ||
        !oauth.identity_provider_identity ||
        !profile ||
        !profile.sub
      )
        return;
      const userData = await searchAnnotationsBySubmitter(
        oauth.identity_provider_identity,
        profile.sub
      );
      setMyAnnotations(userData.hits.hits);
    })();
  }, [isAuthenticated, location]);

  useEffect(() => {
    if (!currentUrl) return;

    (async () => {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });

        let frameUrls = [currentUrl]; // Fallback to just current URL

        if (tabs[0]?.id) {
          try {
            const response = await sendMessage(
              "getFrameUrls",
              undefined,
              tabs[0].id
            );
            if (response?.urls && response.urls.length > 0) {
              frameUrls = response.urls;
            }
          } catch (error) {
            console.warn(
              "[Annotations] Failed to get frame URLs, using current URL only:",
              error
            );
          }
        }

        // Query for annotations matching any frame URL
        const data = await searchAnnotationsByUrl(frameUrls);
        setAnnotations(data.hits.hits);
      } catch (error) {
        console.error("Error fetching annotations:", error);
        setAnnotations([]);
      }
    })();
  }, [currentUrl, location]);

  // Listen for highlight clicks - set persistent filter
  useEffect(() => {
    const unsubscribe = onMessage(
      "showAnnotationsFromHighlight",
      async (message) => {
        if (!message.data?.annotationIds) return;

        const { annotationIds } = message.data;

        // Set persistent filter (no timeout)
        setFilteredAnnotationIds(annotationIds);

        // If only one annotation, show it in the modal
        if (annotationIds.length === 1) {
          const annotation = annotations.find(
            (ann) => ann._id === annotationIds[0]
          );
          if (annotation) {
            setSelected(annotation);
          }
        }
        // If multiple annotations, they're now filtered in the list
        // User can click any to see details
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [annotations]);

  // Listen for highlight hovers - set temporary hover state
  useEffect(() => {
    const unsubscribe = onMessage("hoverAnnotations", async (message) => {
      if (!message.data?.annotationIds) {
        setHoveredAnnotationIds([]);
        return;
      }

      const { annotationIds } = message.data;
      setHoveredAnnotationIds(annotationIds);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onMessage("frameUrlsChanged", async (message) => {
      if (!message.data?.urls || message.data.urls.length === 0) return;

      try {
        const data = await searchAnnotationsByUrl(message.data.urls);
        setAnnotations((prev) => mergeAnnotations(prev, data.hits.hits));
      } catch (error) {
        console.error(
          "[Annotations] Error refetching annotations after frame change:",
          error
        );
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  if (activeTab === "My Annotations") {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-gray-200">
          <nav aria-label="Tabs" className="-mb-px flex">
            {tabs.map((tab) => (
              <p
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`${
                  activeTab === tab.name
                    ? "border-rda-500 text-rda-500"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                } w-full border-b-2 px-1 py-4 text-center text-sm font-medium cursor-pointer`}
              >
                {tab.name}
              </p>
            ))}
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

            {myAnnotations.length === 0 && (
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
              {myAnnotations.length > 0 &&
                myAnnotations.map((annotation) => (
                  <div
                    key={annotation._id}
                    onClick={() => handleAnnotationClick(annotation, false)}
                    className="bg-white p-2 rounded-md shadow cursor-pointer min-h-14 hover:bg-rda-50"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span>{annotation._source.dc_date}</span>
                    </div>
                    <p className="text-gray-600 line-clamp-3 bg-gray-100 p-2 rounded-md">
                      {annotation._source.fragment}
                    </p>
                    <p className="mt-2 line-clamp-3">
                      {annotation._source.dc_description}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200">
        <nav aria-label="Tabs" className="-mb-px flex">
          {tabs.map((tab) => (
            <p
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`${
                activeTab === tab.name
                  ? "border-rda-500 text-rda-500"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } w-full border-b-2 px-1 py-4 text-center text-sm font-medium cursor-pointer`}
            >
              {tab.name}
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
                Showing {filteredAnnotationIds.length} selected annotation
                {filteredAnnotationIds.length !== 1 ? "s" : ""}
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

          {displayedAnnotations.length === 0 && annotations.length === 0 && (
            <div className="mx-2 my-8 border border-rda-500 rounded-md shadow ">
              <p className="text-gray-600 px-4 pt-4 text-base/7 font-medium">
                No annotations found for this URL.
              </p>
              <p className="text-gray-600 px-4 pb-4 text-base/7 font-medium">
                Be the first to annotate it!
              </p>
            </div>
          )}

          {displayedAnnotations.length === 0 && annotations.length > 0 && (
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
                </button>{" "}
                to see all annotations.
              </p>
            </div>
          )}

          <div className="my-4 mx-2 space-y-4">
            {displayedAnnotations.length > 0 &&
              displayedAnnotations.map((annotation) => {
                const isHovered = hoveredAnnotationIds.includes(annotation._id);
                return (
                  <div
                    key={annotation._id}
                    onClick={() => handleAnnotationClick(annotation, true)}
                    className={`p-2 rounded-md shadow cursor-pointer min-h-14 transition-all ${
                      isHovered
                        ? "bg-rda-100 border-2 border-rda-500 ring-2 ring-rda-300"
                        : "bg-white hover:bg-rda-50"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span>{annotation._source.dc_date}</span>
                    </div>
                    <p className="text-gray-600 line-clamp-3 bg-gray-100 p-2 rounded-md">
                      {annotation._source.fragment}
                    </p>
                    <p className="mt-2 line-clamp-3">
                      {annotation._source.dc_description}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
