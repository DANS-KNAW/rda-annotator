import { useState, useEffect } from "react";
import { searchAnnotationsByUrl } from "@/utils/elasticsearch-fetch";
import { AnnotationHit } from "@/types/elastic-search-document.interface";
import { AuthStorage } from "@/utils/auth-storage";
import AnnotateionModel from "@/components/AnnotationModel";

export default function Annotations() {
  const [annotations, setAnnotations] = useState<AnnotationHit[]>([]);
  const [selected, setSelected] = useState<AnnotationHit | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");

  useEffect(() => {
    (async () => {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const userProfile = await AuthStorage.getUser();
      if (!userProfile) return;
      const userData = await searchAnnotationsBySubmitter(userProfile.sub);

      setAnnotations(userData.hits.hits);
    })();
  }, []);

  useEffect(() => {
    if (!currentUrl) return;

    (async () => {
      try {
        const data = await searchAnnotationsByUrl(currentUrl);
        setAnnotations(data.hits.hits);
      } catch (error) {
        console.error("Error fetching annotations:", error);
        setAnnotations([]);
      }
    })();
  }, [currentUrl]);

  return (
    <>
      {selected && (
        <AnnotateionModel annotation={selected} setAnnotation={setSelected} />
      )}

      <h2 className="mx-2 mt-4 text-base/7 font-semibold text-gray-900">
        Annotations found:
      </h2>

      {annotations.length === 0 && (
        <div className="mx-2 my-8 border border-rda-500 rounded-md shadow ">
          <p className="text-gray-600 px-4 pt-4 text-base/7 font-medium">
            No annotations found for this URL.
          </p>
          <p className="text-gray-600 px-4 pb-4 text-base/7 font-medium">
            Be the first to annotate it!
          </p>
        </div>
      )}

      <div className="my-4 mx-2 space-y-4">
        {annotations.length > 0 &&
          annotations.map((annotation) => (
            <div
              key={annotation._id}
              onClick={() => setSelected(annotation)}
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
    </>
  );
}
