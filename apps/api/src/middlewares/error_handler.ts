import type { ErrorRequestHandler } from 'express';

import logger from '../logger';

interface HttpError {
  status: number;
  message: string;
  details?: Record<string, string[]>;
}

/** Our exceptions and express/body-parser errors (e.g. malformed JSON) carry a numeric `status`. */
function isHttpError(err: unknown): err is HttpError {
  return err instanceof Error && typeof (err as Partial<HttpError>).status === 'number';
}

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (!isHttpError(err) || err.status >= 500) {
    logger.error(err, 'unhandled error');
    res.status(500).json({ message: 'internal server error' });
    return;
  }

  res.status(err.status).json({ message: err.message, ...(err.details && { details: err.details }) });
};
