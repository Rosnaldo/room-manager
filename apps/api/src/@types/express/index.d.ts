interface IUserKc {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

declare global {
  namespace Express {
    interface Request {
      userKc: IUserKc;
    }
  }
}

export {};
