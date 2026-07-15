import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const projectSelect = {
  id: true,
  name: true,
  teamId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    const team = await this.prisma.team.findUnique({
      where: { id: dto.teamId },
    });
    if (!team) {
      throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
    }

    return this.prisma.project.create({
      data: { name: dto.name, teamId: dto.teamId },
      select: projectSelect,
    });
  }

  async findAll(teamId?: number) {
    return this.prisma.project.findMany({
      where: teamId !== undefined ? { teamId } : undefined,
      select: projectSelect,
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: {
        ...projectSelect,
        team: { select: { id: true, name: true } },
        _count: { select: { members: true, tasks: true } },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: number, dto: UpdateProjectDto) {
    await this.findById(id);

    if (!dto.name) {
      throw new BadRequestException('No fields to update');
    }

    return this.prisma.project.update({
      where: { id },
      data: { name: dto.name },
      select: projectSelect,
    });
  }

  async remove(id: number) {
    await this.findById(id);

    await this.prisma.project.delete({ where: { id } });
    return { message: `Project ${id} deleted` };
  }

  async addMember(projectId: number, userId: number) {
    const project = await this.findById(projectId);

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

  async listMembers(projectId: number) {
    await this.findById(projectId);

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
