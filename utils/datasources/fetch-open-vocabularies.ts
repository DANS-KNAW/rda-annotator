import type { DataSource } from '@/types/datasource.interface'
import { sendMessage } from '@/utils/messaging'

interface FetchVocabulariesOptions {
  subject_scheme?: string
  scheme_uri?: string
  value_scheme?: string
  value_uri?: string
  namespace?: string
  amount?: number
  offset?: number
  deleted?: boolean
}

/**
 * Fetch open vocabularies from the API
 * Routes through background service worker to bypass CORS/Brave Shields
 *
 * @param options - Filter options for the vocabulary query
 * @returns Array of DataSource objects representing vocabularies
 */
export default async function fetchOpenVocabularies(
  options: FetchVocabulariesOptions = {},
): Promise<DataSource[]> {
  try {
    return await sendMessage('fetchVocabularies', options)
  }
  catch (error) {
    console.error('Error fetching open vocabularies:', error)
    throw error
  }
}
