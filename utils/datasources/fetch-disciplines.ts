import type { DataSource } from '@/types/datasource.interface'

export default async function fetchDisciplines(): Promise<DataSource[]> {
  const disciplines = [
    {
      internal_identifier: '2368C74A',
      uuid: '3F71CF14',
      list_item: 'Agricultural biotechnology',
      description:
        'Agritech, or agricultural biotechnology, uses scientific methods like genetic engineering to modify plants, animals, and microorganisms. Crop biotechnology involves transferring desired traits from one species to another to improve characteristics like flavor, growth rate, and disease resistance.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\""I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\""',
      taxonomy_parent: 'Agricultural Sciences',
      taxonomy_terms: 'Agricultural biotechnology',
      uuid_parent: '27BE021B',
      url: 'https://en.wikipedia.org/wiki/Agricultural_biotechnology',
    },
    {
      internal_identifier: 'F67E9CFE',
      uuid: 'FA501DD3',
      list_item: 'Agriculture, forestry, and fisheries',
      description:
        'Agriculture, forestry, and fisheries encompass the practices, techniques, and sciences involved in cultivating soil, growing crops, and rearing animals for food, fuel, and other products, managing forests for various resources, and harvesting fish and seafood.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Agricultural Sciences',
      taxonomy_terms: 'Agriculture, forestry, and fisheries',
      uuid_parent: '27BE021B',
      url: 'https://en.wikipedia.org/wiki/Forestry',
    },
    {
      internal_identifier: 'D5D6A30D',
      uuid: '885778DC',
      list_item: 'Animal and dairy science',
      description:
        'Animal and dairy science is dedicated to the study and application of scientific principles related to the breeding, raising, and management of livestock, including animals that are sources of milk and dairy products.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Agricultural Sciences',
      taxonomy_terms: 'Animal and dairy science',
      uuid_parent: '27BE021B',
      url: 'https://en.wikipedia.org/wiki/Animal_science',
    },
    {
      internal_identifier: '56B4E54E',
      uuid: '68CB6AD6',
      list_item: 'Other agricultural sciences',
      description:
        'Other agricultural sciences cover a broad range of studies not classified under specific categories within agriculture, focusing on improving practices, sustainability, and technology in the cultivation of plants and rearing of animals.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Agricultural Sciences',
      taxonomy_terms: 'Other agricultural sciences',
      uuid_parent: '27BE021B',
      url: '',
    },
    {
      internal_identifier: 'DF11D90E',
      uuid: '21E1DAAC',
      list_item: 'Veterinary science',
      description:
        'Veterinary science intersects human health by managing zoonotic diseases, ensuring food safety, aiding medical research, maintaining livestock health, promoting mental wellness through pet care, and upholding animal welfare ethics. Veterinarians collaborate with other scientists and focus on diagnosing, treating, and safeguarding animals\'\' health.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Agricultural Sciences',
      taxonomy_terms: 'Veterinary science',
      uuid_parent: '27BE021B',
      url: 'https://en.wikipedia.org/wiki/Veterinary_science',
    },
    {
      internal_identifier: '0BD68F02',
      uuid: '27BE021B',
      list_item: 'Agricultural sciences',
      description:
        'Agricultural science is a multidisciplinary field incorporating biology, exact, natural, economic, and social sciences for agricultural practice. Experts are known as agricultural scientists or agriculturists.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Agricultural Sciences',
      taxonomy_terms: 'Agricultural Sciences',
      uuid_parent: '',
      url: 'https://en.wikipedia.org/wiki/Agricultural_sciences',
    },
    {
      internal_identifier: 'E19B342F',
      uuid: '317D163C',
      list_item: 'Chemical engineering',
      description:
        'Chemical engineering involves designing and operating chemical plants, developing processes to convert raw materials into products, and improving production. Using chemistry, physics, math, biology, and economics, chemical engineers work on everything from nanotechnology to large-scale processes that transform chemicals and materials into useful products. They also focus on plant design, safety assessments, process analysis, and control engineering.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms: 'Chemical engineering',
      uuid_parent: '285F97D3',
      url: 'https://en.wikipedia.org/wiki/Chemical_engineering',
    },
    {
      internal_identifier: '7B4CA829',
      uuid: 'E6A05ECC',
      list_item: 'Civil engineering',
      description:
        'Civil engineering, one of the oldest engineering disciplines after military engineering, involves the design, construction, and maintenance of infrastructure like roads, bridges, railways, and sewage systems. It encompasses both public (e.g., municipal to federal agencies) and private sectors (from local firms to global companies). This field is divided into various sub-disciplines.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms: 'Civil engineering',
      uuid_parent: '285F97D3',
      url: 'https://en.wikipedia.org/wiki/Civil_engineering',
    },
    {
      internal_identifier: '2BF73EBE',
      uuid: 'AD232C46',
      list_item:
        'Electrical engineering, electronic engineering, information engineering',
      description:
        'Electrical engineering, electronic engineering, information engineering is the domain that deals with the study and application of electricity, electronics, and electromagnetism to develop electrical and electronic equipment, from small microchips to huge power station generators, and information technology solutions.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms:
        'Electrical engineering, electronic, engineering, information engineering',
      uuid_parent: '285F97D3',
      url: 'https://en.wikipedia.org/wiki/Electrical_engineering',
    },
    {
      internal_identifier: '4D78A182',
      uuid: '3EE05B5A',
      list_item: 'Environmental biotechnology',
      description:
        'Environmental biotechnology involves using biotechnology to study and improve the natural environment. It focuses on harnessing biological processes for commercial uses, including the remediation of contaminated environments (land, air, water) and promoting green manufacturing technologies for sustainable development. It aims at the optimal use of natural resources, like plants and bacteria, to produce energy and food, transforming waste into feedstock for other processes.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms: 'Environmental biotechnology',
      uuid_parent: '285F97D3',
      url: 'https://en.wikipedia.org/wiki/Environmental_biotechnology',
    },
    {
      internal_identifier: '50A17D29',
      uuid: 'E381BBCB',
      list_item: 'Environmental engineering',
      description:
        'Environmental engineering merges principles from chemistry, biology, ecology, and more to devise solutions for protecting and enhancing organism health and environmental quality. It\'\'s a subset of civil and chemical engineering, primarily focusing on sanitary engineering within civil engineering.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms: 'Environmental engineering',
      uuid_parent: '285F97D3',
      url: 'https://en.wikipedia.org/wiki/Environmental_engineering',
    },
    {
      internal_identifier: '659E8941',
      uuid: 'C09C0909',
      list_item: 'Industrial biotechnology',
      description:
        'Industrial biotechnology, or white biotechnology in Europe, uses cells or cell components to generate products for sectors like chemicals, food, detergents, and biofuels. It focuses on using renewable raw materials, creating genetically modified organisms to enhance diversity and economic viability, and aims to reduce greenhouse gas emissions by shifting away from a petrochemical-based economy.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms: 'Industrial Biotechnology',
      uuid_parent: '285F97D3',
      url: 'https://en.wikipedia.org/wiki/Industrial_biotechnology',
    },
    {
      internal_identifier: '08C3CBB7',
      uuid: 'BD52C16D',
      list_item: 'Materials engineering',
      description:
        'Materials engineering involves the development, processing, and testing of materials to create new products or enhance the performance and sustainability of existing ones. This field caters to industries ranging from electronics to aerospace.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms: 'Materials engineering',
      uuid_parent: '285F97D3',
      url: 'https://en.wikipedia.org/wiki/Materials_engineering',
    },
    {
      internal_identifier: 'F3945F14',
      uuid: 'C1E73045',
      list_item: 'Mechanical engineering',
      description:
        'Mechanical engineering combines engineering physics, mathematics, and materials science to design, analyze, manufacture, and maintain physical machines involving force and movement. It covers core areas like mechanics, dynamics, and thermodynamics, employing tools like CAD, CAM, and CAE to innovate in fields such as industrial equipment, transportation, robotics, and medical devices. It\'\'s one of the oldest and broadest engineering disciplines.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms: 'Mechanical engineering',
      uuid_parent: '285F97D3',
      url: 'https://en.wikipedia.org/wiki/Mechanical_engineering',
    },
    {
      internal_identifier: '55CD19C1',
      uuid: '5BEE3E69',
      list_item: 'Medical engineering',
      description:
        'Medical engineering applies engineering principles to medicine and biology for healthcare, such as diagnostics and therapy. It encompasses advancing healthcare treatment through logical sciences, including diagnosis, monitoring, and therapy. Biomedical engineers also manage medical equipment in hospitals, including procurement, testing, maintenance, and making equipment recommendations, often referred to as Biomedical Equipment Technicians (BMET) or clinical engineers.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms: 'Medical engineering',
      uuid_parent: '285F97D3',
      url: 'https://en.wikipedia.org/wiki/Medical_engineering',
    },
    {
      internal_identifier: '5453D674',
      uuid: 'FF2F40FC',
      list_item: 'Nano technology',
      description:
        'Nanotechnology involves manipulating matter at the nanoscale (1 to 100 nm), where surface area and quantum effects influence material properties. It encompasses research and technologies focusing on these unique attributes, including molecular nanotechnology, which aims at precise atom and molecule manipulation for macroscale product fabrication.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms: 'Nano-technology',
      uuid_parent: '285F97D3',
      url: 'https://en.wikipedia.org/wiki/Nano_technology',
    },
    {
      internal_identifier: '856A9F07',
      uuid: '5914EA8E',
      list_item: 'Other engineering and technologies',
      description:
        'Other engineering and technologies encompass all those specialized fields of engineering and technological disciplines that do not explicitly fall under traditional categories, allowing for the exploration of emerging areas and interdisciplinary innovation.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms: 'Other engineering and technologies',
      uuid_parent: '285F97D3',
      url: '',
    },
    {
      internal_identifier: 'BBD7A4E8',
      uuid: '1C62B010',
      list_item: 'Health biotechnology',
      description:
        'Health biotechnology involves using living organisms or their products to develop or modify healthcare products and procedures, aiming to improve the diagnosis, prevention, and treatment of diseases.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Medical and Health Sciences',
      taxonomy_terms: 'Health biotechnology',
      uuid_parent: '95093901',
      url: '',
    },
    {
      internal_identifier: '945CF903',
      uuid: '945CF903',
      list_item: 'Systems engineering',
      description:
        'Systems engineering is an interdisciplinary approach focusing on designing, integrating, and managing complex systems throughout their life cycles. It employs systems thinking to organize knowledge, covering issues like requirements, reliability, and coordination across various technical and human-centered disciplines. The field aims to ensure all aspects of a project are considered and integrated, dealing with work processes, optimization, and risk management in complex projects.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms: 'Systems engineering',
      uuid_parent: '285F97D3',
      url: 'https://en.wikipedia.org/wiki/Systems_engineering',
    },
    {
      internal_identifier: 'FAE1EBC5',
      uuid: '285F97D3',
      list_item: 'Engineering and technology',
      description:
        'Engineering and technology broadly covers the application of scientific principles to the design, development, and enhancement of structures, machines, devices, systems, and processes, driving innovation across various sectors of industry and everyday life.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Engineering and Technology',
      taxonomy_terms: 'Engineering and Technology',
      uuid_parent: '',
      url: 'https://en.wikipedia.org/wiki/Engineering',
    },
    {
      internal_identifier: '196302FD',
      uuid: '695252F5',
      list_item: 'Arts (arts, history of arts, performing arts, music)',
      description:
        'Arts encompasses creative and cultural expressions in various forms, including visual arts, history of arts, performing arts such as dance and theatre, and music, celebrating human creativity and emotional communication through diverse mediums.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Humanities',
      taxonomy_terms: 'Art (arts, history of arts, performing arts, music)',
      uuid_parent: '6DC9618F',
      url: 'https://en.wikipedia.org/wiki/Arts',
    },
    {
      internal_identifier: '1FA8F072',
      uuid: 'C0EB38D1',
      list_item: 'History and archaeology',
      description:
        'History and archaeology delve into the past, exploring ancient civilizations, artifacts, and historical events to unravel how societies have evolved over time. ',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Humanities',
      taxonomy_terms: 'History and archaeology',
      uuid_parent: '6DC9618F',
      url: 'https://en.wikipedia.org/wiki/History',
    },
    {
      internal_identifier: '930A861A',
      uuid: '6F570B92',
      list_item: 'Languages and literature',
      description:
        'Languages and literature focuses on the study and analysis of language and literary works. It encompasses understanding, interpreting, and critiquing spoken and written language across different cultures and time periods.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Humanities',
      taxonomy_terms: 'Languages and literature',
      uuid_parent: '6DC9618F',
      url: 'https://en.wikipedia.org/wiki/Linguistics',
    },
    {
      internal_identifier: 'FF5132A5',
      uuid: 'CD19AFF7',
      list_item: 'Other humanities',
      description:
        'Other humanities is a broad category encompassing diverse fields that study human culture and experiences, including but not limited to art history, musicology, and studies of various cultures and civilizations not specifically covered by other humanities disciplines.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Humanities',
      taxonomy_terms: 'Other humanities',
      uuid_parent: '6DC9618F',
      url: '',
    },
    {
      internal_identifier: '33881971',
      uuid: '0191D876',
      list_item: 'Philosophy, ethics and religion',
      description:
        'Philosophy, ethics, and religion encompasses the study of fundamental questions about existence, knowledge, values, reason, mind, and language, along with beliefs and practices related to the sacred or divine.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Humanities',
      taxonomy_terms: 'Philosophy, ethics and religion',
      uuid_parent: '6DC9618F',
      url: 'https://en.wikipedia.org/wiki/Philosophy',
    },
    {
      internal_identifier: '243CC7A9',
      uuid: '6DC9618F',
      list_item: 'Humanities',
      description:
        'Humanities encompass academic disciplines focused on human society and culture, originally centered on classical literature during the Renaissance but now broader, excluding natural and applied sciences. They include philosophy, religion, linguistics, foreign and classical languages, history, literature, and the arts, employing critical, speculative, and interpretative methods with a historical emphasis, contrasting the empirical nature of sciences.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Humanities',
      taxonomy_terms: 'Humanities',
      uuid_parent: '',
      url: 'https://en.wikipedia.org/wiki/Humanities',
    },
    {
      internal_identifier: '864A5A4C',
      uuid: 'F658ED09',
      list_item: 'Basic medicine',
      description:
        'Basic medicine is the foundational study of the human body and its diseases, aiming to understand the biological and chemical processes that affect health, providing the basis for developing treatments and cures.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Medical and Health Sciences',
      taxonomy_terms: 'Basic medicine',
      uuid_parent: '95093901',
      url: 'https://en.wikipedia.org/wiki/Medicine',
    },
    {
      internal_identifier: '5B3E6CDD',
      uuid: '809F56AB',
      list_item: 'Clinical medicine',
      description:
        'Clinical medicine is focused on the diagnosis, treatment, and prevention of diseases, primarily through direct patient care. It applies findings from basic medicine in a practical settings to improve patient health.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Medical and Health Sciences',
      taxonomy_terms: 'Clinical medicine',
      uuid_parent: '95093901',
      url: 'https://en.wikipedia.org/wiki/Clinical_medicine',
    },
    {
      internal_identifier: 'CE1A660B',
      uuid: '337D6D04',
      list_item: 'Health sciences',
      description:
        'Health sciences encompass several academic disciplines focused on health and healthcare, including STEM and emerging patient safety fields like social care research. This broad domain integrates various sectors to address health-related issues comprehensively.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Medical and Health Sciences',
      taxonomy_terms: 'Health sciences',
      uuid_parent: '95093901',
      url: 'https://en.wikipedia.org/wiki/Health_sciences',
    },
    {
      internal_identifier: 'C776369A',
      uuid: 'D75F9B74',
      list_item: 'Other medical sciences',
      description:
        'Other medical sciences include specialized branches of medicine and health that do not fit into traditional categories, including areas such as pathology, medical genetics, and rehabilitation sciences.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Medical and Health Sciences',
      taxonomy_terms: 'Other medical sciences',
      uuid_parent: '95093901',
      url: '',
    },
    {
      internal_identifier: '48C2B750',
      uuid: '95093901',
      list_item: 'Medical and health sciences',
      description:
        'Medical and health sciences is a broad domain covering all aspects of studying, preventing, and treating human illnesses and promoting health through research, diagnosis, and intervention.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Medical and Health Sciences',
      taxonomy_terms: 'Medical and Health Sciences',
      uuid_parent: '',
      url: 'https://en.wikipedia.org/wiki/Health_sciences',
    },
    {
      internal_identifier: '5845D63E',
      uuid: 'D17D26A9',
      list_item: 'Biological sciences',
      description:
        'Biological sciences delve into the study of living organisms and their interactions with each other and their environments, encompassing fields such as ecology, evolution, genetics, and neuroscience.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Natural Sciences',
      taxonomy_terms: 'Biological sciences',
      uuid_parent: '18792041',
      url: 'https://en.wikipedia.org/wiki/Biological_sciences',
    },
    {
      internal_identifier: 'A76620F6',
      uuid: 'F2E6C052',
      list_item: 'Chemical sciences',
      description:
        'Chemical sciences explore the composition, structure, properties, and reactions of matter, particularly at the molecular and atomic levels, aiming to understand and manipulate chemical processes.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Natural Sciences',
      taxonomy_terms: 'Chemical sciences',
      uuid_parent: '18792041',
      url: 'https://en.wikipedia.org/wiki/Chemical_sciences',
    },
    {
      internal_identifier: 'F4DB5912',
      uuid: '5CB3D8C8',
      list_item: 'Computer and information sciences',
      description:
        'Computer and information sciences focus on the theory, experimentation, and engineering that form the basis for the design and use of computers, emphasizing software development, data analytics, and the study of algorithms.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Natural Sciences',
      taxonomy_terms: 'Computer and information sciences',
      uuid_parent: '18792041',
      url: '',
    },
    {
      internal_identifier: '7F7DED36',
      uuid: '51DE8B93',
      list_item: 'Earth and related environmental sciences',
      description:
        'Earth and related environmental sciences study the Earth, its composition, processes, and history, along with the impact of human activity on the planet, aiming to understand climate, natural resources, and geological hazards.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Natural Sciences',
      taxonomy_terms: 'Earth and related environmental sciences',
      uuid_parent: '18792041',
      url: 'https://en.wikipedia.org/wiki/Environmental_sciences',
    },
    {
      internal_identifier: '3F24B19A',
      uuid: 'E840EB86',
      list_item: 'Mathematics',
      description:
        'Mathematics encompasses the study of numbers, formulas, structures, shapes, spaces, and quantities, including changes. It divides into subdisciplines like number theory, algebra, geometry, and analysis. Mathematical work primarily involves discovering properties of abstract objects and using deductive reasoning to prove them, employing theorems, axioms, and foundational truths as bases for such proofs. There\'\'s no unified definition of the field among mathematicians.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Natural Sciences',
      taxonomy_terms: 'Mathematics',
      uuid_parent: '18792041',
      url: 'https://en.wikipedia.org/wiki/Mathematics',
    },
    {
      internal_identifier: '3FA4B19A',
      uuid: '2581C431',
      list_item: 'Natural sciences',
      description:
        'Natural sciences focus on understanding the natural world through observations and experiments. This field includes biology, chemistry, physics, and earth sciences, aiming to uncover the laws governing the universe.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Natural sciences',
      taxonomy_terms: 'Natural sciences',
      uuid_parent: '',
      url: '',
    },
    {
      internal_identifier: 'DA05C1B0',
      uuid: '54EDC966',
      list_item: 'Other natural sciences',
      description:
        'Other natural sciences entail specialized areas not fully covered by the main branches, such as astronomy, meteorology, and oceanography. These disciplines explore more specific aspects of the natural world and its phenomena.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Natural Sciences',
      taxonomy_terms: 'Other natural sciences',
      uuid_parent: '18792041',
      url: '',
    },
    {
      internal_identifier: 'F54245C5',
      uuid: '29CE1D1A',
      list_item: 'Physical sciences',
      description:
        'Physical science, a systematic branch of natural science, focuses on understanding and predicting phenomena in the non-living world, based on empirical evidence. It emphasizes the importance of scientific validation through peer review, repeatability, validity, and accuracy. Physical science is categorized distinctly from life science, together comprising the major branches of natural sciences.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Natural Sciences',
      taxonomy_terms: 'Physical sciences',
      uuid_parent: '18792041',
      url: 'https://en.wikipedia.org/wiki/Physical_sciences',
    },
    {
      internal_identifier: 'F713785D',
      uuid: '3CD09AF9',
      list_item: 'Economics and business',
      description:
        'Economics and business encompass the study of production, distribution, and consumption of goods and services, along with the management of financial resources, operations, and marketing in organizations.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Social Sciences',
      taxonomy_terms: 'Economics and business',
      uuid_parent: 'C930FF6D',
      url: 'https://en.wikipedia.org/wiki/Economics',
    },
    {
      internal_identifier: '28DBC4A7',
      uuid: 'C1E4C81A',
      list_item: 'Educational sciences',
      description:
        'Education sciences, traditionally known as pedagogy, focus on analyzing, understanding, and shaping education policy and practice. This field covers various topics like curriculum development, learning theories, and education leadership, drawing insights from disciplines such as history, philosophy, and psychology. Educational programs and theorists are often associated with terms like pedagogy and are critical in forming educational frameworks globally.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Social Sciences',
      taxonomy_terms: 'Educational sciences',
      uuid_parent: 'C930FF6D',
      url: 'https://en.wikipedia.org/wiki/Educational_science',
    },
    {
      internal_identifier: '0F66D90A',
      uuid: '1FD22581',
      list_item: 'Law',
      description:
        'Law focuses on the system of rules created and enforced through social or governmental institutions to regulate behavior. It includes various areas such as civil, criminal, and international law.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Social Sciences',
      taxonomy_terms: 'Law',
      uuid_parent: 'C930FF6D',
      url: 'https://en.wikipedia.org/wiki/Law',
    },
    {
      internal_identifier: '7A7184DA',
      uuid: 'B44F0E9D',
      list_item: 'Media and communications',
      description:
        'Media and communications involve the study of how information is conveyed and received through various mediums, including television, radio, print, and digital platforms. It explores the impact of messages on audiences and society.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Social Sciences',
      taxonomy_terms: 'Media and communications',
      uuid_parent: 'C930FF6D',
      url: 'https://en.wikipedia.org/wiki/Media_studies',
    },
    {
      internal_identifier: 'AEF3BC70',
      uuid: '1CE5D406',
      list_item: 'Other social sciences',
      description:
        'Other social sciences cover disciplines that examine societal aspects not encompassed by major branches, including anthropology, and regional studies, focusing on cultural, historical, and social dynamics.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Social Sciences',
      taxonomy_terms: 'Other social sciences',
      uuid_parent: 'C930FF6D',
      url: '',
    },
    {
      internal_identifier: '52332781',
      uuid: '14BAB0C3',
      list_item: 'Political science',
      description:
        'Political science examines politics through governance, power systems, and political activities, thought, and behavior analysis, including laws and constitutions. It branches into comparative politics, international relations, and political theory, positioning it as a vital social science discipline.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Social Sciences',
      taxonomy_terms: 'Political Science',
      uuid_parent: 'C930FF6D',
      url: 'https://en.wikipedia.org/wiki/Political_science',
    },
    {
      internal_identifier: 'CFBF4546',
      uuid: 'F2BC1716',
      list_item: 'Psychology',
      description:
        'Psychology explores the mind and behavior, covering human and nonhuman actions, conscious and unconscious phenomena, and mental processes like thoughts and feelings. It\'\'s a vast academic field that intersects natural and social sciences, connecting to neuroscience through the study of brains and focusing on individual and group behaviors as a social science.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Social Sciences',
      taxonomy_terms: 'Psychology',
      uuid_parent: 'C930FF6D',
      url: 'https://en.wikipedia.org/wiki/Psychology',
    },
    {
      internal_identifier: '4A34F8CD',
      uuid: '055BCEA8',
      list_item: 'Social and economic geography',
      description:
        'Social and economic geography looks at how people, cultures, and economies distribute across the world and interact with their environments. It studies patterns of resource use, urban development, and globalization effects.',
      description_source:
        'This decription was generated via the following AI prompt using OpenAI technolohy: \\\\"I give you a list of research and science related domains. You task is to generate a short description (30-50 words) of each domain. The goal is for someone to read the description and be able to tell whether their oorganisation or group fits under the domain\\\\"',
      taxonomy_parent: 'Social Sciences',
      taxonomy_terms: 'Social and economic geography',
      uuid_parent: 'C930FF6D',
      url: 'https://en.wikipedia.org/wiki/Social_geography',
    },
    {
      internal_identifier: 'B91FC103',
      uuid: '04DFE4A5',
      list_item: 'Social sciences',
      description:
        'Social sciences, initially focused on sociology, now includes disciplines like anthropology, economics, psychology, and more, studying societies and interindividual relationships. It evolved from the 18th century, embracing both positivist methods akin to natural sciences and interpretivist approaches with social critique or symbolic interpretation. Modern social scientists often mix methodologies, and social research has become an interdisciplinary field with shared goals and methods.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Social Sciences',
      taxonomy_terms: '',
      uuid_parent: '',
      url: 'https://en.wikipedia.org/wiki/Social_science',
    },
    {
      internal_identifier: '64BB84FC',
      uuid: 'C930FF6D',
      list_item: 'Sociology',
      description:
        'Sociology is the study of human society, analyzing social behavior, relationships, culture, and social interaction. Spanning both social sciences and humanities, it employs empirical research and critical analysis to understand social order and change. Sociologists examine everything from individual interactions and social structures to broader societal issues, applying findings to social policy and exploring subjects like stratification, mobility, religion, law, gender, the digital divide, health, economy, and education.',
      description_source:
        'This decription was generated via the wikipedia page and the following AI prompt using OpenAI technology: \\\\"I give you a text which explains a research domain. Your task is to shorten the text so it is between 30 and 60 words long. The goal is to have a short description of the domain. You are not allowed to add any information which is not already present in the text.\\\\"',
      taxonomy_parent: 'Social Sciences',
      taxonomy_terms: 'Sociology',
      uuid_parent: 'C930FF6D',
      url: 'https://en.wikipedia.org/wiki/Sociology',
    },
  ]

  return disciplines.map(
    discipline =>
      ({
        label: discipline.list_item,
        value: discipline.internal_identifier,
        secondarySearch: discipline.description,
        description: discipline.description,
      } satisfies DataSource),
  )
}
