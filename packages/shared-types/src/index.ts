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
    resources: string[];
}
