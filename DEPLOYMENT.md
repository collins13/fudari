# Fudari — Deployment Guide

Deploying the Fudari stack to a single Linux VPS with Docker Compose and nginx.

**Stack:** Next.js frontend · Spring Boot API · PostgreSQL 16 · Redis 7 · nginx + Let's Encrypt

**Domains:** `fudari.co` (site) · `www.fudari.co` (redirects to apex) · `api.fudari.co` (API)

---

## 0. Read this first — known constraints

These are properties of the current codebase, not opinions. Plan around them.

| Constraint | Impact |
|---|---|
| **No Flyway or Liquibase.** The `backend/src/main/resources/db/migrations/V*.sql` files are *not applied by anything* — they are historical notes. | Hibernate `ddl-auto=update` owns the schema. Never hand-edit production tables, and review entity changes carefully before deploying. |
| **`DataSeeder` runs on any empty database** and inserts demo artisans, jobs and reviews. | You chose to keep this. On first boot production will contain demo content. See §8 to remove it later. |
| **Booking codes use the `TUF-` prefix** and the Java package is still `com.tufixit`. | Cosmetic only. Do not rename — the prefix is persisted in existing rows. |
| **Secrets were previously committed to git.** | The Twilio SID/token, JWT secret and DB password in git history are burned. Rotate all of them before launch (§1). |

---

## 1. Rotate the leaked credentials

The repo history contains a live Twilio SID and auth token, a JWT signing secret, and a Postgres password. Anyone who has ever cloned the repo can forge admin tokens and spend your Twilio balance. Rotate before you deploy, not after:

1. **Twilio** — Console → Account → API keys & tokens → *Create secondary token*, promote, delete the old one.
2. **JWT secret** — generate a fresh one (below). Rotating invalidates all existing sessions, which is fine pre-launch.
3. **Postgres password** — the production database does not exist yet, so just choose a new one.
4. **Namecheap SMTP password** — rotate if it was ever pasted outside `.env`.

Scrubbing git history (`git filter-repo`) is optional if the repo is private, but rotation is not.

---

## 2. Provision the server

A 2 vCPU / 4 GB VPS is a sensible starting point. The JVM plus a Next.js server plus Postgres will not fit comfortably in 2 GB.

```bash
# As root on a fresh Ubuntu 24.04 box
adduser --gecos "" fudari && usermod -aG sudo fudari
install -d -m 700 -o fudari -g fudari /home/fudari/.ssh
cp ~/.ssh/authorized_keys /home/fudari/.ssh/ && chown fudari:fudari /home/fudari/.ssh/authorized_keys
```

Harden SSH in `/etc/ssh/sshd_config` — `PermitRootLogin no`, `PasswordAuthentication no` — then `systemctl restart ssh`.

Firewall: nginx is the only service that should be reachable.

```bash
ufw default deny incoming && ufw default allow outgoing
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp
ufw enable
```

Install Docker:

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker fudari
```

Log out and back in so the group membership applies.

---

## 3. DNS

At your DNS provider, pointing at the server's IP:

| Type | Host | Value |
|---|---|---|
| A | `@` | `<server-ip>` |
| A | `www` | `<server-ip>` |
| A | `api` | `<server-ip>` |

Plus the mail records from the email setup — without these your transactional email lands in spam:

| Type | Host | Value |
|---|---|---|
| MX | `@` | `mx1.privateemail.com` (priority 10) |
| MX | `@` | `mx2.privateemail.com` (priority 10) |
| TXT | `@` | `v=spf1 include:spf.privateemail.com ~all` |
| TXT | `default._domainkey` | *(DKIM value from the Private Email panel)* |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@fudari.co` |

Wait for propagation before requesting certificates — Let's Encrypt rate-limits failed attempts.

```bash
dig +short fudari.co api.fudari.co www.fudari.co
```

---

## 4. Configure the environment

