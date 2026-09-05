import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, registerAndLogin } from './e2e-app';

describe('Teams (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const password = 'password123';
  const managerEmail = `e2e-teams-mgr-${stamp}@example.com`;
  const userEmail = `e2e-teams-user-${stamp}@example.com`;
  const outsiderEmail = `e2e-teams-out-${stamp}@example.com`;
  const teamName = `e2e-team-${stamp}`;

  let manager: { token: string; id: number };
  let member: { token: string; id: number };
  let outsider: { token: string; id: number };
  let teamId: number;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);

    manager = await registerAndLogin(app, managerEmail, password);
    member = await registerAndLogin(app, userEmail, password);
    outsider = await registerAndLogin(app, outsiderEmail, password);

    await prisma.user.update({
      where: { id: manager.id },
      data: { role: Role.MANAGER },
    });
  });

  afterAll(async () => {
    await prisma.teamMember.deleteMany({
      where: {
        user: {
          email: { in: [managerEmail, userEmail, outsiderEmail] },
        },
      },
    });
    await prisma.team.deleteMany({ where: { name: teamName } });
    await prisma.user.deleteMany({
      where: { email: { in: [managerEmail, userEmail, outsiderEmail] } },
    });
    await app.close();
  });

  it('rejects unauthenticated create with 401', async () => {
    await request(app.getHttpServer())
      .post('/teams')
      .send({ name: teamName })
      .expect(401);
  });

  it('rejects USER create with 403', async () => {
    await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${member.token}`)
      .send({ name: teamName })
      .expect(403);
  });

  it('lets MANAGER create a team and list it', async () => {
    const created = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ name: teamName })
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number) as number,
        name: teamName,
      }),
    );
    teamId = (created.body as { id: number }).id;

    const list = await request(app.getHttpServer())
      .get('/teams')
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    expect(list.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: teamId, name: teamName }),
      ]),
    );

    const one = await request(app.getHttpServer())
      .get(`/teams/${teamId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    expect(one.body).toEqual(
      expect.objectContaining({ id: teamId, name: teamName }),
    );
  });

  it('hides the team from a user who is not a member', async () => {
    const list = await request(app.getHttpServer())
      .get('/teams')
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(200);

    expect(list.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: teamId })]),
    );

    await request(app.getHttpServer())
      .get(`/teams/${teamId}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(403);
  });

  it('adds a member who can then see the team; duplicate add is 409', async () => {
    await request(app.getHttpServer())
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ userId: member.id })
      .expect(201);

    const members = await request(app.getHttpServer())
      .get(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);

    expect(members.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user: expect.objectContaining({
            id: member.id,
            email: userEmail,
          }) as { id: number; email: string },
        }),
      ]),
    );

    await request(app.getHttpServer())
      .get(`/teams/${teamId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ userId: member.id })
      .expect(409);
  });

  it('returns 404 when adding a user that does not exist', async () => {
    await request(app.getHttpServer())
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ userId: 9_999_999 })
      .expect(404);
  });
});
