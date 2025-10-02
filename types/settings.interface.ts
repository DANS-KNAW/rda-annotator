export interface ISettings {
  vocabularies: VocabularySettings;
  rememberChoices?: Record<string, string | string[]>;
}
interface VocabularySettings {
  [key: string]: boolean;
}
