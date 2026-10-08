import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access/access.service';
import type { Actor } from '../common/types/actor.type';
import { paginate, skipTake } from '../common/pagination/paginate';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects.query.dto';

const projectSelect = {
  id: true,
  name: true,
  teamId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async create(dto: CreateProjectDto, actor: Actor) {
    await this.access.assertTeamAccess(actor, dto.teamId);

    return this.prisma.project.create({
      data: {
        name: dto.name,
        teamId: dto.teamId,
        members: { create: { userId: actor.id } },
      },
      select: {
        ...projectSelect,
        members: { select: { userId: true } },
      },
    });
  }

  async findAll(actor: Actor, query: ListProjectsQueryDto) {
    if (query.teamId !== undefined) {
      await this.access.assertTeamAccess(actor, query.teamId);
    }

    const where = this.access.projectListFilter(actor, query.teamId);

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        select: projectSelect,
        orderBy: {
          [query.sortBy]: query.order,
        } as Prisma.ProjectOrderByWithRelationInput,
        ...skipTake(query),
      }),
      this.prisma.project.count({ where }),
    ]);

    return paginate(data, total, query);
  }

  async findById(id: number, actor: Actor) {
    await this.access.assertProjectAccess(actor, id);

    const project = await this.prisma.project.findUnique({
      where: { id },
      select: {
        ...projectSelect,
        team: { select: { id: true, name: true } },
        _count: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: number, dto: UpdateProjectDto, actor: Actor) {
    await this.access.assertProjectAccess(actor, id);

    if (!dto.name) {
      throw new BadRequestException('No fields to update');
    }

    return this.prisma.project.update({
      where: { id },
      data: { name: dto.name },
      select: projectSelect,
    });
  }

  async remove(id: number, actor: Actor) {
    await this.access.assertProjectAccess(actor, id);

    await this.prisma.$transaction([
      this.prisma.task.updateMany({
        where: { projectId: id },
        data: { projectId: null },
      }),
      this.prisma.projectMember.deleteMany({ where: { projectId: id } }),
      this.prisma.project.delete({ where: { id } }),
    ]);
    return { message: `Project ${id} deleted` };
  }

  async addMember(projectId: number, userId: number, actor: Actor) {
    const project = await this.findById(projectId, actor);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const teamMember = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: { userId, teamId: project.teamId },
      },
    });
    if (!teamMember) {
      throw new BadRequestException(
        'User must be a team member before joining the project',
      );
    }

    const existing = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }

    return this.prisma.projectMember.create({
      data: { projectId, userId },
      select: {
        joinedAt: true,
        user: { select: { id: true, email: true, role: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  async listMembers(projectId: number, actor: Actor) {
    await this.access.assertProjectAccess(actor, projectId);

    return this.prisma.projectMember.findMany({
      where: { projectId },
      select: {
        joinedAt: true,
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }
}
