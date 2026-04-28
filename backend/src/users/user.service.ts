import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  register(body: string) {
    body.toString();
    throw new Error('Method not implemented.');
  }
}
