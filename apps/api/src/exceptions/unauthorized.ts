import type { MessageParams } from '../i18n';
import { HttpException } from './http';

export class UnauthorizedException extends HttpException {
  constructor(template: string, params?: MessageParams) {
    super(401, template, params);
  }
}
