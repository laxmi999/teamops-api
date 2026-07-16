import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access/access.service';
import type { Actor } from '../common/types/actor.type';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async create(dto: CreateTeamDto, actor: Actor) {
    // Creator becomes a member so they can see/manage the team after create.
    return this.prisma.team.create({
      data: {
        name: dto.name,
        members: { create: { userId: actor.id } },
      },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async findAll(actor: Actor) {
    return this.prisma.team.findMany({
      where: this.access.teamListFilter(actor),
      select: { id: true, name: true, createdAt: true },
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number, actor: Actor) {
    await this.access.assertTeamAccess(actor, id);

    const team = await this.prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: true,
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    return team;
  }

  async addMember(teamId: number, userId: number, actor: Actor) {
    await this.access.assertTeamAccess(actor, teamId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const existing = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this team');
    }

    return this.prisma.teamMember.create({
      data: { teamId, userId },
      select: {
        joinedAt: true,
        user: { select: { id: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
      },
    });
  }

  async listMembers(teamId: number, actor: Actor) {
    await this.access.assertTeamAccess(actor, teamId);

    return this.prisma.teamMember.findMany({
      where: { teamId },
      select: {
        joinedAt: true,
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }
}
