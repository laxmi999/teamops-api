import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('TeamOps API')
    .setDescription(
      'Production-style backend for team, project, and task management. ' +
        'Authenticate via login, then use the access token as Bearer JWT on protected routes.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the access_token from POST /auth/login',
      },
      'JWT',
    )
    .addTag('auth', 'Register, login, refresh, logout')
    .addTag('users', 'Authenticated user profile')
    .addTag('teams', 'Teams and team membership')
    .addTag('projects', 'Projects scoped to teams')
    .addTag('tasks', 'Tasks scoped to projects')
    .addTag('admin', 'ADMIN-only user management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
