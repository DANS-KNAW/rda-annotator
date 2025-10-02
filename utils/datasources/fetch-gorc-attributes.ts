import { DataSource } from "@/types/datasource.interface";

export default async function fetchGORCAttributes(): Promise<DataSource[]> {
  const gorcAttributes = [
    {
      uuid_attribute: "77D49FB9",
      attribute: "Intent",
      description: "Commons intent, definition, and Strategic Planning",
    },
    {
      uuid_attribute: "9CBACF2B",
      attribute: "Organization",
      description:
        "An appropriate organizational structure, design, and capability maturity for the aims and context of the commons*",
    },
    {
      uuid_attribute: "25D05636",
      attribute: "Risk Management",
      description: "Risk management frameworks",
    },
    {
      uuid_attribute: "DE212E4A",
      attribute: "Commons* Policy",
      description:
        "Internal Commons* Policy Development, implementation, and review",
    },
    {
      uuid_attribute: "1FE982A0",
      attribute: "Community* Relations",
      description: "Development and implementation of community* relations",
    },
    {
      uuid_attribute: "441B04F2",
      attribute: "Policy",
      description: "Policy advocacy, and recommendations",
    },
    {
      uuid_attribute: "DD1E70FF",
      attribute: "Organizational Monitoring",
      description:
        "A monitoring organizational design or organizational performance system to gather qualitative and quantitative metrics",
    },
    {
      uuid_attribute: "7CD61AB2",
      attribute: "Research Governance",
      description:
        "Research object and service governance rules, principles, and enforcement of quality.",
    },
    {
      uuid_attribute: "9BA1BA84",
      attribute: "Community* Definition",
      description: "Any definition of the commons community*",
    },
    {
      uuid_attribute: "69395219",
      attribute: "Community* Rights",
      description:
        "Existence of a set of policies defining a minimal set of rights and obligations for the commons* communty",
    },
    {
      uuid_attribute: "148A4642",
      attribute: "Community* Accountability",
      description:
        "Existence of a set of policies defining minimal accountability for the commons* communty",
    },
    {
      uuid_attribute: "AB848C55",
      attribute: "Community* EDII",
      description:
        "A commitement to equity, diversity, inclusion, and where appropriate, Indigenization (EDII), for the commons* communty",
    },
    {
      uuid_attribute: "61E0388A",
      attribute: "Resourcing",
      description:
        "Minimal viable plan for resourcing on the medium and long term",
    },
    {
      uuid_attribute: "B790D527",
      attribute: "Knowledge Retention",
      description:
        "Minimal viable plan for retaining knowledge accumulated by the commons* on the medium and long term",
    },
    {
      uuid_attribute: "4A1ACD5F",
      attribute: "Research Objects",
      description:
        "Minimal viable plan for medium and long term management of research objects*",
    },
    {
      uuid_attribute: "9F67E5BB",
      attribute: "Trust",
      description:
        "Minimal viable plan to build community* trust and maintain it in the long term",
    },
    {
      uuid_attribute: "ACEE4BDD",
      attribute: "Influencing Governance",
      description:
        "Mechanisms for community* engagement and input as part of setting expectations for governance decision making processes",
    },
    {
      uuid_attribute: "E2C756C9",
      attribute: "Communications",
      description:
        "Structured and coordinated communication plan and mechanism, medium, or channels",
    },
    {
      uuid_attribute: "4F888A7E",
      attribute: "Events",
      description:
        "Events hosted or provided by the commons* for individuals in the commons community*.",
    },
    {
      uuid_attribute: "6C95143A",
      attribute: "Training",
      description:
        "Training hosted or provided by the commons* for individuals in the commons community*.",
    },
    {
      uuid_attribute: "654DB461",
      attribute: "Promotion",
      description:
        "Active promotion to intended audiences and incentivisation to participate in Commons*",
    },
    {
      uuid_attribute: "1B8FE29A",
      attribute: "Other Research Commons*",
      description: "Engagement* with other research commons*",
    },
    {
      uuid_attribute: "850E4932",
      attribute: "Staff",
      description: "Internal Capacity (i.e. staff)",
    },
    {
      uuid_attribute: "0CCA84F1",
      attribute: "User-Friendliness",
      description: "Skill requirement for users*, ease of use for users*",
    },
    {
      uuid_attribute: "1CD9ABED",
      attribute: "RoP Providers",
      description:
        "Openness and freedom for Providers* as described in the Rules of Particiation & Access",
    },
    {
      uuid_attribute: "86A6A8A8",
      attribute: "Record Maintainer",
      description:
        "Record maintainer [contact person or organization for the record in a registry that describes the Repository*, the participation of the owner or maintainer of the repo* helps verify the information in the registry]",
    },
    {
      uuid_attribute: "B582B21D",
      attribute: "Services Skills",
      description:
        "Skills for planning, managing and assessing service delivery",
    },
    {
      uuid_attribute: "63F6D6A6",
      attribute: "Services Capacity",
      description:
        "Capacity to manage operations and Infrastructure Management Services*",
    },
    {
      uuid_attribute: "D08544E0",
      attribute: "Documentation",
      description:
        "Document and make public the whole process for every process where feasible, maintain a high level of transparency and documentation with stakeholders* and the community*",
    },
    {
      uuid_attribute: "3E807457",
      attribute: "Scalable",
      description:
        "Infrastructure is designed to scale with increasingly complex projects",
    },
    {
      uuid_attribute: "045EBFB1",
      attribute: "Regular Updates",
      description:
        "A review and update of ICT Infrastructure* happens on a regular basis, with specific considerations for what enables the next layer of the stack and environmental sustainability",
    },
    {
      uuid_attribute: "DF7A4A44",
      attribute: "Network Infrastructure",
      description: "Knowledge and management of Network infrastructure",
    },
    {
      uuid_attribute: "781A252E",
      attribute: "Compute Infrastructure",
      description: "Knowledge and management of Compute Infrastructure",
    },
    {
      uuid_attribute: "1EB3CFA7",
      attribute: "Storage Infrastructure",
      description: "Knowledge and management of Storage Infrastructure",
    },
    {
      uuid_attribute: "8EF56C34",
      attribute: "Infrastructure OS",
      description: "Base software (Infrastructure OS)",
    },
    {
      uuid_attribute: "85DF5C39",
      attribute: "AAI",
      description: "Authentication and Authorization Infrastructure (AAI)",
    },
    {
      uuid_attribute: "9B368066",
      attribute: "Technical",
      description:
        "Mechanisms, infrastructure, and plans in place for technical interoperability* (i.e. artifact exchange)",
    },
    {
      uuid_attribute: "BB822F74",
      attribute: "Semantic",
      description:
        "Mechanisms, infrastructure, and plans in place for semantic interoperability* (i.e. interpretation)",
    },
    {
      uuid_attribute: "A66E0E5F",
      attribute: "Pragmatic",
      description:
        "Mechanisms, infrastructure, and plans in place for pragmatic interoperability* (i.e. agreements between organizations)",
    },
    {
      uuid_attribute: "79C884B4",
      attribute: "Legal",
      description:
        "Mechanisms, infrastructure, and plans in place for legal interoperability*",
    },
    {
      uuid_attribute: "BAB36BF6",
      attribute: "PIDs",
      description:
        "A proven workflow to connect multiple different research artefact types is built on a persistent identifier infrastructure designed for interoperability*",
    },
    {
      uuid_attribute: "1EAB24E3",
      attribute: "Supported Metadata",
      description:
        "Community* supported and well documented metadata* standards such that metadata* fulfills a given purpose",
    },
    {
      uuid_attribute: "F54630C2",
      attribute: "Vocabulary & Ontology",
      description: "Vocabulary and Ontology standards",
    },
    {
      uuid_attribute: "47B72C83",
      attribute: "Research Objects*",
      description: "Research object standards",
    },
    {
      uuid_attribute: "ECB75681",
      attribute: "Service Endpoint Definition",
      description:
        "Defined service endpoints between any combination of humans and machines",
    },
    {
      uuid_attribute: "F39FF8CA",
      attribute: "Authentication & Authorization",
      description: "Authentication and Authorization protocols",
    },
    {
      uuid_attribute: "9484F018",
      attribute: "PID Workflow & Definitions",
      description:
        "A workflow and standards for adding and maintaining PIDs for managed assets",
    },
    {
      uuid_attribute: "09CE6F2C",
      attribute: "Applications & Software",
      description:
        "Applications and Software standards, in addition to applicable research object* and metadata* standards",
    },
    {
      uuid_attribute: "1330CEBA",
      attribute: "Commons*-Specific",
      description:
        "Standards* and protocols for all processes, services and tools* offered by the commons*.",
    },
    {
      uuid_attribute: "1BA01522",
      attribute: "Development Process",
      description:
        "There exists a process for developing, updating and promoting standards",
    },
    {
      uuid_attribute: "D78BA8D0",
      attribute: "DMPs",
      description:
        "DMP standards, in addition to any applicable research object* and metadata* standards",
    },
    {
      uuid_attribute: "973BAB43",
      attribute: "Core types definitions",
      description:
        "Definitions of a set of core types of research objects* and services provided by the commons*.",
    },
    {
      uuid_attribute: "5373971C",
      attribute: "Availability",
      description:
        "Standards* describing the availability of post-print versions* of research objects* in institutional or thematic Open Access repos",
    },
    {
      uuid_attribute: "50083F53",
      attribute: "Access*",
      description:
        "Standards* for access to information, resources, services, and tools*",
    },
    {
      uuid_attribute: "E6DDF79A",
      attribute: "Computational Workflows",
      description:
        "Where computational workflows are used or referenced in Provenance* information, these should be captured in a standards-based way",
    },
    {
      uuid_attribute: "402EE822",
      attribute: "Collections",
      description:
        "Standards* for collections*, in addition to any applicable research object* and metadata* standards",
    },
    {
      uuid_attribute: "D2F21080",
      attribute: "Research Data Repository*",
      description: "Research data Repository*",
    },
    {
      uuid_attribute: "385EA3F1",
      attribute: "Publication & Research Documentation Repository*",
      description:
        "A publication and research documentation repository*, specifically for peer-reviewed articles, reports, and notes. (i.e. Research findings available to the wider academic community* and beyond.) that have been provided by the commons community*",
    },
    {
      uuid_attribute: "337B0595",
      attribute: "Research Software Repository*",
      description: "Research software repository*",
    },
    {
      uuid_attribute: "0A8D064E",
      attribute: "Vocabulary Repository*",
      description: "Vocabulary repository*",
    },
    {
      uuid_attribute: "824CEDD7",
      attribute: "Harvesting & Integration",
      description:
        "Harvesting, or aggregating, and integrating research objects*, metadata*, services and tools* from external repositories and commons*, including members* and providers*",
    },
    {
      uuid_attribute: "C0E5B005",
      attribute: "Cataloging & Inventory",
      description:
        "A process to inventory research objects* and services to create and add to an open, searchable commons* catelogue that will include pointers to other types of catalogues or collections* and services",
    },
    {
      uuid_attribute: "A5A228F7",
      attribute: "Service Marketplace",
      description:
        "A marketplace or API for external service Providers* to access and add their services, such that an interoperable interface is available to third party services from the perspective of users* and creates a service catelogue",
    },
    {
      uuid_attribute: "FEC5C206",
      attribute: "Data Acquisition",
      description: "digital object*, Research object, and data acquisition",
    },
    {
      uuid_attribute: "ED333B57",
      attribute: "Metadata Quality Control",
      description:
        "Provide integrity and quality control mechanisms for metadata*, including immutiability",
    },
    {
      uuid_attribute: "8DBFBCE2",
      attribute: "Research Object* Quality Control",
      description:
        "Provide integrity and quality control mechanisms for research objects*",
    },
    {
      uuid_attribute: "2B1CD18D",
      attribute: "Data Management",
      description: "digital object*, Research object, and data management",
    },
    {
      uuid_attribute: "D7778708",
      attribute: "Vocabulary Utilization",
      description: "A mechanism for utilizing vocabulary services",
    },
    {
      uuid_attribute: "9ACCB493",
      attribute: "Types Registration",
      description:
        "A system to register types of research objects*, services and tools* that may not already be present in the commons*.",
    },
    {
      uuid_attribute: "1DED88BE",
      attribute: "Harvestable Metadata",
      description:
        "Provide a harvestable metadata* service so that others can harvest metadata* hosted by the commons* that describes research objects*, services, and tools*.",
    },
    {
      uuid_attribute: "F267C969",
      attribute: "Usage Statistics",
      description:
        "expose research object* usage statistics so that they are publicly viewable on the research object* landing page, spanning access and downloads",
    },
    {
      uuid_attribute: "51CB11E4",
      attribute: "SaaS",
      description:
        "Software as a Service* (SaaS), or an applications catelogue, supported by the commons* Open Source Program Office (OSPO)",
    },
    {
      uuid_attribute: "87A86CAE",
      attribute: "PaaS",
      description:
        "Platform as a Service* (PaaS) (i.e. a space to deploy, develop and use software packages and libraries)",
    },
    {
      uuid_attribute: "90B18272",
      attribute: "Processing & Visualization",
      description: "Processing and visualization",
    },
    {
      uuid_attribute: "3155C127",
      attribute: "RDM-Dedicated",
      description:
        "Dedicated Research Data Management services and tools*, outside of training events and workshops.",
    },
    {
      uuid_attribute: "6FB0E27B",
      attribute: "Security & ID",
      description:
        "Securtiy and Identification services, Authenticaion and Authorization (AAI)",
    },
    {
      uuid_attribute: "A769C212",
      attribute: "Repository API",
      description:
        "API for automated execution of standard Repository* tasks and to interoperate with external services and tools* useful to the stakeholders*",
    },
    {
      uuid_attribute: "0721E445",
      attribute: "User Accessibility",
      description:
        "Considerations for the displayed, user*-facing accessibility and reusability of research objects* held by and discoverable through the research commons*.",
    },
    {
      uuid_attribute: "CF052F85",
      attribute: "Research Object Discovery",
      description:
        "Considerations for what research objects* are held by and discoverable through the commons*",
    },
  ];

  return gorcAttributes.map(
    (attr) =>
      ({
        label: attr.attribute,
        value: attr.uuid_attribute,
        secondarySearch: attr.description,
        description: attr.description,
      } satisfies DataSource)
  );
}
