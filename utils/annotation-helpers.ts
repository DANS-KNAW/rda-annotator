import type {
  AnnotationField,
  AnnotationSchema,
  ComboboxField,
} from '@/types/annotation-schema.interface'
import type { DataSource } from '@/types/datasource.interface'
import type { Annotation } from '@/types/elastic-search-document.interface'
import {
  annotationSchema,
  getElasticsearchFieldName,
} from '@/utils/schema-transformer'
import { transformVocabularyItem } from '@/utils/vocabulary-transformers'

/**
 * Normalized vocabulary item for consistent rendering
 */
export interface VocabularyItem {
  id: string
  label: string
  url?: string | null
  description?: string
  variant?: 'default' | 'custom'
}

/**
 * Normalized annotation interface with schema-aligned field names.
 */
interface NormalizedAnnotation {
  _id: string
  uuid: string
  submitter: string
  dc_date: string
  fragment?: any
  [fieldName: string]: string | VocabularyItem[] | any
}

/**
 * Convert DataSource to VocabularyItem with variant.
 */
function dataSourceToVocabularyItem(
  dataSource: DataSource,
  variant: 'default' | 'custom' = 'default',
): VocabularyItem {
  return {
    id: dataSource.value || '',
    label: dataSource.label || '',
    url: dataSource.secondarySearch,
    description: dataSource.description,
    variant,
  }
}

/**
 * Normalize vocabulary field data into consistent VocabularyItem array.
 */
function normalizeVocabularyField(
  annotation: Annotation,
  fieldConfig: ComboboxField,
): VocabularyItem[] {
  const dataFieldName = getElasticsearchFieldName(fieldConfig.name)
  const rawValue = (annotation as any)[dataFieldName]

  if (!rawValue)
    return []

  const variant
    = fieldConfig.displaySection === 'additional_vocabularies'
      ? 'custom'
      : 'default'

  // Handle simple string values (like dc_language, dc_type)
  if (typeof rawValue === 'string') {
    return [
      {
        id: rawValue,
        label: rawValue,
        variant,
      },
    ]
  }

  const items = Array.isArray(rawValue) ? rawValue : [rawValue]

  // Transform each item using the shared transformer
  return items.map((item) => {
    const dataSource = transformVocabularyItem(item, fieldConfig.vocabulary)
    return dataSourceToVocabularyItem(dataSource, variant)
  })
}

/**
 * Normalize simple (text/textarea) field data.
 */
function normalizeSimpleField(
  annotation: Annotation,
  fieldConfig: AnnotationField,
): any {
  const dataFieldName = getElasticsearchFieldName(fieldConfig.name)
  return (annotation as any)[dataFieldName]
}

/**
 * Normalize an Elasticsearch annotation document to schema-aligned format.
 */
export function normalizeAnnotation(
  annotation: Annotation,
): NormalizedAnnotation {
  const normalized: NormalizedAnnotation = {
    _id: annotation.uuid,
    uuid: annotation.uuid,
    submitter: annotation.submitter,
    dc_date: annotation.dc_date,
  }

  // Process each field defined in the schema
  annotationSchema.fields.forEach((field) => {
    if (field.type === 'combobox') {
      // Vocabulary fields → VocabularyItem[]
      normalized[field.name] = normalizeVocabularyField(annotation, field)
    }
    else {
      // Simple fields → raw value
      normalized[field.name] = normalizeSimpleField(annotation, field)
    }
  })

  // Preserve fragment for text highlighting
  if (annotation.fragment) {
    normalized.fragment = annotation.fragment
  }

  return normalized
}

/**
 * Check if vocabulary field is empty.
 */
function isVocabularyFieldEmpty(
  normalized: NormalizedAnnotation,
  fieldName: string,
): boolean {
  const data = normalized[fieldName]
  return !Array.isArray(data) || data.length === 0
}

/**
 * Get count of items in vocabulary field.
 */
function getVocabularyFieldCount(
  normalized: NormalizedAnnotation,
  fieldName: string,
): number {
  const data = normalized[fieldName]
  return Array.isArray(data) ? data.length : 0
}

/**
 * Get all fields for a specific display section.
 */
export function getFieldsBySection(
  schema: AnnotationSchema,
  section: 'basic' | 'rda_vocabularies' | 'additional_vocabularies',
): ComboboxField[] {
  return schema.fields.filter(
    (field): field is ComboboxField =>
      field.type === 'combobox'
      && (field as ComboboxField).displaySection === section,
  )
}

/**
 * Check if entire section is empty.
 */
export function isSectionEmpty(
  normalized: NormalizedAnnotation,
  schema: AnnotationSchema,
  section: 'basic' | 'rda_vocabularies' | 'additional_vocabularies',
): boolean {
  const fields = getFieldsBySection(schema, section)
  return fields.every(field =>
    isVocabularyFieldEmpty(normalized, field.name),
  )
}

/**
 * Get total count across all fields in section.
 */
export function getSectionItemCount(
  normalized: NormalizedAnnotation,
  schema: AnnotationSchema,
  section: 'basic' | 'rda_vocabularies' | 'additional_vocabularies',
): number {
  const fields = getFieldsBySection(schema, section)
  return fields.reduce(
    (total, field) => total + getVocabularyFieldCount(normalized, field.name),
    0,
  )
}

/**
 * Validates if a URL string is valid.
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === '')
    return false
  try {
    const _parsed = new URL(url)
    return !!_parsed
  }
  catch {
    return false
  }
}

/**
 * Vocabulary count for display in annotation cards.
 */
export interface VocabularyCount {
  fieldName: string
  label: string
  count: number
}

/**
 * Get vocabulary counts for an annotation.
 * Returns array of {fieldName, label, count} for non-empty vocabulary fields.
 */
export function getVocabularyCounts(
  annotation: Annotation,
  schema: AnnotationSchema,
): VocabularyCount[] {
  const counts: VocabularyCount[] = []

  // Iterate through all combobox fields with multiple=true
  schema.fields.forEach((field) => {
    if (field.type === 'combobox' && field.multiple) {
      const dataFieldName = getElasticsearchFieldName(field.name)
      const rawValue = (annotation as any)[dataFieldName]

      if (rawValue && Array.isArray(rawValue) && rawValue.length > 0) {
        counts.push({
          fieldName: field.name,
          label: field.label,
          count: rawValue.length,
        })
      }
    }
  })

  return counts
}
