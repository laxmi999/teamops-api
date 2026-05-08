import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../users/user.service';
export declare class AuthService {
    private jwtService;
    private prisma;
    private userService;
    constructor(jwtService: JwtService, prisma: PrismaService, userService: UserService);
    register(body: {
        email: string;
        password: string;
    }): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
    login(email: string, password: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    refresh(refreshToken: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    validateUser(id: number): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
}
