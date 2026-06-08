import { Module } from '@nestjs/common';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';
import { UserService } from '../users/user.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminUserController],
  providers: [AdminUserService, UserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
