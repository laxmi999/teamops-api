# TeamOps API

REST API for managing **teams**, **projects**, and **tasks**, with JWT authentication, role-based access (`ADMIN` / `MANAGER` / `USER`), and membership-based resource isolation.

Stack: NestJS, Prisma, PostgreSQL. Interactive docs at `/docs`.

```bash
docker compose up --build -d
# Swagger: http://localhost:3000/docs
```

---

## Tech stack

| Layer | Choice |
|--------|--------|
| API | NestJS (TypeScript) |
| Database | PostgreSQL + Prisma |
| Auth | JWT access tokens + hashed refresh tokens |
| Docs | Swagger UI (`/docs`) |
| Run | Docker Compose (API + Postgres) |

---

## Features

- **Auth:** register, login, refresh, logout
- **Roles:** `ADMIN`, `MANAGER`, `USER` (`RolesGuard` + `@Roles`)
- **Teams:** create, list, get, add/list members (creator is auto-added)
- **Projects:** CRUD under a team; members must already belong to the team
- **Tasks:** CRUD under a project; optional `dueDate`; assignee must be a project member; assignee (or ADMIN) can update status
- **Isolation:** non-admins only access teams/projects/tasks they belong to
- **Admin:** create users and change roles (`/admin/users`, ADMIN only)

---

## Authorization

Requests are checked in this order:

1. **JWT** — valid Bearer token and active session (`refreshToken` still set)
2. **Role** — `@Roles(...)` on the route, if any
3. **Membership** — `AccessService` for team/project access
4. **Domain rules** — e.g. assignee must be a project member

After logout, the refresh token is cleared. Protected routes then return **401** even if the access JWT has not expired yet.

---

## Data model

Hierarchy: `Team → Project → Task`.

- **Team membership** — who belongs to the team
- **Project membership** — who works on a project (must already be a team member)
- **Tasks** — belong to a project; assignee must be a project member

Schema and migrations: `backend/prisma/`.

---

## Quick start (Docker)

Requires Docker and Docker Compose.

```bash
git clone https://github.com/laxmi999/teamops-api.git
cd teamops-api
docker compose up --build -d
```

| Service | URL |
|---------|-----|
| API / Swagger | http://localhost:3000/docs |
| Postgres | Compose network only (`db:5432`) |

On API startup, the container runs `prisma migrate deploy`, then starts Nest.

```bash
docker compose logs -f api
docker compose down          # stop
docker compose down -v       # stop and delete DB volume
```

Host port is `3000`. If it is already in use, change the mapping in `docker-compose.yml` (for example `"3001:3000"`).

Optional: set `JWT_SECRET` and `JWT_REFRESH_SECRET` in the environment before `docker compose up`. Compose includes local defaults if you do not.

---

## Local development (without Docker)

1. Run PostgreSQL and create a database.
2. Configure env:

```bash
cp backend/.env.example backend/.env
# set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
```

3. Install, migrate, run:

```bash
cd backend
npm install
npx prisma migrate deploy
npm run start:dev
```

App: http://localhost:3000 — Swagger: http://localhost:3000/docs

---

## API overview

Full reference: Swagger UI at `/docs`.

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout` |
| Profile | `GET /users/profile` |
| Teams | `POST/GET /teams`, `GET /teams/:id`, `POST/GET /teams/:id/members` |
| Projects | CRUD `/projects` (`?teamId=`), `POST/GET /projects/:id/members` |
| Tasks | CRUD `/tasks` (`?projectId=`), `PATCH /tasks/:id/status` |
| Admin | `GET/POST /admin/users`, `PATCH /admin/users/:id/role` |

**Example flow**

1. Register and login → copy `access_token`
2. In Swagger, **Authorize** with `Bearer <access_token>`
3. Create a team → project → task
4. Logout → protected routes return 401 until you log in again  
   (Clear Swagger Authorize as well; the UI stores the token separately.)

---

## Project layout

```text
teamops-api/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── docker-entrypoint.sh    # migrate, then start
│   ├── prisma/                 # schema + migrations
│   └── src/
│       ├── auth/
│       ├── common/access/
│       ├── teams|projects|tasks|admin-users|users/
│       └── swagger.ts
└── README.md
```

---

## License

No license specified (`UNLICENSED`). Source is public for portfolio review; reuse is not granted unless a license is added later.
