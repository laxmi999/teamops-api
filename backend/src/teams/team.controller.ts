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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { Actor } from '../common/types/actor.type';
import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';

@ApiTags('teams')
@ApiBearerAuth('JWT')
@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a team' })
  create(@Body() dto: CreateTeamDto, @CurrentUser() actor: Actor) {
    return this.teamService.create(dto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'List teams you can access' })
  findAll(@CurrentUser() actor: Actor) {
    return this.teamService.findAll(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a team by ID' })
  findById(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: Actor) {
    return this.teamService.findById(id, actor);
  }

  @Post(':id/members')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a member to a team' })
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.teamService.addMember(id, dto.userId, actor);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List members of a team' })
  listMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: Actor,
  ) {
    return this.teamService.listMembers(id, actor);
  }
}