```bash
git clone <your-repo-url> /home/fudari/app && cd /home/fudari/app
cp .env.example .env
chmod 600 .env
```

Generate the secrets:

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "DATABASE_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')"
echo "REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')"
echo "SEED_ADMIN_PASSWORD=$(openssl rand -base64 18)"
echo "WHATSAPP_VERIFY_TOKEN=$(openssl rand -hex 24)"
```

Paste them into `.env` and fill in the rest. With `SPRING_PROFILES_ACTIVE=prod`, [`application-prod.properties`](backend/src/main/resources/application-prod.properties) declares every secret **without a fallback**, so a missing variable stops the backend at startup rather than letting it run on a committed dev default.

Required for the backend to boot at all:

```
DATABASE_URL  DATABASE_USERNAME  DATABASE_PASSWORD  REDIS_PASSWORD
JWT_SECRET  WHATSAPP_APP_SECRET  SEED_ADMIN_EMAIL  SEED_ADMIN_PASSWORD
CORS_ALLOWED_ORIGINS  APP_BASE_URL
```

⚠️ `NEXT_PUBLIC_API_URL` is baked into the JavaScript bundle at **build** time, not read at runtime. It must be `https://api.fudari.co/api` before you build, and changing it later requires a rebuild, not a restart.

---

## 5. Issue TLS certificates

nginx will not start while referencing certificates that do not exist, and certbot's webroot challenge needs a running web server. Break the cycle with the bootstrap config.

```bash
# 1. Start on the HTTP-only config. Set the key rather than appending it —
#    .env.example already defines NGINX_CONF, so a blind append is a no-op.
grep -q '^NGINX_CONF=' .env \
  && sed -i 's|^NGINX_CONF=.*|NGINX_CONF=nginx-bootstrap.conf|' .env \
  || echo 'NGINX_CONF=nginx-bootstrap.conf' >> .env
docker compose up -d --build

# 2. nginx must actually be listening, or every challenge returns "connection
#    refused" and burns a rate-limit slot.
docker compose ps nginx                 # expect Up
curl -I http://fudari.co                # expect 200
curl -I http://api.fudari.co            # expect 200 — confirms the A record too

# 3. Request the certificate (one cert covering all three names)
#    --entrypoint is required: the certbot service's entrypoint is a renewal
#    loop, and `run` arguments are appended to the entrypoint, not the command.
docker compose run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  -d fudari.co -d www.fudari.co -d api.fudari.co \
  --email you@fudari.co --agree-tos --no-eff-email

# 4. Switch to the real config and reload
sed -i 's/^NGINX_CONF=.*/NGINX_CONF=nginx.conf/' .env
docker compose up -d --force-recreate nginx
```

Add `--dry-run` to step 3 first if you want to rehearse; the staging environment has far looser rate limits than production's 5 failures per hostname per hour.

Renewal is automatic — the `certbot` service retries every 12 hours and `nginx` reloads on the same cadence to pick up new certificates.

---

## 6. Deploy

```bash
docker compose up -d --build
docker compose ps          # every service should be healthy
```

First boot takes a few minutes: Maven builds the JAR, Next.js builds the standalone bundle, Hibernate creates the schema, and `DataSeeder` populates categories, demo artisans and the admin account.

Verify:

```bash
curl -s https://api.fudari.co/health | jq          # {"status":"UP","database":"UP"}
curl -sI https://fudari.co | head -1               # HTTP/2 200
curl -sI https://www.fudari.co | grep -i location  # -> https://fudari.co/
docker compose logs backend | grep '\[EMAIL\] Config'
```

Then log in at `https://fudari.co/login` with your `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` and **change the password immediately**.

---

## 7. Register the external webhooks

These can only be done once TLS is live, because both providers reject non-HTTPS callbacks.

