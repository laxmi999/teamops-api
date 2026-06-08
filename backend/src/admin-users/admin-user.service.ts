import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../users/user.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminUserService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

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

  // Create a new user
  async create(body: { email: string; password: string; role?: Role }) {
    const userExists = await this.userService.findByEmail(body.email);

    if (userExists) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        role: body.role || Role.USER,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return user;
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
