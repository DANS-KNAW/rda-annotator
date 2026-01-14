import type { DataSource } from '@/types/datasource.interface'

/**
 * Transform vocabulary items from Elasticsearch format to DataSource format.
 * Each vocabulary type in Elasticsearch has different field names for ID, label, description, etc.
 * This function normalizes them into a consistent DataSource structure.
 *
 * @param item - The vocabulary item from Elasticsearch
 * @param vocabularyType - The type of vocabulary (namespace string or 'open_vocabularies')
 * @returns A normalized DataSource object
 */
export function transformVocabularyItem(
  item: any,
  vocabularyType: string,
): DataSource {
  if (!item) {
    return { label: '', value: '' }
  }

  // Handle different vocabulary structures based on namespace
  switch (vocabularyType) {
    case 'rda_interest_groups':
    case 'interest_groups':
      return {
        label: item.title || '',
        value: item.uuid_interestGroup || item.uuid || '',
        secondarySearch: item.url || undefined,
        description: item.description || undefined,
      }

    case 'rda_working_groups':
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

    case 'rda_keywords':
    case 'keywords':
      return {
        label: item.keyword || item.title || '',
        value: item.uuid_keyword || item.uuid || '',
      }

    case 'rda_resource_types':
    case 'resource_types':
      return {
        label: item.uri_type || item.title || item.label || '',
        value: item.uuid_uri_type || item.uuid || item.value || '',
        description: item.description || undefined,
      }

    case 'iso-639':
    case 'languages':
      return {
        label: item.label || item.title || '',
        value: item.value || item.code || '',
        description: item.description || undefined,
      }

    case 'open_vocabularies':
    case 'momsi':
    default:
      // For custom vocabularies or fallback
      return {
        label: item.value || item.label || item.title || item.name || '',
        value: item.uuid || item.id || item.value || '',
        secondarySearch: item.value_uri || item.url || undefined,
        description: item.description || undefined,
      }
  }
}
