import { fr, type TranslationKey } from "./fr.js";

type TranslationParams = Record<string, string | number>;

export const t = (key: TranslationKey, params?: TranslationParams): string => {
  const template = fr[key];
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, token) => {
    const value = params[token];
    return value === undefined ? match : String(value);
  });
};

export { fr };
export type { TranslationKey };
