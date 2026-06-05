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
NODE_ENV=production
PORT=4000
API_PREFIX=/api/v1
API_BASE_URL=https://api.teacherpoint.in
CLIENT_URL=https://www.teacherpoint.in
MAIL_CLIENT_URL=https://www.teacherpoint.in
MONGO_URI=your_mongodb_uri
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# Welcome emails (student + teacher signup) — REQUIRED in production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your_gmail_app_password
MAIL_FROM_NAME=TeachersPoints
MAIL_FROM_EMAIL=your@gmail.com

# Geo CMS — IP/location detection for country-wise banners (free key at geoapify.com)
GEOAPIFY_API_KEY=your_geoapify_key

# Google Sign-In — same Web client ID as Vercel VITE_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_ID=127339398195-5gghcqf84esnl3gj8ld6r90qu5dc10a0.apps.googleusercontent.com
```

Use a [Gmail App Password](https://support.google.com/accounts/answer/185833) (16 chars, no spaces). `MAIL_FROM_EMAIL` must match `SMTP_USER` for Gmail.

**Google login:** Backend `GOOGLE_CLIENT_ID` verifies tokens from the browser. The frontend must be built with the matching `VITE_GOOGLE_CLIENT_ID` on Vercel. In Google Cloud Console, add `https://www.teacherpoint.in` under **Authorized JavaScript origins**. Check: `curl -s https://api.teacherpoint.in/health` should show `"googleAuth":{"configured":true,...}`.

After editing `.env`:

```bash
pm2 restart teacherpoint-api
pm2 logs teacherpoint-api --lines 20
```

You should see: `SMTP ready (env) — sending as your@gmail.com`

Verify:

```bash
curl -s https://api.teacherpoint.in/health | jq '.smtp'
# { "configured": true, "source": "env", "fromEmail": "..." }
```

**Alternative:** set SMTP in Admin → **Mail settings** (saved to MongoDB) if you prefer not to use `.env`.

Test welcome email on server:

```bash
npm run test:smtp
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

---

## Enable HTTPS for api.teacherpoint.in (Let's Encrypt)

Frontend (`https://teacherpoint.in`) **cannot** call `http://api.teacherpoint.in` (mixed content). API must be HTTPS.

### 1. DNS

Ensure `api.teacherpoint.in` A record points to your server IP.

### 2. Install Certbot (if needed)

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Obtain certificate (first time)

If HTTPS is not set up yet, temporarily use HTTP-only nginx (proxy to `:4000`, **no** redirect), then:

```bash
sudo certbot certonly --nginx -d api.teacherpoint.in
```

Or interactive nginx plugin:

```bash
sudo certbot --nginx -d api.teacherpoint.in
```

### 4. Deploy production nginx config

```bash
cd /var/www/teacheron-backend/teacheron-backend
sudo cp deploy/nginx-api.teacherpoint.in.conf /etc/nginx/sites-available/api.teacherpoint.in
sudo ln -sf /etc/nginx/sites-available/api.teacherpoint.in /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Config provides:
- **Port 80** → 301 redirect to HTTPS
- **Port 443** → SSL + reverse proxy to `http://127.0.0.1:4000`

PM2 / Node stay on HTTP localhost — no backend code changes needed.

### 5. Auto-renewal

```bash
sudo certbot renew --dry-run
```

### 6. Verify

```bash
curl -s https://api.teacherpoint.in/health
curl -s https://api.teacherpoint.in/api/v1/health
```

### 7. Frontend env (production)

Set on Vercel/hosting:

```env
VITE_API_BASE_URL=https://api.teacherpoint.in/api/v1
VITE_API_URL=https://api.teacherpoint.in/api/v1
```

Redeploy frontend after changing env vars.
