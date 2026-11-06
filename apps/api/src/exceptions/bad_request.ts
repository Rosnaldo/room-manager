export class BadRequestException extends Error {
  status = 400;

  constructor(message: string, public details?: unknown) {
    super(message);
  }
}
