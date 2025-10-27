# Deployment Guide - Thunderclap

This guide explains how to deploy Thunderclap to production with the Caddy reverse proxy configuration.

## Architecture

**Production URLs:**
- Frontend: `https://thunderclap.lolevel.de`
- Backend API: `https://api.lolevel.de/thunderclap/api`

**Caddy Configuration:**
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

The `handle_path` directive strips `/thunderclap/` from the request path before forwarding to the backend.

## Environment Configuration

### Frontend

**Development** (`.env.development`):
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_URL=http://localhost:5174
```

**Production** (`.env.production`):
```env
VITE_API_BASE_URL=https://api.lolevel.de/thunderclap/api
VITE_APP_URL=https://thunderclap.lolevel.de
```

### Backend

**Development** (`.env`):
```env
FLASK_ENV=development
DATABASE_URL=postgresql://ryze:ryze@localhost:5432/pl_scout
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

**Production** (`.env.production` or Docker environment):
```env
FLASK_ENV=production
DATABASE_URL=postgresql://pl_scout_user:pl_scout@pl_scout_postgres:5432/pl_scout
CORS_ORIGINS=https://thunderclap.lolevel.de
SECRET_KEY=<generate-secure-key>
RIOT_API_KEY=<your-key>
```

## Deployment Steps

### 1. Prepare Frontend for Production

```bash
cd frontend

# Build production bundle
npm run build

# The dist/ folder contains the production build
```

### 2. Update Docker Compose

Make sure your `docker-compose.yml` or production setup includes:

```yaml
services:
  pl_scout_frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod  # Or use nginx to serve the dist/ folder
    environment:
      - VITE_API_BASE_URL=https://api.lolevel.de/thunderclap/api
      - VITE_APP_URL=https://thunderclap.lolevel.de
    ports:
      - "5173:80"

  pl_scout_backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - FLASK_ENV=production
      - CORS_ORIGINS=https://thunderclap.lolevel.de
      - DATABASE_URL=postgresql://pl_scout_user:pl_scout@pl_scout_postgres:5432/pl_scout
      - SECRET_KEY=${SECRET_KEY}
      - RIOT_API_KEY=${RIOT_API_KEY}
    ports:
      - "5000:5000"

  pl_scout_postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=pl_scout_user
      - POSTGRES_PASSWORD=pl_scout
      - POSTGRES_DB=pl_scout
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 3. Deploy

```bash
# On your production server

# Pull latest changes
git pull origin main

# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose logs -f pl_scout_backend
docker-compose logs -f pl_scout_frontend
```

### 4. Verify CORS Configuration

After deployment, check the backend logs for:
```
[CORS] Configured origins: ['https://thunderclap.lolevel.de']
```

And the frontend console for:
```
[API Config] Base URL: https://api.lolevel.de/thunderclap/api
[API Config] Mode: production
```

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. **Check backend logs** - Verify CORS_ORIGINS is set correctly
2. **Check Caddy logs** - Ensure requests are reaching the backend
3. **Test API directly** - `curl https://api.lolevel.de/thunderclap/api/health`

### API Requests Failing

1. **Check the network tab** - Verify requests are going to `https://api.lolevel.de/thunderclap/api/...`
2. **Check backend logs** - See if requests are reaching the Flask app
3. **Test Caddy routing** - Make sure Caddy is stripping `/thunderclap/` correctly

### Environment Variables Not Loading

For **Vite** (frontend):
- Variables must start with `VITE_`
- Must rebuild after changing `.env.production`
- Variables are embedded at build time

For **Flask** (backend):
- Use `docker-compose` `environment:` section or `.env` file
- Restart container after changes

## Security Notes

- **Never commit** `.env` files with real credentials
- Use `.env.example` as templates
- Generate a strong `SECRET_KEY` for production
- Keep `RIOT_API_KEY` secret
- Consider using Docker secrets or environment management tools

## Monitoring

After deployment, monitor:
- Backend logs: `docker-compose logs -f pl_scout_backend`
- Frontend access logs via Caddy
- Database connections and performance
- Riot API rate limits
