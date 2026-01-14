import type { DataSource } from '@/types/datasource.interface'

export default async function fetchRDAPathways(): Promise<DataSource[]> {
  const rdaPathways = [
    {
      uuid_pathway: 'rda_graph:2C0DA42E',
      pathway: 'Data Infrastructures and Environments - Institutional',
      description:
        'Workflows and methods to implement the FAIR, CARE and TRUST Principles at the institutional data infrastructure level.',
      data_source: 'Pathway Github',
    },
    {
      uuid_pathway: 'rda_graph:03A30CFB',
      pathway: 'Data Infrastructures and Environments - International',
      description:
        'Topics related to implementing principles that are common to all data infrastructures and community practices.',
      data_source: 'Pathway Github',
    },
    {
      uuid_pathway: 'rda_graph:521FDF0F',
      pathway:
        'Data Infrastructures and Environments - Regional or Disciplinary',
      description:
        'Standards and practices specific to a region and disciplinary community.',
      data_source: 'Pathway Github',
    },
    {
      uuid_pathway: 'rda_graph:7F11013B',
      pathway: 'Data Lifecycles - Versioning, Provenance, Citation, and Reward',
      description:
        'Data management topics within the data lifecycle, including description, versioning, provenance, granularity, publishing, citation and reward.',
      data_source: 'Pathway Github',
    },
    {
      uuid_pathway: 'rda_graph:0DAC3574',
      pathway: 'Discipline Focused Data Issues',
      description:
        'Implementation of principles and common data management practices from a disciplinary community.',
      data_source: 'Pathway Github',
    },
    {
      uuid_pathway: 'rda_graph:789662AC',
      pathway: 'FAIR, CARE, TRUST - Adoption, Implementation, and Deployment',
      description:
        'Practices and methods for the adoption, implementation and deployment of the FAIR, CARE and TRUST Principles.',
      data_source: 'Pathway Github',
    },
    {
      uuid_pathway: 'rda_graph:025CBB68',
      pathway: 'FAIR, CARE, TRUST - Principles',
      description:
        'The FAIR, CARE and TRUST principles and their applicability to various research objects, including data, software, metadata and hardware.',
      data_source: 'Pathway Github',
    },
    {
      uuid_pathway: 'rda_graph:4E73F09C',
      pathway: 'Other',
      description: '',
      data_source: 'Pathway Github',
    },
    {
      uuid_pathway: 'rda_graph:85B30A1B',
      pathway: 'Research Software',
      description: 'Practices and policies to make software open and FAIR.',
      data_source: 'Pathway Github',
    },
    {
      uuid_pathway: 'rda_graph:0178DD3E',
      pathway: 'Semantics, Ontology, Standardisation',
      description:
        'Standardisation of metadata profiles, semantics and ontologies for maximising interoperability.',
      data_source: 'Pathway Github',
    },
    {
      uuid_pathway: 'rda_graph:DA7893AD',
      pathway: 'Training, Stewardship, and Data Management Planning',
      description:
        'Training modules, schools, workshops and library support for stewardship and data management.',
      data_source: 'Pathway Github',
    },
  ]

  return rdaPathways.map(
    pathway =>
      ({
        label: pathway.pathway,
        value: pathway.uuid_pathway,
        description: pathway.description,
      } satisfies DataSource),
  )
}
