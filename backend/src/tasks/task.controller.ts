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
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTaskDto) {
    return this.taskService.create(dto);
  }

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    const parsed =
      projectId !== undefined && projectId !== ''
        ? Number(projectId)
        : undefined;
    return this.taskService.findAll(
      parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined,
    );
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaskDto) {
    return this.taskService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.remove(id);
  }
}
