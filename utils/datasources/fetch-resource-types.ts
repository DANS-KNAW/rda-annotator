import type { DataSource } from '@/types/datasource.interface'

export default async function fetchResourceTypes(): Promise<DataSource[]> {
  const resourceTypes = [
    {
      uuid_uri_type: 'rda_graph:4F1865F2',
      uri_type: 'Concept',
      description:
        'A URI to a page describing a concept (vocabulary item, glossary item, ...)',
    },
    {
      uuid_uri_type: 'rda_graph:4D261960',
      uri_type: 'Infrastructure',
      description:
        'A URI to a consortium or national infrastructure for research or digital research services',
    },
    {
      uuid_uri_type: 'rda_graph:5DEEF0C7',
      uri_type: 'Initiative',
      description:
        'A URI to a page describing an initiative, network, federation, or group with a common interest',
    },
    {
      uuid_uri_type: 'rda_graph:59F2DD8F',
      uri_type: 'News',
      description: 'A URI to a news item',
    },
    {
      uuid_uri_type: 'rda_graph:A11C41C',
      uri_type: 'Opinion',
      description:
        'A URI to a blog post, discussion forum, social media thread, or points of view on a topic',
    },
    {
      uuid_uri_type: 'rda_graph:D2BC195C',
      uri_type: 'Organisation',
      description:
        'A URI to a page describing an organisation, institution, consortium, or other legal entity, including government entities',
    },
    {
      uuid_uri_type: 'rda_graph:BC258428',
      uri_type: 'Other',
      description: 'Any other resource in the web',
    },
    {
      uuid_uri_type: 'rda_graph: 4D261960',
      uri_type: 'Project',
      description: 'A URI to a project or programme',
    },
    {
      uuid_uri_type: 'rda_graph:51B3E91F',
      uri_type: 'Publication',
      description:
        'Any of a number of sub-categories, as defined by info_types and used in Zenodo',
    },
    {
      uuid_uri_type: 'rda_graph:6951DB96',
      uri_type: 'Recommendation',
      description:
        'A URI to a recommendation in respect of standards, best practices, or similar',
    },
    {
      uuid_uri_type: 'rda_graph:9D161303',
      uri_type: 'Requirements',
      description:
        'A URI to requirements or community expectations in respect of performance, benchmarks, and norms ',
    },
    {
      uuid_uri_type: 'rda_graph:FB3739CC',
      uri_type: 'Service',
      description:
        'A URI to a service, registry, repository, archive, or API that can assist with RDMI workflows, ir serves as an example',
    },
    {
      uuid_uri_type: 'rda_graph:FF51944E',
      uri_type: 'Specification',
      description: 'A URI to a specification or standard',
    },
  ]

  return resourceTypes.map(
    type =>
      ({
        label: type.uri_type,
        value: type.uuid_uri_type,
        secondarySearch: type.description,
        description: type.description,
      } satisfies DataSource),
  )
}
