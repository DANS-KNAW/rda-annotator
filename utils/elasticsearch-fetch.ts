import { ElasticsearchResponse } from "@/types/elastic-search-document.interface";
import { sendMessage } from "@/utils/messaging";

/**
 * Search for annotations by URL(s)
 * Routes through background service worker to bypass CORS/Brave Shields
 *
 * @param urls - The URL or array of URLs to search for annotations
 * @returns Elasticsearch response with annotation data
 */
export async function searchAnnotationsByUrl(
  urls: string | string[]
): Promise<ElasticsearchResponse> {
  return sendMessage("searchAnnotations", {
    type: "byUrl",
    urls,
  });
}

/**
 * Search for annotations by submitter UUID
 * Routes through background service worker to bypass CORS/Brave Shields
 *
 * @param submitterUuid - The submitter's UUID
 * @param oldSubmitterUuid - Optional old submitter UUID to also search
 * @returns Elasticsearch response with annotation data
 */
export async function searchAnnotationsBySubmitter(
  submitterUuid: string,
  oldSubmitterUuid?: string
): Promise<ElasticsearchResponse> {
  return sendMessage("searchAnnotations", {
    type: "bySubmitter",
    submitterUuid,
    oldSubmitterUuid,
  });
}
