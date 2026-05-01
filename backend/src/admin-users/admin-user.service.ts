import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AdminUserService {
  constructor(private prisma: PrismaService) {}

  async allUsers() {
    const users = this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
    return users;
  }

  async updateRole(userId: number, role: Role) {
    const roleUpdate = this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
    return roleUpdate;
  }
}
