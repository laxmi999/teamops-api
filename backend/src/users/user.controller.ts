import {
  Controller,
  Post,
  Get,
  Body,
  Injectable,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Injectable()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('findById')
  @HttpCode(HttpStatus.OK)
  findById(@Body() body: { id: number }) {
    return this.userService.findById(body.id);
  }

  @Get('findByEmail')
  @HttpCode(HttpStatus.OK)
  findByEmail(@Body() body: { email: string }) {
    return this.userService.findByEmail(body.email);
  }
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: { email: string; password: string }) {
    return this.userService.create(body);
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  profile(@CurrentUser('id') id: number) {
    return this.userService.profile(id);
  }
}
