import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    register(body: string): {
        message: string;
        data: string;
    };
}
