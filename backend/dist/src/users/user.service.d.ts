import { PrismaService } from '../prisma/prisma.service';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<{
        id: number;
        email: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findById(id: number): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
    create(body: {
        email: string;
        password: string;
    }): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
    profile(id: number): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
}
