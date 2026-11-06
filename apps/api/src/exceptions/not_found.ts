import type { MessageParams } from '../i18n';
import { HttpException } from './http';

export class NotFoundException extends HttpException {
  constructor(template: string, params?: MessageParams) {
    super(404, template, params);
  }
}
