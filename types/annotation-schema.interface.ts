import { PredefinedDataSource } from "./datasource.interface";

export interface AnnotationSchema {
  title: string;
  version: number;
  fields: AnnotationField[];
}

export type AnnotationField = TextField | TextareaField | ComboboxField;

interface BaseField {
  type: string;
  label: string;
  name: string;
  required?: boolean;
  info?: string;
  disabled?: boolean;
  defaultValue?: any;
}

interface TextField extends BaseField {
  type: "text";
}

interface TextareaField extends BaseField {
  type: "textarea";
  rows?: number;
}

interface ComboboxField extends BaseField {
  type: "combobox";
  vocabulary: PredefinedDataSource;
  multiple?: boolean;
}
