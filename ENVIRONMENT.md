# Environment Configuration Guide

This document explains how to configure Thunderclap for different environments.

## Quick Start

### Development (Local)

**Frontend:**
```bash
cd frontend
# Uses .env.development automatically
npm run dev
```

**Backend:**
```bash
cd backend
# Uses .env file
docker-compose up
```

### Production (lolevel.de)

**Frontend:**
```bash
cd frontend
# Build with production environment
npm run build
# Outputs to dist/ folder
```

**Backend:**
```bash
cd backend
# Use .env.production or set environment variables in Docker
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Files

### Frontend Environment Files

Location: `frontend/`

**`.env.development`** (Used by `npm run dev`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_URL=http://localhost:5174
```

**`.env.production`** (Used by `npm run build`)
```env
VITE_API_BASE_URL=https://api.lolevel.de/thunderclap/api
VITE_APP_URL=https://thunderclap.lolevel.de
```

**`.env.example`** (Template)
```env
VITE_API_BASE_URL=
VITE_APP_URL=
```

### Backend Environment Files

Location: `backend/`

**`.env`** (Development)
```env
FLASK_ENV=development
DATABASE_URL=postgresql://ryze:ryze@localhost:5432/pl_scout
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
RIOT_API_KEY=your-key-here
```

**`.env.production`** (Production template)
```env
FLASK_ENV=production
DATABASE_URL=postgresql://pl_scout_user:pl_scout@pl_scout_postgres:5432/pl_scout
CORS_ORIGINS=https://thunderclap.lolevel.de
RIOT_API_KEY=your-key-here
SECRET_KEY=generate-secure-key
```

**`.env.example`** (Template for new setups)
- Contains all available variables with descriptions
- Copy to `.env` and fill in your values

## Important Notes

### Frontend (Vite)

1. **Variables must start with `VITE_`** to be exposed to the browser
2. **Environment files are loaded automatically** based on mode:
   - `npm run dev` → `.env.development`
   - `npm run build` → `.env.production`
3. **Variables are embedded at build time** - rebuild after changes
4. **Never commit sensitive data** in `.env.*` files

### Backend (Flask)

1. **CORS_ORIGINS** must match your frontend URL
2. **Comma-separated list** for multiple origins
3. **Restart container** after environment changes
4. **Use Docker environment variables** in production

## Switching Environments

### From Development to Production

**Frontend:**
```bash
cd frontend
npm run build  # Uses .env.production automatically
```

**Backend:**
```bash
cd backend
# Option 1: Use .env.production file
cp .env.production .env
docker-compose restart pl_scout_backend

# Option 2: Set environment variables in docker-compose.yml
# environment:
#   - CORS_ORIGINS=https://thunderclap.lolevel.de
```

### Testing Production Locally

You can test the production build locally:

**Frontend:**
```bash
cd frontend
npm run build
npm run preview  # Serves the production build on http://localhost:4173
```

Update `.env.production` temporarily:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_URL=http://localhost:4173
```

## Verifying Configuration

### Frontend

Open browser console and check:
```javascript
[API Config] Base URL: http://localhost:5000/api
[API Config] Mode: development
```

Or in production:
```javascript
[API Config] Base URL: https://api.lolevel.de/thunderclap/api
[API Config] Mode: production
```

### Backend

Check Docker logs:
```bash
docker logs pl_scout_backend | grep CORS
```

Should show:
```
[CORS] Configured origins: ['http://localhost:5173', 'http://localhost:5174']
```

Or in production:
```
[CORS] Configured origins: ['https://thunderclap.lolevel.de']
```

## Troubleshooting

### "CORS Error" in browser console

**Problem:** Frontend can't connect to backend

**Solutions:**
1. Check backend CORS_ORIGINS includes your frontend URL
2. Restart backend after changing .env
3. Clear browser cache
4. Check backend logs for CORS configuration

### "Network Error" when calling API

**Problem:** API base URL is incorrect

**Solutions:**
1. Check VITE_API_BASE_URL in frontend .env file
2. Rebuild frontend if changed
3. Open browser console and check [API Config] log
4. Test API directly: `curl http://localhost:5000/api/health`

### Environment variables not loading

**Frontend:**
- Must start with `VITE_`
- Rebuild after changes: `npm run build`
- Check file name: `.env.development` or `.env.production`

**Backend:**
- Restart container: `docker restart pl_scout_backend`
- Check Docker environment: `docker exec pl_scout_backend env | grep CORS`
- Verify .env file is mounted in docker-compose.yml

## Security Best Practices

1. **Never commit** real credentials
   - Add `.env` to `.gitignore` (already done)
   - Only commit `.env.example` templates

2. **Use strong secrets** in production
   - Generate random SECRET_KEY
   - Keep RIOT_API_KEY private

3. **Restrict CORS** in production
   - Only allow your actual domain
   - Don't use wildcards (`*`)

4. **HTTPS only** in production
   - Caddy handles this automatically
   - Always use `https://` URLs in .env.production

## See Also

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [README.md](./README.md) - Project overview
- [CLAUDE.md](./CLAUDE.md) - Project architecture details
