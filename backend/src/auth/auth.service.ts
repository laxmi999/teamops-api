import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  // Register a new user
  async register(body: { email: string; password: string }) {
    const hashedPassword = await bcrypt.hash(body.password, 10);

    const user = await this.userService.create({
      email: body.email,
      password: hashedPassword,
    });

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user.id.toString(), user.email);
    return {
      user: {
        id: user.id,
        email: user.email,
      },
      access_token: token,
    };
  }

  async validateUser(id: number) {
    return this.userService.findById(id);
  }

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email: email };
    return this.jwtService.sign(payload);
  }
}
