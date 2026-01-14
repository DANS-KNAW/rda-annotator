import type { VocabularyOptions } from '@/types/annotation-schema.interface'
import type { DataSource, PredefinedDataSource } from '@/types/datasource.interface'
import { useCallback, useEffect, useRef, useState } from 'react'
import fetchOpenVocabularies from '@/utils/datasources/fetch-open-vocabularies'

const PAGE_SIZE = 50

interface UseDataSourceReturn {
  data: DataSource[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  search: (query: string) => void
  searchQuery: string
}

export default function useDataSource(
  datasource: PredefinedDataSource | DataSource[],
  options?: VocabularyOptions,
): UseDataSourceReturn {
  const [data, setData] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const offsetRef = useRef(0)

  // Load initial data or search results
  const loadData = useCallback(async (query: string = '', reset: boolean = true) => {
    if (Array.isArray(datasource)) {
      setData(datasource)
      setHasMore(false)
      return
    }

    if (datasource !== 'open_vocabularies') {
      setError(`Unknown datasource: ${datasource}`)
      return
    }

    try {
      if (reset) {
        setLoading(true)
        offsetRef.current = 0
      }
      setError(null)

      const currentOffset = reset ? 0 : offsetRef.current
      const fetchOptions: VocabularyOptions & { value_scheme?: string, offset?: number, amount?: number } = {
        ...options,
        amount: PAGE_SIZE,
        // Only include offset if > 0 (API validation requires positive number)
        ...(currentOffset > 0 && { offset: currentOffset }),
      }

      // Add search filter if query provided
      if (query.trim()) {
        fetchOptions.value_scheme = query.trim()
      }

      const result = await fetchOpenVocabularies(fetchOptions)

      if (reset) {
        setData(result)
        offsetRef.current = result.length
      }
      else {
        setData(prev => [...prev, ...result])
        offsetRef.current += result.length
      }

      // If we got fewer than PAGE_SIZE results, there's no more data
      setHasMore(result.length >= PAGE_SIZE)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      if (reset) {
        setData([])
      }
      setHasMore(false)
    }
    finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [datasource, options])

  // Load more data (pagination)
  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore || Array.isArray(datasource)) {
      return
    }

    setLoadingMore(true)
    await loadData(searchQuery, false)
  }, [loadingMore, loading, hasMore, datasource, loadData, searchQuery])

  // Search function - resets and loads with query
  const search = useCallback((query: string) => {
    setSearchQuery(query)
    loadData(query, true)
  }, [loadData])

  // Initial load
  useEffect(() => {
    loadData('', true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasource, JSON.stringify(options)])

  return {
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    search,
    searchQuery,
  }
}
