# TeacherPoint Backend

Fully fledged Express + MongoDB backend generated from `BACKEND_API_SPEC.md`.

## Run locally

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Health: `http://localhost:4000/health`  
Swagger: `http://localhost:4000/api/docs`  
API Base: `http://localhost:4000/api/v1`

Full platform guide: [`../docs/PLATFORM_GUIDE.md`](../docs/PLATFORM_GUIDE.md)

## Seed data

```bash
npm run seed
```

Default credentials (after seed):

```txt
Super Admin:  aarav@teacherpoint.com / Aarav@Super2026
Manager:      priya.admin@teacherpoint.com / Priya@Mgr2026
Moderator:    omar@teacherpoint.com / Omar@Mod2026
Legacy admin: admin@teacherpoint.com / Admin@123
Tutor:        teacher@teacherpoint.com / Teacher@123
Student:      student@teacherpoint.com / Student@123
```

## Test scripts

```bash
node scripts/test-ip-monitor-flow.js
node scripts/test-admin-staff-logins.js
```

## Important routes

- `POST /api/v1/auth/register` · `POST /api/v1/auth/login` · `GET /api/v1/auth/me`
- `GET /api/v1/admin/ip-monitor/groups` (admin JWT)
- `GET /api/v1/admin/team` (admin JWT — includes staff IPs)
- `PATCH /api/v1/admin/users/:id` — `{ isActive: false }` to deactivate
- `GET /api/v1/courses` · `GET /api/v1/users/tutors` · `GET /api/v1/categories`
- `POST /api/v1/enrollments` · `GET /api/v1/certificates/me`

## Frontend env

```env
VITE_API_URL=http://localhost:4000/api/v1
```

## Notes

- Payments are stubbed and always marked paid.
- SMTP falls back to console stub if credentials are empty.
- Geoapify routes need `GEOAPIFY_API_KEY`.
- Uploads are local under `uploads/` and served from `/uploads`.
