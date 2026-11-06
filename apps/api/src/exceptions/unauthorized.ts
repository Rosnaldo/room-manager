export class UnauthorizedException extends Error {
  status = 401;

  constructor(message: string) {
    super(message);
  }
}
