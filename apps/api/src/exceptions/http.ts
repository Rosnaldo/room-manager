import { interpolate, type MessageParams } from '../i18n';

/** An English template, or one with `{placeholders}` and their values. Translated when the response is sent. */
export type DetailMessage = string | { template: string; params: MessageParams };

/** Field → messages. */
export type ErrorDetails = Record<string, DetailMessage[]>;

/** Field → messages as sent to the client (already translated). */
export type TranslatedDetails = Record<string, string[]>;

/**
 * Base for the errors our code throws. `message` is the English text (what gets logged);
 * `template` and `params` let the error handler translate it for the client.
 */
export class HttpException extends Error {
  constructor(
    public readonly status: number,
    public readonly template: string,
    public readonly params: MessageParams = {},
    public readonly details?: ErrorDetails,
  ) {
    super(interpolate(template, params));
  }
}
