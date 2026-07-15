import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTeamDto) {
    return this.teamService.create(dto);
  }

  @Get()
  findAll() {
    return this.teamService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.findById(id);
  }

  @Post(':id/members')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddTeamMemberDto,
  ) {
    return this.teamService.addMember(id, dto.userId);
  }

  @Get(':id/members')
  listMembers(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.listMembers(id);
  }
}
