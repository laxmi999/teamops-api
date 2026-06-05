import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TeamService } from './team.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamsModule {}
