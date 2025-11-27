import { AnnotationHit } from "@/types/elastic-search-document.interface";
import OrcidLink from "@/components/OrcidLink";
import { getVocabularyCounts } from "@/utils/annotation-helpers";
import schemaData from "@/assets/schema.json";
import type { AnnotationSchema } from "@/types/annotation-schema.interface";

const annotationSchema = schemaData as AnnotationSchema;

interface AnnotationCardProps {
  annotation: AnnotationHit;
  isOrphaned?: boolean;
  isPending?: boolean;
  isHovered?: boolean;
  onClick: () => void;
}

export default function AnnotationCard({
  annotation,
  isOrphaned = false,
  isPending = false,
  isHovered = false,
  onClick,
}: AnnotationCardProps) {
  const source = annotation._source;
  const vocabularyCounts = getVocabularyCounts(source, annotationSchema);

  const baseClasses = "bg-white p-2 rounded-md shadow cursor-pointer min-h-14";

  const hoverClass = isHovered
    ? "bg-rda-50 ring-2 ring-rda-400"
    : "hover:bg-rda-50";

  // Pending uses blue, orphaned uses amber
  const statusClass = isPending
    ? "border-2 border-blue-400 bg-blue-50"
    : isOrphaned
    ? "border-2 border-amber-400 bg-amber-50"
    : "";

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${hoverClass} ${statusClass}`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-900">{source.dc_date}</span>
        {source.submitter && (
          <OrcidLink textSize="xs" orcidId={source.submitter} />
        )}
      </div>

      {source.fragment && (
        <p className="text-gray-600 line-clamp-3 bg-gray-100 p-2 rounded-md mb-2 text-sm">
          {source.fragment}
        </p>
      )}

      {vocabularyCounts.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {vocabularyCounts.map((vocab) => (
            <span
              key={vocab.fieldName}
              className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium"
            >
              {vocab.count} {vocab.label}
            </span>
          ))}
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-1 mt-2 text-blue-700 text-xs font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 animate-spin"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          <span>Loading...</span>
        </div>
      )}

      {isOrphaned && !isPending && (
        <div className="flex items-center gap-1 mt-2 text-amber-700 text-xs font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <span>Orphaned Annotation</span>
        </div>
      )}
    </div>
  );
}
