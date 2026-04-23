export const SUPPORTED_LANGUAGES = ["pt", "en", "es", "fr"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isValidLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}
