import { Role } from '@prisma/client';
import { AdminUserService } from './admin-user.service';
export declare class AdminUserController {
    private adminUserService;
    constructor(adminUserService: AdminUserService);
    allUsers(): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }[]>;
    updateRole(body: {
        userId: number;
        role: Role;
    }): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
}
