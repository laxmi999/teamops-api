import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, registerAndLogin } from './e2e-app';

describe('Pagination (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const password = 'password123';
  const managerEmail = `e2e-page-mgr-${stamp}@example.com`;
  const teamName = `e2e-page-team-${stamp}`;
  const projectName = `e2e-page-project-${stamp}`;

  let manager: { token: string; id: number };
  let teamId: number;
  let projectId: number;
  const taskIds: number[] = [];

  type PageMetaBody = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  type PaginatedBody<T> = { data: T[]; meta: PageMetaBody };

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);

    manager = await registerAndLogin(app, managerEmail, password);
    await prisma.user.update({
      where: { id: manager.id },
      data: { role: Role.MANAGER },
    });

    const team = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ name: teamName })
      .expect(201);
    teamId = (team.body as { id: number }).id;

    const project = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ name: projectName, teamId })
      .expect(201);
    projectId = (project.body as { id: number }).id;

    for (const i of [1, 2, 3, 4, 5]) {
      const task = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${manager.token}`)
        .send({
          title: `e2e-page-task-${stamp}-${i}`,
          projectId,
          assigneeId: manager.id,
        })
        .expect(201);
      taskIds.push((task.body as { id: number }).id);
    }
    taskIds.sort((a, b) => a - b);
  });

  afterAll(async () => {
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.projectMember.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.teamMember.deleteMany({ where: { teamId } });
    await prisma.team.deleteMany({ where: { id: teamId } });
    await prisma.user.deleteMany({ where: { email: managerEmail } });
    await app.close();
  });

  it('returns a data + meta envelope with defaults', async () => {
    const tasks = await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    const tasksBody = tasks.body as PaginatedBody<unknown>;
    expect(Array.isArray(tasksBody.data)).toBe(true);
    expect(tasksBody.meta).toEqual({
      page: 1,
      limit: 20,
      total: expect.any(Number) as number,
      totalPages: expect.any(Number) as number,
    });

    const teams = await request(app.getHttpServer())
      .get('/teams')
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    const teamsBody = teams.body as PaginatedBody<unknown>;
    expect(Array.isArray(teamsBody.data)).toBe(true);
    expect(teamsBody.meta).toEqual({
      page: 1,
      limit: 20,
      total: expect.any(Number) as number,
      totalPages: expect.any(Number) as number,
    });
  });

  it('slices pages correctly and reports total/totalPages per filter', async () => {
    const page2 = await request(app.getHttpServer())
      .get('/tasks')
      .query({ projectId, page: 2, limit: 2 })
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    const page2Body = page2.body as PaginatedBody<{
      id: number;
      projectId: number;
    }>;
    expect(page2Body.meta).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
    });
    expect(page2Body.data.map((t) => t.id)).toEqual([taskIds[2], taskIds[3]]);
    expect(page2Body.data.every((t) => t.projectId === projectId)).toBe(true);
  });

  it('sorts by whitelisted fields in the requested order', async () => {
    const desc = await request(app.getHttpServer())
      .get('/tasks')
      .query({ projectId, sortBy: 'id', order: 'desc', limit: 100 })
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    const descBody = desc.body as PaginatedBody<{ id: number }>;
    const ids = descBody.data.map((t) => t.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));

    const byName = await request(app.getHttpServer())
      .get('/teams')
      .query({ sortBy: 'name' })
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);
    const byNameBody = byName.body as PaginatedBody<unknown>;
    expect(Array.isArray(byNameBody.data)).toBe(true);
  });

  it('rejects non-whitelisted sortBy', async () => {
    await request(app.getHttpServer())
      .get('/tasks')
      .query({ sortBy: 'password' })
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/teams')
      .query({ sortBy: 'evil' })
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(400);
  });

  it('caps limit and validates page/order/filter values', async () => {
    await request(app.getHttpServer())
      .get('/tasks')
      .query({ limit: 500 })
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/tasks')
      .query({ page: 0 })
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/tasks')
      .query({ order: 'sideways' })
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/tasks')
      .query({ projectId: 'abc' })
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(400);
  });
});
