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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProjectDto) {
    return this.projectService.create(dto);
  }

  @Get()
  findAll(@Query('teamId') teamId?: string) {
    const parsed =
      teamId !== undefined && teamId !== '' ? Number(teamId) : undefined;
    return this.projectService.findAll(
      parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined,
    );
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    return this.projectService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.remove(id);
  }

  @Post(':id/members')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projectService.addMember(id, dto.userId);
  }

  @Get(':id/members')
  listMembers(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.listMembers(id);
  }
}
