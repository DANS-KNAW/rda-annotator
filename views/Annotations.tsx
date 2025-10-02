import { useState, useEffect } from "react";
import Modal from "@/components/Model";
import Button from "@/components/Button";

interface Annotation {
  uuid: string;
  uuid_rda: string;
  uuid_uri_type: string;
  title: string;
  notes: string;
  uri: string;
  dc_date: string;
  dc_description: string;
  dc_language: string;
  type: string;
  dc_type: string;
  fragment: string;
  source: string;
  uuid_link: string | null;
  alternateTitle: string | null;
  backupUri: string | null;
  uri2: string | null;
  backupUri2: string | null;
  pid_lod_type: string | null;
  pid_lod: string | null;
  card_url: string | null;
  interest_groups: {
    uuid_interestGroup: string;
    title: string;
    description: string;
    uuid_domain: string;
    domains: string;
    url: string;
    status: string;
    sub_status: string;
    relation: string;
  }[];
  working_groups: {
    uuid_working_group: string;
    title: string;
    description: string;
    uuid_domain: string;
    domains: string;
    url: string;
    backup_url: string;
    status: string;
    sub_status: string;
    relation: string;
  }[];
  pathways: {
    uuid_pathway: string;
    pathway: string;
    description: string;
    data_source: string;
    relation: string;
  }[];
  disciplines: {
    internal_identifier: string;
    uuid: string;
    list_item: string;
    description: string;
    description_source: string;
    taxonomy_parent: string;
    taxonomy_terms: string;
    uuid_parent: string;
    url: string;
  }[];
  gorc_elements: {
    uuid_element: string;
    element: string;
    description: string;
  }[];
  gorc_attributes: {
    uuid_attribute: string;
    attribute: string;
    description: string;
  }[];
  uri_type: any;
  keywords: {
    keyword: string;
    uuid_keyword: string;
  }[];
}

interface ElasticResponse {
  _id: string;
  _source: Annotation;
}

export default function Annotations() {
  const [annotations, setAnnotations] = useState<ElasticResponse[]>([]);
  const [selected, setSelected] = useState<ElasticResponse | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");

  useEffect(() => {
    async function getCurrentTabUrl() {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url);
      }
    }

    getCurrentTabUrl();
  }, []);

  useEffect(() => {
    if (!currentUrl) return;

    async function fetchAnnotationsForUrl() {
      console.log("fetchig");

      const response = await fetch(
        `https://elasticproxy.kubernetes.dansdemo.nl/rda/_search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            size: 1000,
            track_total_hits: true,
            query: {
              bool: {
                must: [
                  { term: { "source.keyword": "Annotation" } },
                  { term: { "uri.keyword": currentUrl } },
                ],
              },
            },
            sort: [{ dc_date: { order: "desc" } }],
          }),
        }
      );

      const data = await response.json();

      setAnnotations(data.hits.hits as ElasticResponse[]);
    }

    fetchAnnotationsForUrl();
  }, [currentUrl]);

  return (
    <>
      <Modal
        title={selected?._source.title || ""}
        open={!!selected}
        setOpen={() => setSelected(null)}
      >
        {selected && (
          <div className="text-sm mb-8 relative">
            <div className="sticky -top-2 z-10 bg-white pb-2 pt-4">
              <div className="text-base flex justify-between items-center">
                <span className="font-semibold">{selected._source.title}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-label="Close"
                  className="size-6 hover:text-rda-500 cursor-pointer"
                  onClick={() => setSelected(null)}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </div>

              <Button
                label="View in RDA Discovery Facility"
                href={"https://kb-rda.org/record/" + selected?._id}
                newTab={true}
                className="flex justify-center mt-4"
              />
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <span className="font-medium">Annotation:</span>
                <p className="mt-2 text-sm italic bg-gray-100 border border-gray-400 p-2 rounded-md">
                  {selected._source.fragment}
                </p>
              </div>

              <div>
                <span className="font-medium">Created on:</span>
                <p className="mt-2 text-sm italic bg-gray-100 border border-gray-400 p-2 rounded-md">
                  {selected._source.dc_date}
                </p>
              </div>

              <div>
                <span className="font-medium">Language:</span>
                <p className="mt-2 text-sm italic bg-gray-100 border border-gray-400 p-2 rounded-md">
                  {selected._source.dc_language}
                </p>
              </div>

              <div>
                <span className="font-medium">Type:</span>
                <p className="mt-2 text-sm italic bg-gray-100 border border-gray-400 p-2 rounded-md">
                  {selected._source.dc_type}
                </p>
              </div>

              {selected._source.notes && (
                <div>
                  <span className="font-medium">Notes:</span>
                  <p className="mt-2 text-sm italic bg-gray-100 border border-gray-400 p-2 rounded-md">
                    {selected._source.notes}
                  </p>
                </div>
              )}

              {selected._source.dc_description && (
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="mt-2 text-sm italic bg-gray-100 border border-gray-400 p-2 rounded-md">
                    {selected._source.dc_description}
                  </p>
                </div>
              )}
            </div>

            <p className="font-medium my-4">Vocabularies:</p>

            <div className="divide-y divide-gray-900/10">
              <Accordion
                question="Disciplines"
                answer={
                  <ul className="list-disc pl-6 space-y-1">
                    {selected._source.disciplines.map((discipline) => (
                      <li className="text-sm" key={discipline.uuid}>
                        {discipline.list_item}
                      </li>
                    ))}
                  </ul>
                }
              />
              <Accordion
                question="Pathways"
                answer={
                  <ul className="list-disc pl-6 space-y-1">
                    {selected._source.pathways.map((pathway) => (
                      <li className="text-sm" key={pathway.uuid_pathway}>
                        {pathway.pathway}
                      </li>
                    ))}
                  </ul>
                }
              />
              <Accordion
                question="Interest Groups"
                answer={
                  <ul className="list-disc pl-6 space-y-1">
                    {selected._source.interest_groups.map((group) => (
                      <li className="text-sm" key={group.uuid_domain}>
                        {group.title}
                      </li>
                    ))}
                  </ul>
                }
              />
              <Accordion
                question="Working Groups"
                answer={
                  <ul className="list-disc pl-6 space-y-1">
                    {selected._source.working_groups.map((group) => (
                      <li className="text-sm" key={group.uuid_domain}>
                        {group.title}
                      </li>
                    ))}
                  </ul>
                }
              />
              <Accordion
                question="GORC Elements"
                answer={
                  <ul className="list-disc pl-6 space-y-1">
                    {selected._source.gorc_elements.map((element) => (
                      <li className="text-sm" key={element.uuid_element}>
                        {element.element}
                      </li>
                    ))}
                  </ul>
                }
              />
              <Accordion
                question="GORC Attributes"
                answer={
                  <ul className="list-disc pl-6 space-y-1">
                    {selected._source.gorc_attributes.map((attribute) => (
                      <li className="text-sm" key={attribute.uuid_attribute}>
                        {attribute.attribute}
                      </li>
                    ))}
                  </ul>
                }
              />
              <Accordion
                question="Keywords"
                answer={
                  <ul className="list-disc pl-6 space-y-1">
                    {selected._source.keywords.map((keyword) => (
                      <li className="text-sm" key={keyword.uuid_keyword}>
                        {keyword.keyword}
                      </li>
                    ))}
                  </ul>
                }
              />
            </div>
          </div>
        )}
      </Modal>

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
                <span>@LaurensTobias</span>
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
