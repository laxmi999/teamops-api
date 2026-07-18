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
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@ApiTags('tasks')
@ApiBearerAuth('JWT')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a task in a project' })
  create(@Body() dto: CreateTaskDto, @CurrentUser() actor: Actor) {
    return this.taskService.create(dto, actor);
  }

  @Get()
  @ApiOperation({
    summary: 'List tasks you can access',
    description: 'Optional query: projectId to filter by project.',
  })
  findAll(@CurrentUser() actor: Actor, @Query('projectId') projectId?: string) {
    const parsed =
      projectId !== undefined && projectId !== ''
        ? Number(projectId)
        : undefined;
    return this.taskService.findAll(
      actor,
      parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  findById(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: Actor) {
    return this.taskService.findById(id, actor);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update task status',
    description: 'Allowed for the assignee or an ADMIN.',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.taskService.updateStatus(id, dto, actor);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a task' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.taskService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a task' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: Actor) {
    return this.taskService.remove(id, actor);
  }
}
