export class ConflictException extends Error {
  status = 409;

  constructor(message: string) {
    super(message);
  }
}
