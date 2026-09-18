import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, registerAndLogin } from './e2e-app';

describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const password = 'password123';
  const managerEmail = `e2e-task-mgr-${stamp}@example.com`;
  const memberEmail = `e2e-task-user-${stamp}@example.com`;
  const outsiderEmail = `e2e-task-out-${stamp}@example.com`;
  const teamName = `e2e-task-team-${stamp}`;
  const projectName = `e2e-task-project-${stamp}`;
  const taskTitle = `e2e-task-${stamp}`;

  let manager: { token: string; id: number };
  let member: { token: string; id: number };
  let outsider: { token: string; id: number };
  let teamId: number;
  let projectId: number;
  let taskId: number;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);

    manager = await registerAndLogin(app, managerEmail, password);
    member = await registerAndLogin(app, memberEmail, password);
    outsider = await registerAndLogin(app, outsiderEmail, password);

    await prisma.user.update({
      where: { id: manager.id },
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

    const createdProject = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ name: projectName, teamId })
      .expect(201);
    projectId = (createdProject.body as { id: number }).id;

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ userId: member.id })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.task.deleteMany({
      where: {
        assigneeId: { in: [manager.id, member.id, outsider.id] },
      },
    });
    await prisma.projectMember.deleteMany({
      where: {
        user: {
          email: { in: [managerEmail, memberEmail, outsiderEmail] },
        },
      },
    });
    await prisma.project.deleteMany({ where: { name: projectName } });
    await prisma.teamMember.deleteMany({
      where: {
        user: {
          email: { in: [managerEmail, memberEmail, outsiderEmail] },
        },
      },
    });
    await prisma.team.deleteMany({ where: { name: teamName } });
    await prisma.user.deleteMany({
      where: {
        email: { in: [managerEmail, memberEmail, outsiderEmail] },
      },
    });
    await app.close();
  });

  it('rejects unauthenticated create with 401', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: taskTitle, projectId, assigneeId: manager.id })
      .expect(401);
  });

  it('rejects USER create with 403', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${member.token}`)
      .send({ title: taskTitle, projectId, assigneeId: member.id })
      .expect(403);
  });

  it('returns 404 when creating a task in a project that does not exist', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ title: taskTitle, projectId: 9_999_999, assigneeId: member.id })
      .expect(404);
  });

  it('returns 404 when the assignee does not exist', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ title: taskTitle, projectId, assigneeId: 9_999_999 })
      .expect(404);
  });

  it('rejects an assignee who is not a project member with 400', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ title: taskTitle, projectId, assigneeId: outsider.id })
      .expect(400);
  });

  it('lets MANAGER create a task and list it', async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ title: taskTitle, projectId, assigneeId: member.id })
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number) as number,
        title: taskTitle,
        status: 'OPEN',
        projectId,
        assigneeId: member.id,
        assignee: expect.objectContaining({ id: member.id }) as {
          id: number;
          email: string;
        },
        project: expect.objectContaining({ id: projectId }) as {
          id: number;
          name: string;
        },
      }),
    );
    taskId = (created.body as { id: number }).id;

    const list = await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    expect(list.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: taskId, title: taskTitle }),
      ]),
    );

    const byProject = await request(app.getHttpServer())
      .get('/tasks')
      .query({ projectId })
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    expect(byProject.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: taskId, title: taskTitle }),
      ]),
    );

    const one = await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    expect(one.body).toEqual(
      expect.objectContaining({ id: taskId, title: taskTitle }),
    );
  });

  it('hides the task from a user outside the team', async () => {
    const list = await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(200);

    expect(list.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: taskId })]),
    );

    await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(403);
  });

  it('is visible to a team member who is not a project member', async () => {
    await prisma.projectMember.delete({
      where: { userId_projectId: { userId: member.id, projectId } },
    });

    const one = await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);

    expect(one.body).toEqual(
      expect.objectContaining({ id: taskId, title: taskTitle }),
    );

    await prisma.projectMember.create({
      data: { userId: member.id, projectId },
    });
  });

  it('rejects USER update and delete with 403', async () => {
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ title: `${taskTitle}-x` })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
  });

  it('updates the task title', async () => {
    const renamed = `${taskTitle}-renamed`;
    const updated = await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ title: renamed })
      .expect(200);

    expect(updated.body).toEqual(
      expect.objectContaining({ id: taskId, title: renamed }),
    );
  });

  it('rejects reassigning to a user who is not a project member with 400', async () => {
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ assigneeId: outsider.id })
      .expect(400);
  });

  it('rejects update with no fields with 400', async () => {
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({})
      .expect(400);
  });

  it('rejects an invalid status with 400', async () => {
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ status: 'NOT_A_STATUS' })
      .expect(400);
  });

  it('rejects status change from a user who is not the assignee with 403', async () => {
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(403);
  });

  it('lets the assignee update the status', async () => {
    const updated = await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ status: 'DONE' })
      .expect(200);

    expect(updated.body).toEqual(
      expect.objectContaining({ id: taskId, status: 'DONE' }),
    );
  });

  it('returns 404 for a task that does not exist', async () => {
    await request(app.getHttpServer())
      .get('/tasks/9999999')
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(404);
  });

  it('deletes the task', async () => {
    const removed = await request(app.getHttpServer())
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    expect(removed.body).toEqual(
      expect.objectContaining({ message: expect.any(String) as string }),
    );

    await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(404);
  });
});
