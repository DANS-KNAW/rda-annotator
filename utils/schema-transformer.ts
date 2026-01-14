/**
 * THIS SHOULD BE CHANGED ON THE ELASTIC AND API SIDE!!!
 *
 * The issue is the manner we store the annotations is different then the schema we used to
 * configure this extension. The annotations should be stored in elastic search with additional
 * properties that give more context allowing us to completely remove this file!~
 *
 *
 * Schema Transformer
 *
 * Provides bidirectional mapping between schema.json field names and Elasticsearch field names.
 * This eliminates hardcoded mappings throughout the codebase.
 *
 * ## How to Add New Field Mappings
 *
 * 1. Add a new entry to the FIELD_MAPPINGS array below:
 *
 *    ```typescript
 *    { schemaField: "my_field", elasticsearchField: "es_my_field", type: "simple" }
 *    ```
 *
 * 2. Field types:
 *    - "simple": Text, textarea, or single-value fields (string, number, etc.)
 *    - "vocabulary": Array fields containing vocabulary objects
 *    - "nested": Complex nested objects requiring custom transformation
 *
 * 3. Custom transformers (optional):
 *    Add a transformer property if the field needs special conversion logic:
 *
 *    ```typescript
 *    {
 *      schemaField: "my_field",
 *      elasticsearchField: "es_my_field",
 *      type: "simple",
 *      transformer: {
 *        toES: (value) => value.toUpperCase(), // Schema → ES
 *        fromES: (value) => value.toLowerCase() // ES → Schema
 *      }
 *    }
 *    ```
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Get Elasticsearch field name from schema field name
 * const esField = getElasticsearchFieldName("description"); // Returns "dc_description"
 *
 * // Get schema field name from Elasticsearch field name
 * const schemaField = getSchemaFieldName("dc_description"); // Returns "description"
 *
 * // Transform entire annotation from ES to schema format
 * const schemaData = transformAnnotationFromElasticsearch(esAnnotation);
 *
 * // Transform data from schema to ES format
 * const esData = transformAnnotationToElasticsearch(schemaData);
 * ```
 */

import type { AnnotationSchema } from '@/types/annotation-schema.interface'
import schema from '@/assets/schema.json'

const annotationSchema = schema as AnnotationSchema

/**
 * Field mapping configuration between schema and Elasticsearch
 */
interface FieldMapping {
  schemaField: string
  elasticsearchField: string
  type: 'simple' | 'vocabulary' | 'nested'
  transformer?: {
    toES?: (value: any) => any
    fromES?: (value: any) => any
  }
}

/**
 * Define the bidirectional mapping between schema fields and Elasticsearch fields.
 * This eliminates hardcoded mappings throughout the codebase.
 */
const FIELD_MAPPINGS: FieldMapping[] = [
  // Simple field mappings (different names)
  {
    schemaField: 'description',
    elasticsearchField: 'dc_description',
    type: 'simple',
  },
  {
    schemaField: 'language',
    elasticsearchField: 'dc_language',
    type: 'simple',
  },
  { schemaField: 'resource', elasticsearchField: 'uri', type: 'simple' },
  {
    schemaField: 'resource_type',
    elasticsearchField: 'dc_type',
    type: 'simple',
  },

  // Direct mappings (same name in schema and ES)
  { schemaField: 'title', elasticsearchField: 'title', type: 'simple' },
  { schemaField: 'notes', elasticsearchField: 'notes', type: 'simple' },

  // Vocabulary field mappings (arrays of objects)
  {
    schemaField: 'keywords',
    elasticsearchField: 'keywords',
    type: 'vocabulary',
  },
  {
    schemaField: 'pathways',
    elasticsearchField: 'pathways',
    type: 'vocabulary',
  },
  {
    schemaField: 'gorc_elements',
    elasticsearchField: 'gorc_elements',
    type: 'vocabulary',
  },
  {
    schemaField: 'gorc_attributes',
    elasticsearchField: 'gorc_attributes',
    type: 'vocabulary',
  },
  {
    schemaField: 'interest_groups',
    elasticsearchField: 'interest_groups',
    type: 'vocabulary',
  },
  {
    schemaField: 'working_groups',
    elasticsearchField: 'working_groups',
    type: 'vocabulary',
  },
  {
    schemaField: 'disciplines',
    elasticsearchField: 'disciplines',
    type: 'vocabulary',
  },

  // Custom vocabularies (special handling for namespaced vocabularies like MOMSI)
  {
    schemaField: 'momsi',
    elasticsearchField: 'custom_vocabularies',
    type: 'nested',
  },
]

/**
 * Build a map from schema field names to Elasticsearch field names
 */
const schemaToESMap = new Map<string, FieldMapping>(
  FIELD_MAPPINGS.map(mapping => [mapping.schemaField, mapping]),
)

/**
 * Get the Elasticsearch field name for a schema field.
 * @param schemaFieldName - The field name from schema.json
 * @returns The corresponding Elasticsearch field name
 */
export function getElasticsearchFieldName(schemaFieldName: string): string {
  const mapping = schemaToESMap.get(schemaFieldName)
  return mapping ? mapping.elasticsearchField : schemaFieldName
}

/**
 * Export the schema for use in other modules
 */
export { annotationSchema }
