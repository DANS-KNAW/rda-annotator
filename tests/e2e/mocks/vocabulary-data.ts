/**
 * Mock vocabulary data for E2E tests.
 * Data structure matches the raw API response format from /vocabularies endpoint.
 * The background.ts transforms this into DataSource format for the UI.
 */

export interface RawVocabularyItem {
  value_scheme: string;
  value_uri: string;
  subject_scheme: string;
  namespace: string;
  scheme_uri: string;
  additional_metadata?: {
    description?: string;
    local_name?: string;
    url?: string;
    taxonomy_parent?: string;
    status?: string;
  };
}

export const mockVocabularies: Record<string, RawVocabularyItem[]> = {
  "iso-639": [
    {
      value_scheme: "English",
      value_uri: "eng",
      subject_scheme: "language",
      namespace: "iso-639",
      scheme_uri: "http://www.iso.org/iso/home/standards/language_codes.htm",
      additional_metadata: {
        description: "English language",
        local_name: "English",
      },
    },
    {
      value_scheme: "German",
      value_uri: "deu",
      subject_scheme: "language",
      namespace: "iso-639",
      scheme_uri: "http://www.iso.org/iso/home/standards/language_codes.htm",
      additional_metadata: {
        description: "German language",
        local_name: "Deutsch",
      },
    },
    {
      value_scheme: "French",
      value_uri: "fra",
      subject_scheme: "language",
      namespace: "iso-639",
      scheme_uri: "http://www.iso.org/iso/home/standards/language_codes.htm",
      additional_metadata: {
        description: "French language",
        local_name: "Français",
      },
    },
    {
      value_scheme: "Spanish",
      value_uri: "spa",
      subject_scheme: "language",
      namespace: "iso-639",
      scheme_uri: "http://www.iso.org/iso/home/standards/language_codes.htm",
      additional_metadata: {
        description: "Spanish language",
        local_name: "Español",
      },
    },
    {
      value_scheme: "Dutch",
      value_uri: "nld",
      subject_scheme: "language",
      namespace: "iso-639",
      scheme_uri: "http://www.iso.org/iso/home/standards/language_codes.htm",
      additional_metadata: {
        description: "Dutch language",
        local_name: "Nederlands",
      },
    },
  ],

  rda_resource_types: [
    {
      value_scheme: "Article",
      value_uri: "article",
      subject_scheme: "resource_type",
      namespace: "rda_resource_types",
      scheme_uri: "https://rda.org/vocab/resource_types",
      additional_metadata: { description: "Academic or scholarly article" },
    },
    {
      value_scheme: "Website",
      value_uri: "website",
      subject_scheme: "resource_type",
      namespace: "rda_resource_types",
      scheme_uri: "https://rda.org/vocab/resource_types",
      additional_metadata: { description: "Web page or website" },
    },
    {
      value_scheme: "Dataset",
      value_uri: "dataset",
      subject_scheme: "resource_type",
      namespace: "rda_resource_types",
      scheme_uri: "https://rda.org/vocab/resource_types",
      additional_metadata: { description: "Research dataset" },
    },
    {
      value_scheme: "Software",
      value_uri: "software",
      subject_scheme: "resource_type",
      namespace: "rda_resource_types",
      scheme_uri: "https://rda.org/vocab/resource_types",
      additional_metadata: { description: "Software or code repository" },
    },
    {
      value_scheme: "Other",
      value_uri: "other",
      subject_scheme: "resource_type",
      namespace: "rda_resource_types",
      scheme_uri: "https://rda.org/vocab/resource_types",
      additional_metadata: { description: "Other resource type" },
    },
  ],

  rda_keywords: [
    {
      value_scheme: "Data Management",
      value_uri: "data-management",
      subject_scheme: "keyword",
      namespace: "rda_keywords",
      scheme_uri: "https://rda.org/vocab/keywords",
      additional_metadata: {
        description: "Data management practices and tools",
      },
    },
    {
      value_scheme: "Open Science",
      value_uri: "open-science",
      subject_scheme: "keyword",
      namespace: "rda_keywords",
      scheme_uri: "https://rda.org/vocab/keywords",
      additional_metadata: {
        description: "Open science principles and practices",
      },
    },
    {
      value_scheme: "FAIR Data",
      value_uri: "fair-data",
      subject_scheme: "keyword",
      namespace: "rda_keywords",
      scheme_uri: "https://rda.org/vocab/keywords",
      additional_metadata: {
        description: "Findable, Accessible, Interoperable, Reusable data",
      },
    },
    {
      value_scheme: "Reproducibility",
      value_uri: "reproducibility",
      subject_scheme: "keyword",
      namespace: "rda_keywords",
      scheme_uri: "https://rda.org/vocab/keywords",
      additional_metadata: {
        description: "Research reproducibility and replicability",
      },
    },
  ],

  rda_pathways: [
    {
      value_scheme: "Data Sharing",
      value_uri: "data-sharing",
      subject_scheme: "pathway",
      namespace: "rda_pathways",
      scheme_uri: "https://rda.org/vocab/pathways",
      additional_metadata: { description: "RDA Data Sharing pathway" },
    },
    {
      value_scheme: "Data Citation",
      value_uri: "data-citation",
      subject_scheme: "pathway",
      namespace: "rda_pathways",
      scheme_uri: "https://rda.org/vocab/pathways",
      additional_metadata: { description: "RDA Data Citation pathway" },
    },
    {
      value_scheme: "Data Discovery",
      value_uri: "data-discovery",
      subject_scheme: "pathway",
      namespace: "rda_pathways",
      scheme_uri: "https://rda.org/vocab/pathways",
      additional_metadata: { description: "RDA Data Discovery pathway" },
    },
  ],

  gorc_elements: [
    {
      value_scheme: "Data",
      value_uri: "gorc-data",
      subject_scheme: "gorc_element",
      namespace: "gorc_elements",
      scheme_uri: "https://rda.org/vocab/gorc",
      additional_metadata: { description: "GORC Data element" },
    },
    {
      value_scheme: "Services",
      value_uri: "gorc-services",
      subject_scheme: "gorc_element",
      namespace: "gorc_elements",
      scheme_uri: "https://rda.org/vocab/gorc",
      additional_metadata: { description: "GORC Services element" },
    },
    {
      value_scheme: "Infrastructure",
      value_uri: "gorc-infrastructure",
      subject_scheme: "gorc_element",
      namespace: "gorc_elements",
      scheme_uri: "https://rda.org/vocab/gorc",
      additional_metadata: { description: "GORC Infrastructure element" },
    },
  ],

  gorc_attributes: [
    {
      value_scheme: "Interoperability",
      value_uri: "gorc-interoperability",
      subject_scheme: "gorc_attribute",
      namespace: "gorc_attributes",
      scheme_uri: "https://rda.org/vocab/gorc",
      additional_metadata: { description: "GORC Interoperability attribute" },
    },
    {
      value_scheme: "Trust",
      value_uri: "gorc-trust",
      subject_scheme: "gorc_attribute",
      namespace: "gorc_attributes",
      scheme_uri: "https://rda.org/vocab/gorc",
      additional_metadata: { description: "GORC Trust attribute" },
    },
    {
      value_scheme: "Sustainability",
      value_uri: "gorc-sustainability",
      subject_scheme: "gorc_attribute",
      namespace: "gorc_attributes",
      scheme_uri: "https://rda.org/vocab/gorc",
      additional_metadata: { description: "GORC Sustainability attribute" },
    },
  ],

  rda_interest_groups: [
    {
      value_scheme: "Data Fabric IG",
      value_uri: "ig-data-fabric",
      subject_scheme: "interest_group",
      namespace: "rda_interest_groups",
      scheme_uri: "https://rda.org/vocab/groups",
      additional_metadata: { description: "RDA Data Fabric Interest Group" },
    },
    {
      value_scheme: "FAIR IG",
      value_uri: "ig-fair",
      subject_scheme: "interest_group",
      namespace: "rda_interest_groups",
      scheme_uri: "https://rda.org/vocab/groups",
      additional_metadata: { description: "RDA FAIR Interest Group" },
    },
    {
      value_scheme: "Metadata IG",
      value_uri: "ig-metadata",
      subject_scheme: "interest_group",
      namespace: "rda_interest_groups",
      scheme_uri: "https://rda.org/vocab/groups",
      additional_metadata: { description: "RDA Metadata Interest Group" },
    },
  ],

  rda_working_groups: [
    {
      value_scheme: "Data Citation WG",
      value_uri: "wg-data-citation",
      subject_scheme: "working_group",
      namespace: "rda_working_groups",
      scheme_uri: "https://rda.org/vocab/groups",
      additional_metadata: { description: "RDA Data Citation Working Group" },
    },
    {
      value_scheme: "PID Policy WG",
      value_uri: "wg-pid-policy",
      subject_scheme: "working_group",
      namespace: "rda_working_groups",
      scheme_uri: "https://rda.org/vocab/groups",
      additional_metadata: { description: "RDA PID Policy Working Group" },
    },
    {
      value_scheme: "FAIR Vocabularies WG",
      value_uri: "wg-fair-vocab",
      subject_scheme: "working_group",
      namespace: "rda_working_groups",
      scheme_uri: "https://rda.org/vocab/groups",
      additional_metadata: {
        description: "RDA FAIR Vocabularies Working Group",
      },
    },
  ],

  disciplines: [
    {
      value_scheme: "Computer Science",
      value_uri: "cs",
      subject_scheme: "discipline",
      namespace: "disciplines",
      scheme_uri: "https://rda.org/vocab/disciplines",
      additional_metadata: { description: "Computer and Information Sciences" },
    },
    {
      value_scheme: "Biology",
      value_uri: "bio",
      subject_scheme: "discipline",
      namespace: "disciplines",
      scheme_uri: "https://rda.org/vocab/disciplines",
      additional_metadata: { description: "Biological Sciences" },
    },
    {
      value_scheme: "Physics",
      value_uri: "phys",
      subject_scheme: "discipline",
      namespace: "disciplines",
      scheme_uri: "https://rda.org/vocab/disciplines",
      additional_metadata: { description: "Physical Sciences" },
    },
    {
      value_scheme: "Social Sciences",
      value_uri: "social",
      subject_scheme: "discipline",
      namespace: "disciplines",
      scheme_uri: "https://rda.org/vocab/disciplines",
      additional_metadata: { description: "Social Sciences" },
    },
  ],

  momsi: [
    {
      value_scheme: "Methods",
      value_uri: "momsi-methods",
      subject_scheme: "momsi",
      namespace: "momsi",
      scheme_uri: "https://rda.org/vocab/momsi",
      additional_metadata: { description: "MOMSI Methods category" },
    },
    {
      value_scheme: "Objects",
      value_uri: "momsi-objects",
      subject_scheme: "momsi",
      namespace: "momsi",
      scheme_uri: "https://rda.org/vocab/momsi",
      additional_metadata: { description: "MOMSI Objects category" },
    },
    {
      value_scheme: "Standards",
      value_uri: "momsi-standards",
      subject_scheme: "momsi",
      namespace: "momsi",
      scheme_uri: "https://rda.org/vocab/momsi",
      additional_metadata: { description: "MOMSI Standards category" },
    },
  ],
};

/**
 * Get vocabularies by namespace with optional search filtering
 */
export function getVocabulariesByNamespace(
  namespace: string,
  searchTerm?: string
): RawVocabularyItem[] {
  const items = mockVocabularies[namespace] || [];

  if (!searchTerm) {
    return items;
  }

  const term = searchTerm.toLowerCase();
  return items.filter(
    (item) =>
      item.value_scheme.toLowerCase().includes(term) ||
      item.additional_metadata?.description?.toLowerCase().includes(term) ||
      item.additional_metadata?.local_name?.toLowerCase().includes(term)
  );
}
