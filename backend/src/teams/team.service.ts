import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTeamDto) {
    return this.prisma.team.create({
      data: { name: dto.name },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async findAll() {
    return this.prisma.team.findMany({
      select: { id: true, name: true, createdAt: true },
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        // `_count: true` returns counts for all Team relations (projects, members).
        _count: true,
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    return team;
  }

  async addMember(teamId: number, userId: number) {
    console.log('addMember', teamId, userId);
    await this.findById(teamId);

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

  async listMembers(teamId: number) {
    await this.findById(teamId);

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
