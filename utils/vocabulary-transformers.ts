import type {
  DataSource,
  PredefinedDataSource,
} from '@/types/datasource.interface'

/**
 * Transform vocabulary items from Elasticsearch format to DataSource format.
 * Each vocabulary type in Elasticsearch has different field names for ID, label, description, etc.
 * This function normalizes them into a consistent DataSource structure.
 *
 * @param item - The vocabulary item from Elasticsearch
 * @param vocabularyType - The type of vocabulary
 * @returns A normalized DataSource object
 */
export function transformVocabularyItem(
  item: any,
  vocabularyType: PredefinedDataSource,
): DataSource {
  if (!item) {
    return { label: '', value: '' }
  }

  // Handle different vocabulary structures
  switch (vocabularyType) {
    case 'interest_groups':
      return {
        label: item.title || '',
        value: item.uuid_interestGroup || item.uuid || '',
        secondarySearch: item.url || undefined,
        description: item.description || undefined,
      }

    case 'working_groups':
      return {
        label: item.title || '',
        value: item.uuid_working_group || item.uuid || '',
        secondarySearch: item.url || item.backup_url || undefined,
        description: item.description || undefined,
      }

    case 'rda_pathways':
      return {
        label: item.pathway || item.title || '',
        value: item.uuid_pathway || item.uuid || '',
        description: item.description || undefined,
      }

    case 'disciplines':
      return {
        label: item.list_item || item.title || '',
        value: item.uuid || '',
        secondarySearch: item.url || undefined,
        description: item.description || undefined,
      }

    case 'gorc_elements':
      return {
        label: item.element || item.title || '',
        value: item.uuid_element || item.uuid || '',
        description: item.description || undefined,
      }

    case 'gorc_attributes':
      return {
        label: item.attribute || item.title || '',
        value: item.uuid_attribute || item.uuid || '',
        description: item.description || undefined,
      }

    case 'keywords':
      return {
        label: item.keyword || item.title || '',
        value: item.uuid_keyword || item.uuid || '',
      }

    case 'resource_types':
      return {
        label: item.uri_type || item.title || item.label || '',
        value: item.uuid_uri_type || item.uuid || item.value || '',
        description: item.description || undefined,
      }

    case 'languages':
      return {
        label: item.label || item.title || '',
        value: item.value || item.code || '',
        description: item.description || undefined,
      }

    case 'open_vocabularies':
      // For custom vocabularies like MOMSI
      return {
        label: item.value || item.label || '',
        value: item.uuid || '',
        secondarySearch: item.value_uri || undefined,
        description: item.description || undefined,
      }

    default:
      // Fallback: try to extract common fields
      return {
        label: item.title || item.label || item.name || '',
        value: item.uuid || item.id || item.value || '',
        secondarySearch: item.url || undefined,
        description: item.description || undefined,
      }
  }
}
