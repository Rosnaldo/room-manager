import type { MessageParams } from '../i18n';
import { HttpException } from './http';

export class ForbiddenException extends HttpException {
  constructor(template: string, params?: MessageParams) {
    super(403, template, params);
  }
}
