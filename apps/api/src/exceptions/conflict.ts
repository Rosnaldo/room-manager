import type { MessageParams } from '../i18n';
import { HttpException } from './http';

export class ConflictException extends HttpException {
  constructor(template: string, params?: MessageParams) {
    super(409, template, params);
  }
}
