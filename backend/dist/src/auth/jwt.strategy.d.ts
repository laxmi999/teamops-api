import { Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(payload: JwtPayload): Promise<{
        id: number;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
}
export {};
