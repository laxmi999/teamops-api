import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  dueDate: true,
  projectId: true,
  assigneeId: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: { id: true, email: true } },
  project: { select: { id: true, name: true, teamId: true } },
} as const;

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTaskDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    await this.assertProjectMember(dto.projectId, dto.assigneeId);

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description ?? '',
        projectId: dto.projectId,
        assigneeId: dto.assigneeId,
        status: dto.status ?? TaskStatus.OPEN,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      select: taskSelect,
    });
  }

  async findAll(projectId?: number) {
    return this.prisma.task.findMany({
      where: projectId !== undefined ? { projectId } : undefined,
      select: taskSelect,
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: taskSelect,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: number, dto: UpdateTaskDto) {
    const existing = await this.findById(id);

    if (dto.assigneeId !== undefined) {
      await this.assertProjectMember(existing.projectId, dto.assigneeId);
    }

    const data: Prisma.TaskUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.assigneeId !== undefined) {
      data.assignee = { connect: { id: dto.assigneeId } };
    }
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate === null ? null : new Date(dto.dueDate);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    return this.prisma.task.update({
      where: { id },
      data,
      select: taskSelect,
    });
  }

  async remove(id: number) {
    await this.findById(id);
    await this.prisma.task.delete({ where: { id } });
    return { message: `Task ${id} deleted` };
  }

  private async assertProjectMember(projectId: number, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (!membership) {
      throw new BadRequestException('Assignee must be a member of the project');
    }
  }
}
