import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
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
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { ListProjectsQueryDto } from './dto/list-projects.query.dto';

@ApiTags('projects')
@ApiBearerAuth('JWT')
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a project in a team' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() actor: Actor) {
    return this.projectService.create(dto, actor);
  }

  @Get()
  @ApiOperation({
    summary: 'List projects you can access (paginated)',
    description:
      'Query: teamId filter; page (default 1), limit (default 20, max 100), sortBy (id | name | createdAt | updatedAt), order (asc | desc).',
  })
  findAll(@Query() query: ListProjectsQueryDto, @CurrentUser() actor: Actor) {
    return this.projectService.findAll(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  findById(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: Actor) {
    return this.projectService.findById(id, actor);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a project' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.projectService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a project' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: Actor) {
    return this.projectService.remove(id, actor);
  }

  @Post(':id/members')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a member to a project' })
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddProjectMemberDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.projectService.addMember(id, dto.userId, actor);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List members of a project' })
  listMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: Actor,
  ) {
    return this.projectService.listMembers(id, actor);
  }
}
