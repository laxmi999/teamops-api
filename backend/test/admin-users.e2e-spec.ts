import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, registerAndLogin } from './e2e-app';

describe('Admin users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const password = 'password123';
  const adminEmail = `e2e-admin-adm-${stamp}@example.com`;
  const managerEmail = `e2e-admin-mgr-${stamp}@example.com`;
  const userEmail = `e2e-admin-user-${stamp}@example.com`;
  const createdEmail = `e2e-admin-created-${stamp}@example.com`;

  let admin: { token: string; id: number };
  let manager: { token: string; id: number };
  let user: { token: string; id: number };
  let createdUserId: number;

  const emails = [adminEmail, managerEmail, userEmail, createdEmail];

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);

    admin = await registerAndLogin(app, adminEmail, password);
    manager = await registerAndLogin(app, managerEmail, password);
    user = await registerAndLogin(app, userEmail, password);

    await prisma.user.update({
      where: { id: admin.id },
      data: { role: Role.ADMIN },
    });
    await prisma.user.update({
      where: { id: manager.id },
      data: { role: Role.MANAGER },
    });

    // Re-login so the JWT carries the ADMIN role
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);
    admin.token = (login.body as { access_token: string }).access_token;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  it('rejects unauthenticated list with 401', async () => {
    await request(app.getHttpServer()).get('/admin/users').expect(401);
  });

  it('rejects USER and MANAGER list with 403', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(403);
  });

  it('lists all users for ADMIN', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: admin.id,
          email: adminEmail,
          role: 'ADMIN',
        }),
        expect.objectContaining({
          id: manager.id,
          email: managerEmail,
          role: 'MANAGER',
        }),
        expect.objectContaining({
          id: user.id,
          email: userEmail,
          role: 'USER',
        }),
      ]),
    );
  });

  it('rejects create from a non-ADMIN with 403', async () => {
    await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ email: createdEmail, password })
      .expect(403);
  });

  it('rejects invalid create payloads with 400', async () => {
    await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: 'not-an-email', password })
      .expect(400);

    await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: createdEmail, password: 'short' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: createdEmail, password, role: 'SUPERUSER' })
      .expect(400);
  });

  it('creates a user with the default USER role', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: createdEmail, password })
      .expect(201);

    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number) as number,
        email: createdEmail,
        role: 'USER',
      }),
    );
    createdUserId = (res.body as { id: number }).id;
  });

  it('rejects duplicate email with 409', async () => {
    await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: createdEmail, password })
      .expect(409);
  });

  it('returns 404 when updating the role of a user that does not exist', async () => {
    await request(app.getHttpServer())
      .patch('/admin/users/9999999/role')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'MANAGER' })
      .expect(404);
  });

  it('rejects an invalid role with 400', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/users/${createdUserId}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'SUPERUSER' })
      .expect(400);
  });

  it('updates a user role to MANAGER', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/users/${createdUserId}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'MANAGER' })
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({ id: createdUserId, role: 'MANAGER' }),
    );
  });

  it('promotes and demotes another ADMIN when more than one exists', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/users/${createdUserId}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'ADMIN' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch(`/admin/users/${createdUserId}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'USER' })
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({ id: createdUserId, role: 'USER' }),
    );
  });

  it('rejects an ADMIN demoting themselves with 400', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/users/${admin.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'USER' })
      .expect(400);
  });
});
