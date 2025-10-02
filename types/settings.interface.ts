export interface ISettings {
  vocabularies: VocabularySettings;
}

interface VocabularySettings {
  [key: string]: boolean;
}
