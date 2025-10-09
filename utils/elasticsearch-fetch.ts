import { ElasticsearchResponse } from "@/types/elastic-search-document.interface";
import type { estypes } from "@elastic/elasticsearch";

type ElasticsearchFetchOptions = Omit<Partial<estypes.SearchRequest>, "index">;

/**
 * Fetch data from Elasticsearch
 *
 * @param options - Configuration options for the Elasticsearch query
 * @returns Elasticsearch response with typed hits
 */
export async function elasticsearchFetch(
  options: ElasticsearchFetchOptions = {}
): Promise<ElasticsearchResponse> {
  const searchRequest: estypes.SearchRequest = {
    index: "rda",
    size: 1000,
    track_total_hits: true,
    ...options, // Spread ALL options, not just query
  };

  const response = await fetch(
    `${import.meta.env.WXT_API_ENDPOINT}/knowledge-base/rda/_search`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(searchRequest),
    }
  );

  if (!response.ok) {
    throw new Error(`Elasticsearch request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search for annotations by URL
 *
 * @param url - The URL to search for
 * @returns Elasticsearch response with annotation data
 */
export async function searchAnnotationsByUrl(
  url: string
): Promise<ElasticsearchResponse> {
  return elasticsearchFetch({
    query: {
      bool: {
        must: [
          { term: { "resource_source.keyword": "Annotation" } },
          { term: { "uri.keyword": url } },
        ],
      },
    },
    sort: [{ dc_date: { order: "desc" } }],
  });
}

/**
 * Search for annotations by submitter UUID
 *
 * @param submitterUuid - The submitter's UUID
 * @param oldSubmitterUuid - Optional old submitter UUID to also search
 * @returns Elasticsearch response with annotation data
 */
export async function searchAnnotationsBySubmitter(
  submitterUuid: string,
  oldSubmitterUuid?: string
): Promise<ElasticsearchResponse> {
  const submitterQuery = oldSubmitterUuid
    ? {
        bool: {
          should: [
            { term: { "submitter.keyword": submitterUuid } },
            { term: { "submitter.keyword": oldSubmitterUuid } },
          ],
          minimum_should_match: 1,
        },
      }
    : { term: { "submitter.keyword": submitterUuid } };

  return elasticsearchFetch({
    query: {
      bool: {
        must: [
          { term: { "resource_source.keyword": "Annotation" } },
          submitterQuery,
        ],
      },
    },
    sort: [{ dc_date: { order: "desc" } }],
  });
}
