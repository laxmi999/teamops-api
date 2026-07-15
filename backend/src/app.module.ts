import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

import { UserModule } from './users/user.module';
import { AuthModule } from './auth/auth.module';
import { AdminUserModule } from './admin-users/admin-user.module';
import { TeamsModule } from './teams/team.module';
import { ProjectsModule } from './projects/project.module';
import { TasksModule } from './tasks/task.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    AdminUserModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
