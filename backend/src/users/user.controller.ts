import { Controller, Post, Body, Injectable } from '@nestjs/common';
import { UserService } from './user.service';

@Injectable()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  register(@Body() body: string) {
    return {
      message: 'User registered successfully',
      data: body,
    };
  }
}
