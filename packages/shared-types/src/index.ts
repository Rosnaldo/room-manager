export const UserRole = {
    admin: 'admin',
    customer: 'customer',
} as const;

export interface IUser {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    role: keyof typeof UserRole;
    createdAt: Date;
    updatedAt: Date;
}

export interface Pagination {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    size: number;
};

export interface IRoom {
    id: number;
    name: string;
    maxCapacity: number;
    /** longest reservation allowed in this room, `HH:mm` (e.g. "04:00") */
    maxDuration: string;
    resources: string[];
}

/** A room booked by a user. Dates are local wall-clock time, `YYYY-MM-DDTHH:mm:ss`, no timezone. */
export interface IReservedRoom {
    id: number;
    userId: number;
    roomId: number;
    startAt: string;
    endAt: string;
}
