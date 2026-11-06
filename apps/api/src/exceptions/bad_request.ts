import type { ZodError } from 'zod';

import type { MessageParams } from '../i18n';
import { HttpException, type ErrorDetails } from './http';

export class BadRequestException extends HttpException {
  constructor(
    template: string,
    options: { params?: MessageParams; details?: ErrorDetails; zodError?: ZodError } = {},
  ) {
    super(400, template, options.params, options.details);
    this.zodError = options.zodError;
  }

  /** Validation failure, kept whole so its issues can be translated per request. */
  readonly zodError?: ZodError;
}
