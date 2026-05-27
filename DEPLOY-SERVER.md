# Deploy backend to api.teacherpoint.in

## Root cause (most common)

Public URL returns **wrong app** if `/health` shows:

```json
{"ok":true,"service":"darotech-backend"}
```

Your **teacherpoint** app (correct) returns:

```json
{"status":"ok","authRoutes":["POST /auth/register",...]}
```

Fix nginx so `api.teacherpoint.in` → `http://127.0.0.1:4000` (teacherpoint-api), not darotech.

---

Your PM2 logs show Node **is running** on port **4000**, but the live site still returns **404 for `/auth/register`**. That means either:

1. **nginx points to the wrong app** (e.g. darotech-api), or  
2. **No nginx proxy** for api.teacherpoint.in.

Follow these steps **on the Ubuntu server**.

---

## Step 0 — Find what nginx is serving now

```bash
curl -s http://127.0.0.1:4000/health          # teacherpoint (correct)
curl -s https://api.teacherpoint.in/health    # public (often wrong app)

sudo grep -r "api.teacherpoint.in\|darotech\|proxy_pass" /etc/nginx/
pm2 list
```

If public `/health` says `darotech-backend`, nginx must be updated (Step 3).

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

## Step 3 — Fix nginx (point to teacherpoint on port 4000)

`grep sites-enabled` may be **empty** — config is often in `/etc/nginx/conf.d/` or `/etc/nginx/sites-available/`.

### Option A — Edit existing api.teacherpoint.in block

Find the file:

```bash
sudo grep -rl "api.teacherpoint.in" /etc/nginx/
```

Open it and set:

```nginx
proxy_pass http://127.0.0.1:4000;
```

Keep your existing `ssl_certificate` and `ssl_certificate_key` lines — do not remove them.

### Option B — Install repo config (if no site file exists)

```bash
cd /var/www/teacheron-backend/teacheron-backend
sudo cp deploy/nginx-api.teacherpoint.in.conf /etc/nginx/sites-available/api.teacherpoint.in
```

Edit SSL paths (required for HTTPS):

```bash
sudo nano /etc/nginx/sites-available/api.teacherpoint.in
```

Uncomment and set:

```nginx
ssl_certificate /etc/letsencrypt/live/api.teacherpoint.in/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.teacherpoint.in/privkey.pem;
```

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/api.teacherpoint.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Verify public URL hits teacherpoint (not darotech)

```bash
curl -s https://api.teacherpoint.in/health
```

Must show `"authRoutes"` — **not** `"service":"darotech-backend"`.

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

---

## CORS errors in browser (API works in curl)

**Symptom:** curl/Postman works, browser shows CORS error, Network tab response body is empty/blocked.

**Cause:** nginx and Express both add `Access-Control-Allow-Origin` → duplicate headers → browser blocks the response.

**Fix:**

1. Update nginx config — remove all `add_header Access-Control-*` from `api.teacherpoint.in` (see `deploy/nginx-api.teacherpoint.in.conf`).
2. Proxy OPTIONS to Node (do not answer OPTIONS in nginx).
3. Redeploy backend + reload nginx:

```bash
cd /var/www/teacheron-backend/teacheron-backend
git pull origin main
npm install
pm2 restart teacherpoint-api --update-env
sudo cp deploy/nginx-api.teacherpoint.in.conf /etc/nginx/sites-available/api.teacherpoint.in
sudo nginx -t && sudo systemctl reload nginx
```

**Local frontend dev:** use `website-hub/.env.development` with `VITE_API_URL=/api/v1` — Vite proxies to the API (no browser CORS).
