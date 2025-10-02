import { DataSource } from "@/types/datasource.interface";

export default async function fetchGORCElements(): Promise<DataSource[]> {
  const gorcElements = [
    {
      uuid_element: "6DEE3E6B",
      element: "Governance*",
      description:
        "Human individuals and groups comprised of stakeholders that define the commons purpose and the development of the strategies, objectives, values, and policies that frame how that purpose will be pursued.",
    },
    {
      uuid_element: "B9EA25EF",
      element: "Rules of Participation & Access*",
      description:
        "A set of policies defining a minimal set of rights, obligations, and accountiability governing the activities of those participating in the commons*.",
    },
    {
      uuid_element: "321CA671",
      element: "Sustainability*",
      description:
        "Models and agreements made on how to fund or resouce activities in a way that can be sustained over the long term.",
    },
    {
      uuid_element: "D1D70F24",
      element: "Engagement*",
      description:
        "Methods, mechanisms, and means used to interact with the broad research commons community* to involve them in activities. Specifically human engagement, as technical engagement is captured in Services* & Tools*",
    },
    {
      uuid_element: "05952B0F",
      element: "Human Capacity*",
      description:
        "The ability of the commons* to create a human-friendly environment for all stakeholders* and community* members* in all aspects, specifically for users*, Providers*, and internal staff, so that the commons* can set and achieve objectives, perform functions, solve problems, and continue to develop the means and conditions required to enable this process.",
    },
    {
      uuid_element: "1510F16E",
      element: "ICT Infrastructure*",
      description:
        "Information and communications technology infrastructure, the physical components that a computer system requires to function and are necessary to conduct research.",
    },
    {
      uuid_element: "A5068187",
      element: "Interoperability*",
      description:
        "The ability of research objects* or tools* from different resources to integrate or work together with minimal effort. e.g. A research data file can be used by two different commons* HPC infrastructure.",
    },
    {
      uuid_element: "AE2C33DD",
      element: "Standards*",
      description:
        "A repeatable, harmonized, agreed and documented way of doing something.",
    },
    {
      uuid_element: "15056876",
      element: "Services* & Tools*",
      description:
        "Service: Any commons* element that can be invoked by users* to perform some action on their behalf.\nTool: Any commons* element that enables users* to perform one or more operations, typically on data with data as the output.",
    },
    {
      uuid_element: "6FF84678",
      element: "Research Object*",
      description:
        "Any input or output of any and all stages of the research process.",
    },
  ];

  return gorcElements.map(
    (element) =>
      ({
        label: element.element,
        description: element.description,
        secondarySearch: element.description,
        value: element.uuid_element,
      } satisfies DataSource)
  );
}
