import type { VocabularyOptions } from '@/types/annotation-schema.interface'
import type { DataSource, PredefinedDataSource } from '@/types/datasource.interface'
import fetchDisciplines from '@/utils/datasources/fetch-disciplines'
import fetchGORCAttributes from '@/utils/datasources/fetch-gorc-attributes'
import fetchGORCElements from '@/utils/datasources/fetch-gorc-elements'
import fetchInterestGroups from '@/utils/datasources/fetch-interest-groups'
import fetchKeywords from '@/utils/datasources/fetch-keywords'
import fetchLanguages from '@/utils/datasources/fetch-languages'
import fetchOpenVocabularies from '@/utils/datasources/fetch-open-vocabularies'
import fetchRDAPathways from '@/utils/datasources/fetch-rda-pathways'
import fetchResourceTypes from '@/utils/datasources/fetch-resource-types'
import fetchWorkingGroups from '@/utils/datasources/fetch-working-groups'

export default function useDataSource(
  datasource: PredefinedDataSource | DataSource[],
  options?: VocabularyOptions,
) {
  const [data, setData] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        if (Array.isArray(datasource)) {
          setData(datasource)
          setLoading(false)
          return
        }

        let result: DataSource[] = []

        switch (datasource) {
          case 'languages':
            result = await fetchLanguages()
            break

          case 'resource_types':
            result = await fetchResourceTypes()
            break

          case 'rda_pathways':
            result = await fetchRDAPathways()
            break

          case 'working_groups':
            result = await fetchWorkingGroups()
            break

          case 'interest_groups':
            result = await fetchInterestGroups()
            break

          case 'disciplines':
            result = await fetchDisciplines()
            break

          case 'gorc_elements':
            result = await fetchGORCElements()
            break

          case 'gorc_attributes':
            result = await fetchGORCAttributes()
            break

          case 'keywords':
            result = await fetchKeywords()
            break
          case 'open_vocabularies':
            result = await fetchOpenVocabularies(options || {})
            break
          default:
            throw new Error(`Unknown datasource: ${datasource}`)
        }

        setData(result)
      }
      catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
        setData([])
      }
      finally {
        setLoading(false)
      }
    }

    loadData()
  }, [datasource, JSON.stringify(options)])

  return { data, loading, error }
}
