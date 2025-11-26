import { useMemo } from "react";
import Drawer from "@/components/Drawer";
import Button from "@/components/Button";
import CollapsibleSection from "@/components/CollapsibleSection";
import FieldDisplay from "@/components/FieldDisplay";
import VocabularyList from "@/components/VocabularyList";
import { AnnotationHit } from "@/types/elastic-search-document.interface";
import {
  isSectionEmpty,
  getSectionItemCount,
  getFieldsBySection,
  normalizeAnnotation,
  type VocabularyItem,
} from "@/utils/annotation-helpers";
import schemaData from "@/assets/schema.json";
import type {
  AnnotationSchema,
  AnnotationField,
} from "@/types/annotation-schema.interface";

const annotationSchema = schemaData as AnnotationSchema;

interface AnnotationDrawerProps {
  annotation: AnnotationHit;
  setAnnotation: (annotation: AnnotationHit | null) => void;
}

export default function AnnotationDrawer({
  annotation,
  setAnnotation,
}: AnnotationDrawerProps) {
  const source = annotation._source;

  const normalized = useMemo(() => normalizeAnnotation(source), [source]);

  // Helper to render individual field based on type
  const renderField = (field: AnnotationField) => {
    if (field.type === "combobox") {
      const items = normalized[field.name] as VocabularyItem[];

      // Render as text field if not a multiple-select field
      if (!field.multiple) {
        const value = items.length > 0 ? items[0].label : null;
        return (
          <FieldDisplay
            key={field.name}
            label={field.label}
            value={value}
          />
        );
      }

      // Render as vocabulary list with badges for multiple-select fields
      return (
        <VocabularyList key={field.name} label={field.label} items={items} />
      );
    } else {
      // Text or textarea field
      const value = normalized[field.name];
      return (
        <FieldDisplay key={field.name} label={field.label} value={value} />
      );
    }
  };

  const basicFields = annotationSchema.fields.filter((f) => {
    if (f.name === "title") return false;
    if (f.type === "text" || f.type === "textarea") return true;
    if (f.type === "combobox") {
      return !f.displaySection || f.displaySection === "basic";
    }

    return false;
  });
  const rdaVocabFields = getFieldsBySection(
    annotationSchema,
    "rda_vocabularies"
  );
  const additionalVocabFields = getFieldsBySection(
    annotationSchema,
    "additional_vocabularies"
  );

  const isVocabEmpty = isSectionEmpty(
    normalized,
    annotationSchema,
    "rda_vocabularies"
  );
  const isAdditionalEmpty = isSectionEmpty(
    normalized,
    annotationSchema,
    "additional_vocabularies"
  );
  const vocabCount = getSectionItemCount(
    normalized,
    annotationSchema,
    "rda_vocabularies"
  );
  const additionalCount = getSectionItemCount(
    normalized,
    annotationSchema,
    "additional_vocabularies"
  );

  return (
    <Drawer
      title={source.title || "Annotation Details"}
      open={!!annotation}
      setOpen={() => setAnnotation(null)}
    >
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-900">
            {source.title || "Annotation Details"}
          </h2>
          <button
            onClick={() => setAnnotation(null)}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
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

        <Button
          label="View in RDA Discovery Facility"
          href={
            import.meta.env.WXT_KNOWLEDGE_BASE_URL + "/record/" + annotation._id
          }
          newTab={true}
          className="flex justify-center"
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-12">
        <div className="px-4 py-4 space-y-3 border-b border-gray-200 bg-white">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Basic Information
          </h3>

          {source.fragment && (
            <FieldDisplay
              label="Selected Text"
              value={source.fragment}
              variant="quote"
            />
          )}

          <FieldDisplay label="Created on" value={source.dc_date} />

          {basicFields.map(renderField)}
        </div>

        <CollapsibleSection
          title="RDA Vocabularies"
          isEmpty={isVocabEmpty}
          defaultOpen={!isVocabEmpty}
          itemCount={vocabCount > 0 ? vocabCount : undefined}
        >
          {rdaVocabFields.map(renderField)}
        </CollapsibleSection>

        <CollapsibleSection
          title="Additional Vocabularies"
          isEmpty={isAdditionalEmpty}
          defaultOpen={!isAdditionalEmpty}
          itemCount={additionalCount > 0 ? additionalCount : undefined}
        >
          {additionalVocabFields.map(renderField)}
        </CollapsibleSection>
      </div>
    </Drawer>
  );
}
