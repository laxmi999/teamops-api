import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@CurrentUser('id') id: number) {
    return this.userService.profile(id);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: { email: string; password: string }) {
    return this.userService.create(body);
  }
}
