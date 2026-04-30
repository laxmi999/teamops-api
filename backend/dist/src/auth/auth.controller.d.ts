import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(body: {
        email: string;
        password: string;
    }): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        user: {
            id: number;
            email: string;
        };
        access_token: string;
    }>;
}
