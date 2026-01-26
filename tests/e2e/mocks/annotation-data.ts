/**
 * Mock annotation data factories for E2E tests.
 * Provides realistic annotation objects matching Elasticsearch response format.
 */

import type {
  Annotation,
  AnnotationHit,
  ElasticsearchResponse,
} from '@/types/elastic-search-document.interface'

/**
 * Create a mock annotation with default values and optional overrides
 */
export function createMockAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  const now = new Date().toISOString()
  const uuid = `mock-uuid-${Date.now()}-${Math.random().toString(36).substring(7)}`

  return {
    uuid,
    uuid_link: null,
    uuid_rda: `rda-${uuid}`,
    title: 'Test Annotation',
    alternateTitle: null,
    uri: 'https://example.com',
    backupUri: null,
    uri2: null,
    backupUri2: null,
    pid_lod_type: null,
    pid_lod: null,
    dc_date: now,
    dc_description: 'Test description',
    dc_language: 'eng',
    type: 'Annotation',
    dc_type: 'Other',
    card_url: null,
    resource_source: 'Annotation',
    fragment: 'Example Domain',
    annotation_target: {
      source: 'https://example.com',
      selector: [
        {
          type: 'TextQuoteSelector',
          exact: 'Example Domain',
          prefix: '',
          suffix: '\n\nThis domain is for use in illustrative',
        },
        {
          type: 'TextPositionSelector',
          start: 0,
          end: 14,
        },
        {
          type: 'RangeSelector',
          startContainer: '/html[1]/body[1]/div[1]/h1[1]/text()[1]',
          startOffset: 0,
          endContainer: '/html[1]/body[1]/div[1]/h1[1]/text()[1]',
          endOffset: 14,
        },
      ],
    },
    uuid_uri_type: null,
    notes: null,
    last_update: null,
    pathway: null,
    pathway_uuid: null,
    group_name: null,
    group_uuid: null,
    changed: null,
    submitter: '0000-0002-1825-0097', // Mock ORCID
    interest_groups: [],
    working_groups: [],
    pathways: [],
    disciplines: [],
    gorc_elements: [],
    gorc_attributes: [],
    uri_type: [],
    keywords: [],
    ...overrides,
  }
}

/**
 * Create a mock annotation hit (Elasticsearch document wrapper)
 */
export function createMockAnnotationHit(annotation: Annotation): AnnotationHit {
  return {
    _index: 'rda',
    _id: annotation.uuid,
    _score: 1.0,
    _source: annotation,
  }
}

/**
 * Create a mock Elasticsearch search response
 */
export function createMockSearchResponse(annotations: Annotation[]): ElasticsearchResponse {
  return {
    took: 5,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: annotations.length,
        relation: 'eq',
      },
      max_score: annotations.length > 0 ? 1.0 : null,
      hits: annotations.map(createMockAnnotationHit),
    },
  }
}

/**
 * Create a mock successful create annotation response
 */
export function createMockCreateResponse(annotation: Partial<Annotation> & { id?: string }) {
  return {
    id: annotation.id || `mock-${Date.now()}`,
    uuid: annotation.uuid || `mock-uuid-${Date.now()}`,
    created: new Date().toISOString(),
    ...annotation,
  }
}

/**
 * Create a mock error response
 */
export function createMockErrorResponse(message: string, statusCode: number = 400) {
  return {
    statusCode,
    message,
    error: statusCode === 400 ? 'Bad Request' : statusCode === 500 ? 'Internal Server Error' : 'Error',
  }
}

/**
 * Transform form submission data into annotation format for search response
 * This simulates what the backend does when creating an annotation
 */
export function formDataToAnnotation(formData: Record<string, unknown>): Annotation {
  const now = new Date().toISOString()
  const uuid = `mock-uuid-${Date.now()}`

  return createMockAnnotation({
    uuid,
    title: formData.title as string || 'Untitled',
    dc_description: formData.description as string || '',
    dc_language: typeof formData.language === 'object'
      ? (formData.language as { value: string }).value
      : formData.language as string || 'eng',
    dc_type: typeof formData.resource_type === 'object'
      ? (formData.resource_type as { label: string }).label
      : formData.resource_type as string || 'Other',
    fragment: formData.selectedText as string || '',
    uri: formData.resource as string || 'https://example.com',
    notes: formData.notes as string || null,
    dc_date: now,
    submitter: formData.submitter as string || '0000-0002-1825-0097',
    annotation_target: formData.target as Annotation['annotation_target'],
    keywords: Array.isArray(formData.keywords)
      ? formData.keywords.map((k: { label: string, value: string }) => ({
          uuid_keyword: k.value,
          keyword: k.label,
        }))
      : [],
    pathways: Array.isArray(formData.pathways)
      ? formData.pathways.map((p: { label: string, value: string }) => ({
          uuid_pathway: p.value,
          pathway: p.label,
          description: '',
          data_source: '',
          relation: '',
        }))
      : [],
    gorc_elements: Array.isArray(formData.gorc_elements)
      ? formData.gorc_elements.map((e: { label: string, value: string }) => ({
          uuid_element: e.value,
          element: e.label,
          description: '',
        }))
      : [],
    gorc_attributes: Array.isArray(formData.gorc_attributes)
      ? formData.gorc_attributes.map((a: { label: string, value: string }) => ({
          uuid_attribute: a.value,
          attribute: a.label,
          description: '',
        }))
      : [],
    disciplines: Array.isArray(formData.disciplines)
      ? formData.disciplines.map((d: { label: string, value: string }) => ({
          internal_identifier: d.value,
          uuid: d.value,
          list_item: d.label,
          description: '',
          description_source: '',
          taxonomy_parent: '',
          taxonomy_terms: '',
          uuid_parent: '',
          url: '',
        }))
      : [],
    interest_groups: Array.isArray(formData.interest_groups)
      ? formData.interest_groups.map((ig: { label: string, value: string }) => ({
          uuid_interestGroup: ig.value,
          title: ig.label,
          description: '',
          uuid_domain: '',
          domains: '',
          url: '',
          status: '',
          sub_status: '',
          last_update: null,
          relation: '',
        }))
      : [],
    working_groups: Array.isArray(formData.working_groups)
      ? formData.working_groups.map((wg: { label: string, value: string }) => ({
          uuid_working_group: wg.value,
          title: wg.label,
          description: '',
          uuid_domain: '',
          domains: '',
          url: '',
          backup_url: '',
          status: '',
          sub_status: '',
          last_update: null,
          relation: '',
        }))
      : [],
    // Map MOMSI from open_vocabularies to custom_vocabularies (Elasticsearch format)
    // Schema transformer maps "momsi" → "custom_vocabularies"
    custom_vocabularies: (formData.open_vocabularies as any)?.momsi
      ? (formData.open_vocabularies as any).momsi.map((item: { label: string, value: string }) => ({
          uuid: item.value,
          namespace: 'momsi',
          value: item.label,
          value_uri: null,
        }))
      : [],
  })
}
