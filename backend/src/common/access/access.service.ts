import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Actor } from '../types/actor.type';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  isAdmin(actor: Actor): boolean {
    return actor.role === Role.ADMIN;
  }

  /** Team exists + actor is ADMIN or a team member. */
  async assertTeamAccess(actor: Actor, teamId: number): Promise<void> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true },
    });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    if (this.isAdmin(actor)) {
      return;
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: actor.id, teamId } },
    });
    if (!membership) {
      throw new ForbiddenException('You do not have access to this team');
    }
  }

  /**
   * Project exists + actor is ADMIN, a member of the project's team,
   * or a direct project member.
   */
  async assertProjectAccess(actor: Actor, projectId: number): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, teamId: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (this.isAdmin(actor)) {
      return;
    }

    const [teamMembership, projectMembership] = await Promise.all([
      this.prisma.teamMember.findUnique({
        where: {
          userId_teamId: { userId: actor.id, teamId: project.teamId },
        },
      }),
      this.prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: actor.id, projectId },
        },
      }),
    ]);

    if (!teamMembership && !projectMembership) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  teamListFilter(actor: Actor): Prisma.TeamWhereInput {
    if (this.isAdmin(actor)) {
      return {};
    }
    return { members: { some: { userId: actor.id } } };
  }

  projectListFilter(actor: Actor, teamId?: number): Prisma.ProjectWhereInput {
    const isolation: Prisma.ProjectWhereInput = this.isAdmin(actor)
      ? {}
      : {
          OR: [
            { team: { members: { some: { userId: actor.id } } } },
            { members: { some: { userId: actor.id } } },
          ],
        };

    if (teamId === undefined) {
      return isolation;
    }

    return { AND: [{ teamId }, isolation] };
  }

  taskListFilter(actor: Actor, projectId?: number): Prisma.TaskWhereInput {
    const isolation: Prisma.TaskWhereInput = this.isAdmin(actor)
      ? {}
      : {
          project: {
            OR: [
              { team: { members: { some: { userId: actor.id } } } },
              { members: { some: { userId: actor.id } } },
            ],
          },
        };

    if (projectId === undefined) {
      return isolation;
    }

    return { AND: [{ projectId }, isolation] };
  }
}
