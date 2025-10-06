import { useState, useEffect, useContext } from "react";
import { searchAnnotationsByUrl } from "@/utils/elasticsearch-fetch";
import { AnnotationHit } from "@/types/elastic-search-document.interface";
import { AuthStorage } from "@/utils/auth-storage";
import AnnotateionModel from "@/components/AnnotationModel";
import { AuthenticationContext } from "@/context/authentication.context";

export default function Annotations() {
  const { isAuthenticated } = useContext(AuthenticationContext);

  const [annotations, setAnnotations] = useState<AnnotationHit[]>([]);
  const [myAnnotations, setMyAnnotations] = useState<AnnotationHit[]>([]);
  const [selected, setSelected] = useState<AnnotationHit | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("Page Annotations");

  const tabs = [{ name: "Page Annotations" }, { name: "My Annotations" }];

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
      setMyAnnotations(userData.hits.hits);
    })();
  }, [isAuthenticated]);

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

  const renderTabContent = () => {
    let activeAnnotations = annotations;

    if (activeTab === "My Annotations") {
      activeAnnotations = myAnnotations;
    }

    return (
      <>
        {selected && (
          <AnnotateionModel annotation={selected} setAnnotation={setSelected} />
        )}

        <h2 className="mx-2 mt-4 text-base/7 font-semibold text-gray-900">
          Annotations found:
        </h2>

        {activeAnnotations.length === 0 && (
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
          {activeAnnotations.length > 0 &&
            activeAnnotations.map((annotation) => (
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
  };

  if (activeTab === "My Annotations") {
    return (
      <>
        <div>
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
        </div>

        {selected && (
          <AnnotateionModel annotation={selected} setAnnotation={setSelected} />
        )}

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

  return (
    <>
      <div>
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
      </div>

      {selected && (
        <AnnotateionModel annotation={selected} setAnnotation={setSelected} />
      )}

      <h2 className="mx-2 mt-4 text-base/7 font-semibold text-gray-900">
        Page Annotations found:
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
