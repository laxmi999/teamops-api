import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { UserModule } from '../users/user.module';
import type { StringValue } from 'ms';

@Module({
  providers: [AuthService, JwtStrategy, RolesGuard],
  controllers: [AuthController],
  imports: [
    UserModule,
    PassportModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN as StringValue) || '15m',
      },
    }),
  ],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
