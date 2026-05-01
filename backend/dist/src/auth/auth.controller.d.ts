import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(body: {
        email: string;
        password: string;
    }): Promise<{
        email: string;
        role: import("@prisma/client").$Enums.Role;
        id: number;
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
