import { interpolate, type MessageParams } from '../i18n';

/** Field → messages; each message is an English template, translated when the response is sent. */
export type ErrorDetails = Record<string, string[]>;

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
