import type { PredefinedDataSource } from './datasource.interface'

export interface AnnotationSchema {
  title: string
  version: number
  fields: AnnotationField[]
}

export type AnnotationField = TextField | TextareaField | ComboboxField

interface BaseField {
  type: string
  label: string
  name: string
  required?: boolean
  info?: string
  disabled?: boolean
  defaultValue?: any
}

interface TextField extends BaseField {
  type: 'text'
}

interface TextareaField extends BaseField {
  type: 'textarea'
  rows?: number
}

export interface ComboboxField extends BaseField {
  type: 'combobox'
  vocabulary: PredefinedDataSource
  multiple?: boolean
  vocabularyOptions?: VocabularyOptions
  displaySection?: 'basic' | 'rda_vocabularies' | 'additional_vocabularies'
  allowCustomValue?: boolean
  showDescription?: boolean // Default: true - set to false to hide descriptions in dropdown
}

export interface VocabularyOptions {
  subject_scheme?: string
  scheme_uri?: string
  value_scheme?: string
  value_uri?: string
  namespace?: string
}
