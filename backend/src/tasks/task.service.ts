import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access/access.service';
import type { Actor } from '../common/types/actor.type';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

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
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async create(dto: CreateTaskDto, actor: Actor) {
    await this.access.assertProjectAccess(actor, dto.projectId);
    await this.assertAssigneeIsProjectMember(dto.projectId, dto.assigneeId);

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

  async findAll(actor: Actor, projectId?: number) {
    if (projectId !== undefined) {
      await this.access.assertProjectAccess(actor, projectId);
    }

    return this.prisma.task.findMany({
      where: this.access.taskListFilter(actor, projectId),
      select: taskSelect,
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number, actor: Actor) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: taskSelect,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    await this.access.assertProjectAccess(actor, task.projectId);
    return task;
  }

  async update(id: number, dto: UpdateTaskDto, actor: Actor) {
    const existing = await this.findById(id, actor);

    if (dto.assigneeId !== undefined) {
      await this.assertAssigneeIsProjectMember(
        existing.projectId,
        dto.assigneeId,
      );
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

  async remove(id: number, actor: Actor) {
    await this.findById(id, actor);
    await this.prisma.task.delete({ where: { id } });
    return { message: `Task ${id} deleted` };
  }

  /** Assignees (or ADMIN) may update only the task status. */
  async updateStatus(id: number, dto: UpdateTaskStatusDto, actor: Actor) {
    const task = await this.findById(id, actor);

    const isAssignee = task.assigneeId === actor.id;
    const isAdmin = actor.role === Role.ADMIN;
    if (!isAssignee && !isAdmin) {
      throw new ForbiddenException(
        'Only the task assignee can change the status',
      );
    }

    return this.prisma.task.update({
      where: { id },
      data: { status: dto.status },
      select: taskSelect,
    });
  }

  private async assertAssigneeIsProjectMember(
    projectId: number,
    userId: number,
  ) {
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
