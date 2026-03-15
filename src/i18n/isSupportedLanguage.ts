import { supportedLanguages } from "./messages";

import type { SupportedLanguage } from "./messages";

export default function isSupportedLanguage(value: string): value is SupportedLanguage {
  return supportedLanguages.includes(value as SupportedLanguage);
}
