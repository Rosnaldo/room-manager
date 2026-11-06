import { type IUser } from '@repo/shared-types';

interface IUserKc {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

declare global {
  namespace Express {
    interface Request {
      currentUser: IUser;
      userKc: IUserKc;
    }
  }
}

export {};
