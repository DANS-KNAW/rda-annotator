import { DataSource } from "@/types/datasource.interface";

interface VocabularyResponse {
  subject_scheme: string;
  scheme_uri: string;
  value_scheme: string;
  value_uri: string;
  namespace: string;
  additional_metadata?: Record<string, any>;
  deleted_at?: Date | null;
  updated_at: Date;
  created_at: Date;
}

interface FetchVocabulariesOptions {
  subject_scheme?: string;
  scheme_uri?: string;
  value_scheme?: string;
  value_uri?: string;
  namespace?: string;
  amount?: number;
  offset?: number;
  deleted?: boolean;
}

export default async function fetchOpenVocabularies(
  options: FetchVocabulariesOptions = {}
): Promise<DataSource[]> {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    // Construct the API URL
    const baseUrl = import.meta.env.WXT_API_ENDPOINT;
    const url = `${baseUrl}/vocabularies${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    // Fetch data from the API
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch vocabularies: ${response.status} ${response.statusText}`
      );
    }

    const vocabularies: VocabularyResponse[] = await response.json();

    return vocabularies.map(
      (vocab) =>
        ({
          label: vocab.value_scheme,
          value: vocab.value_uri,
          secondarySearch: `${vocab.subject_scheme} ${vocab.namespace}`,
          description: vocab.scheme_uri,
        } satisfies DataSource)
    );
  } catch (error) {
    console.error("Error fetching open vocabularies:", error);
    throw error;
  }
}
