# TeacherPoint Backend

Fully fledged Express + MongoDB backend generated from `BACKEND_API_SPEC.md`.

## Run locally

```bash
cd teacherpoint-backend
npm install
cp .env.example .env
npm run dev
```

Health: `http://localhost:5000/health`  
Swagger: `http://localhost:5000/api/docs`  
API Base: `http://localhost:5000/api/v1`

## Seed data

```bash
npm run seed
```

Default credentials:

```txt
Admin: admin@teacherpoint.com / Admin@123
Teacher: teacher1@teacherpoint.com / Teacher@123
Student: student@teacherpoint.com / Student@123
```

## Important routes

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/courses`
- `GET /api/v1/users/tutors`
- `GET /api/v1/categories`
- `GET /api/v1/listings`
- `GET /api/v1/accommodations`
- `POST /api/v1/accommodations/:id/inquiry`
- `GET /api/v1/banners/active?country=India&city=Ahmedabad`
- `GET /api/v1/geo/ip`
- `POST /api/v1/upload`

## Frontend env

```env
VITE_API_URL=http://localhost:5000/api/v1
```

## Notes

- Payments are stubbed and always marked paid.
- SMTP falls back to console stub if credentials are empty.
- Geoapify routes need `GEOAPIFY_API_KEY`.
- Uploads are local under `uploads/` and served from `/uploads`.
