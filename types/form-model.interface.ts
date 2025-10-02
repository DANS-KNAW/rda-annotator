interface BaseModelInput {
  label: string;
}

export interface TypeAheadModelInput extends BaseModelInput {
  type: "typeahead";
  source: "orcid";
}