| Provider | Where | URL |
|---|---|---|
| Meta WhatsApp | App Dashboard → WhatsApp → Configuration | `https://api.fudari.co/api/whatsapp/webhook` (verify token = `WHATSAPP_VERIFY_TOKEN`) |
| Twilio WhatsApp | Console → Messaging → Sender → inbound | `https://api.fudari.co/api/whatsapp/twilio/inbound` |
| Twilio status | Same screen → status callback | `https://api.fudari.co/api/whatsapp/twilio/status` |
| M-Pesa Daraja | Safaricom portal → STK callback | `https://api.fudari.co/api/payments/mpesa/stk-callback` |

The prod profile sets `twilio.webhook.validate-signature=true` and requires `WHATSAPP_APP_SECRET`, so unsigned webhook calls are rejected. If inbound messages silently stop working, check the signature rather than the network first.

---

## 8. Post-launch hardening

Work through these once the site is up:

- **Back up Postgres.** Nothing backs up the `postgres_data` volume today. Add a cron job:
  ```bash
  docker compose exec -T postgres pg_dump -U postgres tufixit | gzip > /backups/fudari-$(date +%F).sql.gz
  ```
  Ship the result off the box — a snapshot on the same VPS is not a backup.
- **Remove the demo seed data** once real artisans sign up. The demo accounts all share one password and are visible to customers. Delete them by their `@fudari.co` seeded email addresses.
- **Pin the schema.** After the first successful deploy, set `SPRING_JPA_DDL_AUTO=validate` so an entity change cannot silently rewrite production tables.
- **Close the internal network.** Uncomment `internal: true` under `backend_net` in `docker-compose.yml` so Postgres and Redis have no route to the internet.
- **Adopt real migrations.** Add Flyway and convert the existing `db/migrations/V*.sql` files into a managed baseline. Until then, schema changes are unreviewable.
- **Add monitoring.** `/api/health` reports database connectivity; point an uptime monitor at it.

---

## 9. Operations

```bash
# Deploy an update
git pull && docker compose up -d --build

# Roll back to the previous commit
git checkout <previous-sha> && docker compose up -d --build

# Logs
docker compose logs -f backend
docker compose logs -f nginx

# Restart one service
docker compose restart backend

# Database shell
docker compose exec postgres psql -U postgres -d tufixit
```

### Troubleshooting

| Symptom | Cause |
|---|---|
| Backend exits with `Could not resolve placeholder 'X'` **even though `X` is in `.env`** | Compose only passes variables that are named in the service's `environment:` block. `.env` drives interpolation in `docker-compose.yml`; it is not injected into containers. Add `X: ${X}` to the backend service. |
| Backend exits immediately with `Could not resolve placeholder` | A variable required by the prod profile is missing from `.env`. The message names it. |
| `nginx: [emerg] cannot load certificate` | Certificates not issued yet — switch `NGINX_CONF` back to `nginx-bootstrap.conf` and redo §5. |
| `docker compose run certbot ...` hangs with no output | The `--entrypoint certbot` override was omitted, so the arguments were swallowed by the renewal-loop entrypoint. |
| Certbot reports `Connection refused` on the challenge | nginx is not listening on :80. Usually `NGINX_CONF=nginx.conf` before certificates exist — check `docker compose logs nginx`. |
| Certbot reports `NXDOMAIN` for a hostname | The A record is missing or has not propagated. Verify with `dig +short <host>` before retrying. |
| Frontend calls `localhost:8080` in the browser | `NEXT_PUBLIC_API_URL` was wrong at build time. Fix `.env` and rebuild with `--build`. |
| CORS errors in the browser console | `CORS_ALLOWED_ORIGINS` must list the exact scheme and host, e.g. `https://fudari.co`. |
| Emails never arrive | Check `MAIL_ENABLED=true`, then `docker compose logs backend \| grep EMAIL`. Sends are async and failures are logged, not thrown. |
| `502 Bad Gateway` | The upstream is unhealthy. `docker compose ps` and check the failing service's logs. |
