import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, registerAndLogin } from './e2e-app';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const password = 'password123';
  const email = `e2e-users-${stamp}@example.com`;
  const otherEmail = `e2e-users-other-${stamp}@example.com`;

  let user: { token: string; id: number };
  let otherUser: { token: string; id: number };

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);

    user = await registerAndLogin(app, email, password);
    otherUser = await registerAndLogin(app, otherEmail, password);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [email, otherEmail] } },
    });
    await app.close();
  });

  it('rejects unauthenticated profile with 401', async () => {
    await request(app.getHttpServer()).get('/users/profile').expect(401);
  });

  it('rejects an invalid token with 401', async () => {
    await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
  });

  it('returns the profile of the authenticated user', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        id: user.id,
        email,
        role: 'USER',
      }),
    );

    expect(Object.keys(res.body as Record<string, unknown>)).not.toContain(
      'password',
    );
  });

  it('returns each user their own profile, not someone else', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${otherUser.token}`)
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        id: otherUser.id,
        email: otherEmail,
      }),
    );
  });
});
