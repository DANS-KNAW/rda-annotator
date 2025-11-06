import type { estypes } from "@elastic/elasticsearch";
import type { Selector, AnnotationTarget } from "./selector.interface";

export interface ElasticsearchResponse {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number | null;
    hits: AnnotationHit[];
  };
}

export interface AnnotationHit {
  _index: string;
  _id: string;
  _score: number | null;
  _ignored?: string[];
  _source: Annotation;
  sort?: number[];
}

export interface Annotation {
  uuid: string;
  uuid_link: string | null;
  uuid_rda: string;
  title: string;
  alternateTitle: string | null;
  uri: string;
  backupUri: string | null;
  uri2: string | null;
  backupUri2: string | null;
  pid_lod_type: string | null;
  pid_lod: string | null;
  dc_date: string;
  dc_description: string;
  dc_language: string;
  type: string;
  dc_type: string;
  card_url: string | null;
  resource_source: "Annotation";
  fragment: string;
  annotation_target?: AnnotationTarget;
  uuid_uri_type: string | null;
  notes: string | null;
  last_update: string | null;
  pathway: string | null;
  pathway_uuid: string | null;
  group_name: string | null;
  group_uuid: string | null;
  changed: string | null;
  submitter: string;
  interest_groups: InterestGroup[];
  working_groups: WorkingGroup[];
  pathways: Pathway[];
  disciplines: Discipline[];
  gorc_elements: GorcElement[];
  gorc_attributes: GorcAttribute[];
  uri_type: UriType[];
  keywords: Keyword[];
}

interface InterestGroup {
  uuid_interestGroup: string;
  title: string;
  description: string;
  uuid_domain: string;
  domains: string;
  url: string;
  status: string;
  sub_status: string;
  last_update: string | null;
  relation: string;
}

interface WorkingGroup {
  uuid_working_group: string;
  title: string;
  description: string;
  uuid_domain: string;
  domains: string;
  url: string;
  backup_url: string;
  status: string;
  sub_status: string;
  last_update: string | null;
  relation: string;
}

interface Pathway {
  uuid_pathway: string;
  pathway: string;
  description: string;
  data_source: string;
  relation: string;
}

interface Discipline {
  internal_identifier: string;
  uuid: string;
  list_item: string;
  description: string;
  description_source: string;
  taxonomy_parent: string;
  taxonomy_terms: string;
  uuid_parent: string;
  url: string;
}

interface GorcElement {
  uuid_element: string;
  element: string;
  description: string;
}

interface GorcAttribute {
  uuid_attribute: string;
  attribute: string;
  description: string;
}

interface UriType {
  uuid_uri_type: string;
  uri_type: string;
  description: string;
}

interface Keyword {
  uuid_keyword: string;
  keyword: string;
}
