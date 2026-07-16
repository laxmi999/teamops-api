import {
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Controller,
  UseGuards,
} from '@nestjs/common';
import { AdminUserService } from './admin-user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { Actor } from '../common/types/actor.type';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUserController {
  constructor(private adminUserService: AdminUserService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  allUsers() {
    return this.adminUserService.allUsers();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAdminUserDto) {
    return this.adminUserService.create(dto);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.adminUserService.updateRole(id, dto.role, actor.id);
  }
}
