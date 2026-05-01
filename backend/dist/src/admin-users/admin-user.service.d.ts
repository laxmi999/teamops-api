import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
export declare class AdminUserService {
    private prisma;
    constructor(prisma: PrismaService);
    allUsers(): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }[]>;
    updateRole(userId: number, role: Role): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
}
