export class NotFoundException extends Error {
  status = 404;

  constructor(message: string) {
    super(message);
  }
}
