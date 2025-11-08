import Drawer from "@/components/Drawer";
import Button from "@/components/Button";
import Accordion from "@/components/Accordion";
import { AnnotationHit } from "@/types/elastic-search-document.interface";

interface AnnotationDrawerProps {
  annotation: AnnotationHit;
  setAnnotation: (annotation: AnnotationHit | null) => void;
}

export default function AnnotationDrawer({
  annotation,
  setAnnotation,
}: AnnotationDrawerProps) {
  return (
    <Drawer
      title={annotation._source.title || ""}
      open={!!annotation}
      setOpen={() => setAnnotation(null)}
    >
      <div className="px-4 py-6 sm:px-6">
        <div className="flex items-start justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {annotation._source.title}
          </h2>
          <div className="ml-3 flex h-7 items-center">
            <button
              type="button"
              onClick={() => setAnnotation(null)}
              className="relative rounded-md text-gray-400 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rda-600"
            >
              <span className="absolute -inset-2.5" />
              <span className="sr-only">Close panel</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <Button
          label="View in RDA Discovery Facility"
          href={
            import.meta.env.WXT_KNOWLEDGE_BASE_URL +
            "/record/" +
            annotation._id
          }
          newTab={true}
          className="flex justify-center mt-4"
        />
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-6">
        <div className="space-y-4 text-sm">
          <div>
            <span className="font-medium">Annotation:</span>
            <p className="mt-2 text-sm italic bg-gray-100 border border-gray-400 p-2 rounded-md">
              {annotation._source.fragment}
            </p>
          </div>

          <div>
            <span className="font-medium">Created on:</span>
            <p className="mt-2 text-sm italic bg-gray-100 border border-gray-400 p-2 rounded-md">
              {annotation._source.dc_date}
            </p>
          </div>

          <div>
            <span className="font-medium">Language:</span>
            <p className="mt-2 text-sm italic bg-gray-100 border border-gray-400 p-2 rounded-md">
              {annotation._source.dc_language}
            </p>
          </div>

          <div>
            <span className="font-medium">Type:</span>
            <p className="mt-2 text-sm italic bg-gray-100 border border-gray-400 p-2 rounded-md">
              {annotation._source.dc_type}
            </p>
          </div>

          {annotation._source.notes && (
            <div>
              <span className="font-medium">Notes:</span>
              <p className="mt-2 text-sm italic bg-gray-100 border border-gray-400 p-2 rounded-md">
                {annotation._source.notes}
              </p>
            </div>
          )}

          {annotation._source.dc_description && (
            <div>
              <span className="font-medium">Description:</span>
              <p className="mt-2 text-sm italic bg-gray-100 border border-gray-400 p-2 rounded-md">
                {annotation._source.dc_description}
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
                {annotation._source.disciplines.map((discipline) => (
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
                {annotation._source.pathways.map((pathway) => (
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
                {annotation._source.interest_groups.map((group) => (
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
                {annotation._source.working_groups.map((group) => (
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
                {annotation._source.gorc_elements.map((element) => (
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
                {annotation._source.gorc_attributes.map((attribute) => (
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
                {annotation._source.keywords.map((keyword) => (
                  <li className="text-sm" key={keyword.uuid_keyword}>
                    {keyword.keyword}
                  </li>
                ))}
              </ul>
            }
          />
        </div>
      </div>
    </Drawer>
  );
}
