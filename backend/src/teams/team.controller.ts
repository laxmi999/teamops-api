import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  ParseIntPipe,
  //   Patch,
  //   Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TeamService } from './team.service';

@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post('create')
  create(@Body() body: { name: string }) {
    return this.teamService.create(body);
  }

  @Get()
  findAll() {
    return this.teamService.findAll();
  }

  @Get('/:id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.findById(id);
  }
}
