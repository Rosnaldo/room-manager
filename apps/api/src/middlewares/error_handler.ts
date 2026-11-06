import type { ErrorRequestHandler } from 'express';

import logger from '../logger';
import { resolveLocale, translate } from '../i18n';
import { zodDetails } from '../i18n/zod';
import { HttpException, type TranslatedDetails } from '../exceptions/http';
import { BadRequestException } from '../exceptions/bad_request';

/** Errors body-parser raises before our code runs (malformed JSON, …): their own messages are technical. */
const BODY_PARSER_MESSAGES: Record<string, string> = {
  'entity.parse.failed': 'request body is not valid JSON',
  'entity.too.large': 'request body is too large',
  'encoding.unsupported': 'unsupported request body encoding',
  'charset.unsupported': 'unsupported request body encoding',
};

function isBodyParserError(err: unknown): err is Error & { status: number; type: string } {
  return err instanceof Error && typeof (err as { status?: unknown }).status === 'number' && 'type' in err;
}

/** Sends every error translated into the client's language (Accept-Language, Portuguese by default). */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  const locale = resolveLocale(req.headers['accept-language']);

  if (err instanceof HttpException && err.status < 500) {
    let details: TranslatedDetails | undefined;
    if (err instanceof BadRequestException && err.zodError) {
      details = zodDetails(err.zodError, locale);
    } else if (err.details) {
      details = Object.fromEntries(
        Object.entries(err.details).map(([field, msgs]) => [
          field,
          msgs.map((m) => (typeof m === 'string' ? translate(locale, m) : translate(locale, m.template, m.params))),
        ]),
      );
    }
    res.status(err.status).json({ message: translate(locale, err.template, err.params), ...(details && { details }) });
    return;
  }

  if (isBodyParserError(err) && err.status < 500) {
    res.status(err.status).json({ message: translate(locale, BODY_PARSER_MESSAGES[err.type] ?? 'invalid request') });
    return;
  }

  logger.error(err, 'unhandled error');
  res.status(500).json({ message: translate(locale, 'internal server error') });
};
