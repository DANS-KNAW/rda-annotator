export interface DataSource {
  label: string
  secondarySearch?: string
  description?: string
  value: any
}

export type PredefinedDataSource
  = | 'languages'
    | 'resource_types'
    | 'disciplines'
    | 'rda_pathways'
    | 'working_groups'
    | 'interest_groups'
    | 'gorc_elements'
    | 'gorc_attributes'
    | 'keywords'
    | 'open_vocabularies'
