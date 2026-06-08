import {
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Body,
  Controller,
  UseGuards,
} from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { AdminUserService } from './admin-user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin-users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUserController {
  constructor(private adminUserService: AdminUserService) {}

  @Get('allUsers')
  @HttpCode(HttpStatus.OK)
  async allUsers() {
    return this.adminUserService.allUsers();
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: { email: string; password: string; role?: Role }) {
    return this.adminUserService.create(body);
  }

  @Post('updateRole')
  @HttpCode(HttpStatus.OK)
  async updateRole(@Body() body: { userId: number; role: Role }) {
    return this.adminUserService.updateRole(body.userId, body.role);
  }
}
