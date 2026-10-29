# Deploying FasoPay

FasoPay runs as four containers on one server, behind Caddy for HTTPS:

```
Internet ──443──▶ caddy ──▶ web (Next.js, :3000) ──▶ engine (FastAPI, :8000)
                                     │
                                     └──────────▶ db (PostgreSQL 17)
```

Only Caddy is reachable from outside. The database and the compliance engine have no published ports.
A `migrate` container applies database migrations on every start, before the web app comes up.

## 1. What you need

- A Linux server: 2 vCPU, 4 GB RAM, 40 GB disk is plenty for hundreds of companies.
  Ubuntu 24.04 LTS is assumed below. Any provider works; pick one with low latency to Burkina Faso.
- A domain or subdomain, e.g. `paie.votre-entreprise.bf`.
- SSH access with a key (disable password login).

## 2. Prepare the server

```bash
# Docker Engine with the compose plugin (official convenience script)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # log out and back in

# Firewall: SSH and web only
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443
sudo ufw enable
```

Point the domain's **DNS A record** at the server's IP and wait until `dig +short paie.votre-entreprise.bf`
returns it. Caddy needs this to obtain the certificate on first start.

## 3. Configure and start

Copy the `fasopay/` folder to the server (for example `/opt/fasopay`), then:

```bash
cd /opt/fasopay
cp .env.example .env
openssl rand -hex 24          # paste the result as POSTGRES_PASSWORD in .env
nano .env                     # set DOMAIN
docker compose up -d --build
```

The first build takes a few minutes. Then check:

```bash
docker compose ps                                  # every service "healthy" (migrate: "exited (0)")
curl -s https://paie.votre-entreprise.bf/api/health
# {"status":"ok","db":"ok","engine":"ok"}
```

Open `https://<your domain>/signup` and create the first account. Production starts empty: the demo
seed is never run there (it deletes all data, and refuses to run when `NODE_ENV=production`).

## 4. Updating

```bash
cd /opt/fasopay
# copy or pull the new code, then:
docker compose up -d --build
```

`migrate` applies any new database migrations before the new web container starts. If a migration
fails, the old web container keeps running; read the error with `docker compose logs migrate`.

## 5. Backups (do this on day one)

Payroll and tax records must be kept for years. `deploy/backup.sh` writes a compressed
PostgreSQL dump to `backups/` and keeps 30 days.

```bash
chmod +x deploy/backup.sh
crontab -e
# add:  0 2 * * * /opt/fasopay/deploy/backup.sh >> /var/log/fasopay-backup.log 2>&1
```

Copy `backups/` off the server as well, e.g. with `rclone` to object storage. A backup that only lives
on the same disk is lost with it. **Test a restore** on a spare server once:

```bash
docker compose exec -T db pg_restore -U fasopay -d fasopay --clean --if-exists < backups/fasopay_YYYY-MM-DD_HHMM.dump
```

## 6. Monitoring

- Point an uptime monitor at `https://<your domain>/api/health`. It returns 503 if the database or
  the engine is down.
- Logs: `docker compose logs -f web engine`.
- Disk: `df -h` and `docker system df`. Old images can be cleared with `docker image prune`.

## 7. Before taking real customers

- [ ] Have a Burkinabè expert-comptable validate the IUTS barème, abatements, family reductions and
      exemption caps in `backend/app/config.py`, and the filing deadlines shown in the app.
- [ ] Check your obligations as a processor of employees' personal data with Burkina Faso's data
      protection authority (CIL).
- [ ] Backups running and copied off-site; one restore tested.
- [ ] `.env` readable only by the deploy user (`chmod 600 .env`).
- [ ] OS security updates enabled (`sudo apt install unattended-upgrades`).

## 8. Limits of this setup

- **One web container.** The failed-login throttle lives in memory, so it only works with a single
  web instance. Move it to PostgreSQL or Redis before scaling out.
- **No outgoing email or SMS.** Invites are shared as links (copy / WhatsApp). Password reset needs a
  provider (e.g. an SMS gateway or transactional email) before launch.
- **Managed alternatives.** The same images run elsewhere: set `DATABASE_URL` to a managed
  PostgreSQL, run `migrate` once per release, keep the engine private (only `web` should reach it),
  and put HTTPS in front of `web`. Session cookies are HTTPS-only in production, so login will not
  work over plain HTTP.

## Running the production build without Docker

Useful to check a release locally:

```bash
cd frontend
npm run build
cp -r .next/static .next/standalone/.next/static
NODE_ENV=production PORT=3100 DATABASE_URL=... PAYROLL_ENGINE_URL=http://localhost:8000 node .next/standalone/server.js
```
