import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, registerAndLogin } from './e2e-app';

describe('Projects (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const password = 'password123';
  const managerEmail = `e2e-proj-mgr-${stamp}@example.com`;
  const otherManagerEmail = `e2e-proj-mgr2-${stamp}@example.com`;
  const userEmail = `e2e-proj-user-${stamp}@example.com`;
  const outsiderEmail = `e2e-proj-out-${stamp}@example.com`;
  const teamName = `e2e-proj-team-${stamp}`;
  const projectName = `e2e-project-${stamp}`;

  let manager: { token: string; id: number };
  let otherManager: { token: string; id: number };
  let member: { token: string; id: number };
  let outsider: { token: string; id: number };
  let teamId: number;
  let projectId: number;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);

    manager = await registerAndLogin(app, managerEmail, password);
    otherManager = await registerAndLogin(app, otherManagerEmail, password);
    member = await registerAndLogin(app, userEmail, password);
    outsider = await registerAndLogin(app, outsiderEmail, password);

    await prisma.user.update({
      where: { id: manager.id },
      data: { role: Role.MANAGER },
    });
    await prisma.user.update({
      where: { id: otherManager.id },
      data: { role: Role.MANAGER },
    });

    const createdTeam = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ name: teamName })
      .expect(201);
    teamId = (createdTeam.body as { id: number }).id;

    await request(app.getHttpServer())
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ userId: member.id })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.task.deleteMany({
      where: { assigneeId: { in: [manager.id, member.id, outsider.id] } },
    });
    await prisma.projectMember.deleteMany({
      where: {
        user: {
          email: {
            in: [managerEmail, otherManagerEmail, userEmail, outsiderEmail],
          },
        },
      },
    });
    await prisma.project.deleteMany({
      where: { name: { startsWith: `e2e-project-${stamp}` } },
    });
    await prisma.teamMember.deleteMany({
      where: {
        user: {
          email: {
            in: [managerEmail, otherManagerEmail, userEmail, outsiderEmail],
          },
        },
      },
    });
    await prisma.team.deleteMany({ where: { name: teamName } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [managerEmail, otherManagerEmail, userEmail, outsiderEmail],
        },
      },
    });
    await app.close();
  });

  it('rejects unauthenticated create with 401', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .send({ name: projectName, teamId })
      .expect(401);
  });

  it('rejects USER create with 403', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${member.token}`)
      .send({ name: projectName, teamId })
      .expect(403);
  });

  it('returns 404 when creating a project in a team that does not exist', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ name: projectName, teamId: 9_999_999 })
      .expect(404);
  });

  it('rejects create from a MANAGER outside the team with 403', async () => {
    await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${otherManager.token}`)
      .send({ name: projectName, teamId })
      .expect(403);
  });

  it('lets MANAGER create a project and list it', async () => {
    const created = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ name: projectName, teamId })
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number) as number,
        name: projectName,
        teamId,
        members: [expect.objectContaining({ userId: manager.id })],
      }),
    );
    projectId = (created.body as { id: number }).id;

    const list = await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    expect(list.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: projectId, name: projectName }),
      ]),
    );

    const byTeam = await request(app.getHttpServer())
      .get('/projects')
      .query({ teamId })
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    expect(byTeam.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: projectId, name: projectName }),
      ]),
    );

    const one = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    expect(one.body).toEqual(
      expect.objectContaining({
        id: projectId,
        name: projectName,
        team: expect.objectContaining({ id: teamId }) as {
          id: number;
          name: string;
        },
      }),
    );
  });

  it('hides the project from a user outside the team', async () => {
    const list = await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(200);

    expect(list.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: projectId })]),
    );

    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(403);
  });

  it('is visible to a team member who is not a project member', async () => {
    const one = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);

    expect(one.body).toEqual(
      expect.objectContaining({ id: projectId, name: projectName }),
    );
  });

  it('rejects USER update and delete with 403', async () => {
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ name: `${projectName}-x` })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
  });

  it('updates the project name', async () => {
    const renamed = `${projectName}-renamed`;
    const updated = await request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ name: renamed })
      .expect(200);

    expect(updated.body).toEqual(
      expect.objectContaining({ id: projectId, name: renamed }),
    );

    const one = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    expect(one.body).toEqual(
      expect.objectContaining({ id: projectId, name: renamed }),
    );
  });

  it('rejects update with no fields with 400', async () => {
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({})
      .expect(400);
  });

  it('returns 404 when adding a user that does not exist', async () => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ userId: 9_999_999 })
      .expect(404);
  });

  it('rejects adding a user who is not a team member with 400', async () => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ userId: outsider.id })
      .expect(400);
  });

  it('adds a team member to the project; duplicate add is 409', async () => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ userId: member.id })
      .expect(201);

    const members = await request(app.getHttpServer())
      .get(`/projects/${projectId}/members`)
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
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ userId: member.id })
      .expect(409);
  });

  it('deletes the project but keeps its tasks orphaned; access is 404', async () => {
    const task = await prisma.task.create({
      data: {
        title: `${projectName}-task`,
        projectId,
        assigneeId: member.id,
      },
    });

    const removed = await request(app.getHttpServer())
      .delete(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    expect(removed.body).toEqual(
      expect.objectContaining({ message: expect.any(String) as string }),
    );

    const orphan = await prisma.task.findUnique({ where: { id: task.id } });
    expect(orphan).not.toBeNull();
    expect(orphan?.projectId).toBeNull();

    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(404);
  });
});
