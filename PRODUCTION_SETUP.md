# Production Setup Guide

## Quick Deploy auf lolevel.de

### 1. Vorbereitung auf dem Server

```bash
# Repository klonen oder pullen
cd /path/to/thunderclap
git pull origin main

# .env.prod mit echten Credentials erstellen
cp .env.prod .env.prod.local
nano .env.prod.local

# Füge hinzu:
# SECRET_KEY=<generiere einen sicheren key>
# RIOT_API_KEY=<dein riot api key>
```

### 2. Externes Network erstellen (einmalig)

```bash
# Falls das Network noch nicht existiert
docker network create pl_scout_network
```

### 3. Deploy

```bash
# Mit .env.prod.local Datei
docker compose -f docker-compose.prod.yml --env-file .env.prod.local up -d --build

# ODER mit direkten Environment Variables
export SECRET_KEY="your-secret-key"
export RIOT_API_KEY="your-riot-api-key"
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Verify

```bash
# Check Container Status
docker compose -f docker-compose.prod.yml ps

# Check Logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend

# Test Backend Health
curl http://localhost:5000/health

# Test Frontend (via Caddy)
curl https://thunderclap.lolevel.de
```

## Caddy Integration

Deine bestehende Caddyfile funktioniert bereits:

```caddy
thunderclap.lolevel.de {
    reverse_proxy pl_scout_frontend:5173
}

api.lolevel.de {
    route /thunderclap/* {
        handle_path /thunderclap/* {
            reverse_proxy pl_scout_backend:5000 {
                header_up X-Forwarded-Proto {scheme}
                header_up X-Forwarded-For {remote}
                header_up X-Forwarded-Host {host}
            }
        }
    }
}
```

## Was wurde konfiguriert:

### Backend (`pl_scout_backend`)
- **Image:** Python 3.11 mit Gunicorn (4 workers)
- **Port:** 5000 (intern im Network)
- **Environment:**
  - `FLASK_ENV=production`
  - `CORS_ORIGINS=https://thunderclap.lolevel.de`
  - `DATABASE_URL=postgresql://...@pl_scout_postgres:5432/pl_scout`
  - `RIOT_API_KEY=${RIOT_API_KEY}` (aus .env.prod.local)
  - `SECRET_KEY=${SECRET_KEY}` (aus .env.prod.local)

### Frontend (`pl_scout_frontend`)
- **Image:** Node 20 mit Vite Preview Mode
- **Port:** 5173 (intern im Network)
- **Build Args:**
  - `VITE_API_BASE_URL=https://api.lolevel.de/thunderclap/api`
  - `VITE_APP_URL=https://thunderclap.lolevel.de`

### Database (`pl_scout_postgres`)
- **Image:** PostgreSQL 15 Alpine
- **Port:** Nur intern (5432)
- **Volumes:** Persistent data in `postgres_data`

### Cache (`pl_scout_redis`)
- **Image:** Redis 7 Alpine
- **Port:** Nur intern (6379)
- **Volumes:** Persistent data in `redis_data`

## Network Struktur

```
pl_scout_network (external)
├── pl_scout_backend (5000)
├── pl_scout_frontend (5173)
├── pl_scout_postgres (5432)
└── pl_scout_redis (6379)

Caddy (im anderen Compose, gleiches Network)
├── thunderclap.lolevel.de → pl_scout_frontend:5173
└── api.lolevel.de/thunderclap/* → pl_scout_backend:5000
```

## Updates deployen

```bash
# Code pullen
git pull origin main

# Neu bauen und starten
docker compose -f docker-compose.prod.yml --env-file .env.prod.local up -d --build

# Alte Images aufräumen
docker image prune -f
```

## Troubleshooting

### Frontend erreicht Backend nicht
```bash
# Check CORS in Backend Logs
docker compose -f docker-compose.prod.yml logs backend | grep CORS
# Should show: [CORS] Configured origins: ['https://thunderclap.lolevel.de']

# Check Frontend Environment
docker exec pl_scout_frontend env | grep VITE
```

### Database Connection Fehler
```bash
# Check Postgres Health
docker compose -f docker-compose.prod.yml ps postgres

# Check Connection String
docker compose -f docker-compose.prod.yml exec backend env | grep DATABASE_URL
```

### Network Issues
```bash
# Verify external network exists
docker network ls | grep pl_scout_network

# Check which containers are in the network
docker network inspect pl_scout_network
```

## Backup & Restore

### Backup Database
```bash
docker exec pl_scout_postgres pg_dump -U pl_scout_user pl_scout > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
cat backup_20251027.sql | docker exec -i pl_scout_postgres psql -U pl_scout_user pl_scout
```

## Monitoring

```bash
# Container Status
docker compose -f docker-compose.prod.yml ps

# Resource Usage
docker stats pl_scout_backend pl_scout_frontend pl_scout_postgres

# Live Logs
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

## Security Checklist

- [ ] `.env.prod.local` ist NICHT in Git committed
- [ ] `SECRET_KEY` ist ein sicherer random String
- [ ] `RIOT_API_KEY` ist aktuell und gültig
- [ ] Postgres nur intern erreichbar (nicht exposed)
- [ ] CORS auf `thunderclap.lolevel.de` beschränkt
- [ ] Gunicorn läuft mit 4 Workers (nicht Flask dev server)
- [ ] All containers haben `restart: unless-stopped`

## Performance Tuning

### Backend Workers erhöhen
In `docker-compose.prod.yml`:
```yaml
command: gunicorn --bind 0.0.0.0:5000 --workers 8 --timeout 120 run:app
```

### Postgres Performance
```yaml
postgres:
  environment:
    POSTGRES_SHARED_BUFFERS: 256MB
    POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB
```

### Redis als Session Store
In Backend `.env`:
```
CACHE_ENABLED=true
```
