export interface DataSource {
  label: string
  secondarySearch?: string
  description?: string
  value: any
}

export type PredefinedDataSource = 'open_vocabularies'
