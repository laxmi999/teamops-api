import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
export declare class AuthService {
    private jwtService;
    private userService;
    constructor(jwtService: JwtService, userService: UserService);
    register(body: {
        email: string;
        password: string;
    }): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
    login(email: string, password: string): Promise<{
        user: {
            id: number;
            email: string;
        };
        access_token: string;
    }>;
    validateUser(id: number): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
    private generateToken;
}
