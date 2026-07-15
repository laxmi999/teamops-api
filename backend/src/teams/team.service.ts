import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  // Create a new team
  async create(body: { name: string }) {
    const team = await this.prisma.team.create({
      data: { name: body.name },
      select: { id: true, name: true },
    });
    return team;
  }

  // Get all teams
  async findAll() {
    const teams = await this.prisma.team.findMany({
      select: { id: true, name: true },
    });
    return teams;
  }

  // Get a team by ID
  async findById(id: number) {
    return this.prisma.team.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
  }
}
