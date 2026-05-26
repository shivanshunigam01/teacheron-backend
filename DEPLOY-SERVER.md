# Deploy backend to api.teacherpoint.in

Your PM2 logs show Node **is running** on port **4000**, but the live site still returns **404 for `/auth/register`**. That means either:

1. **Old code** is deployed (register route missing), or  
2. **nginx** is proxying to the wrong port/app.

Follow these steps **on the Ubuntu server**.

---

## Step 1 — Deploy latest code

```bash
cd /var/www/teacheron-backend/teacheron-backend
git pull origin main
npm install
```

Verify register exists:

```bash
grep -n "register" src/routes/auth.routes.js
```

You should see: `r.post('/register', validate(registerSchema), c.register);`

Restart:

```bash
pm2 restart teacherpoint-api
pm2 logs teacherpoint-api --lines 30
```

---

## Step 2 — Test Node **directly** (bypass nginx)

On the server:

```bash
curl -s http://127.0.0.1:4000/health | jq
```

Expected JSON includes:

```json
"authRoutes": ["POST /auth/register", "POST /auth/login", ...]
```

Register test:

```bash
curl -s -X POST http://127.0.0.1:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test@12345","role":"student"}'
```

| Result | Meaning |
|--------|---------|
| **201** or **409** | Node app is correct — fix nginx (Step 3) |
| **404** | Old code still running — repeat Step 1 or wrong folder |

---

## Step 3 — Fix nginx proxy

Edit your site config (often `/etc/nginx/sites-available/api.teacherpoint.in`):

```nginx
server {
    listen 443 ssl http2;
    server_name api.teacherpoint.in;

    # ssl_certificate ...;
    # ssl_certificate_key ...;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS (backup if Node middleware not deployed yet)
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin $http_origin always;
            add_header Access-Control-Allow-Credentials true always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, Accept" always;
            return 204;
        }
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Credentials true always;
    }
}
```

Apply:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Public test:

```bash
curl -s https://api.teacherpoint.in/health | jq
curl -s -X POST https://api.teacherpoint.in/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Origin: https://teacherpoint.in" \
  -d '{"name":"Test","email":"new@test.com","password":"Test@12345","role":"student"}'
```

---

## Step 4 — Environment (`.env` on server)

```env
PORT=4000
API_PREFIX=/api/v1
API_BASE_URL=https://api.teacherpoint.in
MONGO_URI=your_mongodb_uri
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
```

After editing `.env`:

```bash
pm2 restart teacherpoint-api
```

---

## Step 5 — Optional seed test users

**Warning:** deletes existing users in DB.

```bash
npm run seed
pm2 restart teacherpoint-api
```

Then login with:

- `student@teacherpoint.com` / `Student@123`
- `teacher@teacherpoint.com` / `Teacher@123`

---

## Mongoose shutdown error (fixed)

If you saw:

`Connection.prototype.close() no longer accepts a callback`

Pull latest `src/server.js` — shutdown now uses `await mongoose.connection.close()`.

---

## Why PM2 logs show no HTTP requests

Startup logs only show `MongoDB connected` and `API running`. **Request logs** appear when traffic hits Node:

```bash
pm2 logs teacherpoint-api --lines 0
```

Then register from the browser. You should see lines like:

`POST /api/v1/auth/register 201`

If nothing appears but nginx access log shows hits, nginx is **not** forwarding to port **4000**.
