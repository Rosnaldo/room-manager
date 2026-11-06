import { pt } from './pt';

/**
 * Error messages are written in English in the code (and logged that way), as templates with
 * `{name}` placeholders. They are translated only when the response is sent, into the language
 * the client asks for in Accept-Language — Portuguese unless it asks for English.
 */
export type Locale = 'pt' | 'en';

export const DEFAULT_LOCALE: Locale = 'pt';

export type MessageParams = Record<string, string | number>;

const catalogs: Record<Locale, Record<string, string>> = { pt, en: {} };

export function interpolate(template: string, params: MessageParams = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

/** Translates an English template; text without a translation is returned as written. */
export function translate(locale: Locale, template: string, params?: MessageParams): string {
  return interpolate(catalogs[locale][template] ?? template, params);
}

/** First supported language in an Accept-Language header (`en-US,en;q=0.9` → en), else the default. */
export function resolveLocale(acceptLanguage: string | undefined): Locale {
  const preferred = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...rest] = part.trim().split(';');
      const q = rest.find((p) => p.trim().startsWith('q='));
      return { lang: tag.trim().slice(0, 2).toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((p) => p.lang && p.q > 0)
    .sort((a, b) => b.q - a.q);

  const match = preferred.find((p): p is { lang: Locale; q: number } => p.lang in catalogs);
  return match?.lang ?? DEFAULT_LOCALE;
}
