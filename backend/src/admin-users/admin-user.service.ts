import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../users/user.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';

@Injectable()
export class AdminUserService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async allUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async create(dto: CreateAdminUserDto) {
    const userExists = await this.userService.findByEmail(dto.email);

    if (userExists) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: dto.role ?? Role.USER,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateRole(userId: number, role: Role, actorId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.role === Role.ADMIN && role !== Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote the last remaining ADMIN');
      }
    }

    if (userId === actorId && role !== Role.ADMIN && user.role === Role.ADMIN) {
      throw new BadRequestException(
        'Admins cannot demote themselves; ask another ADMIN',
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }
}
