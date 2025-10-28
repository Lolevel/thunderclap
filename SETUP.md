# Prime League Scout - Setup Guide

## Quick Start (3 Steps)

### 1. Configure Environment
Edit the **single** `.env` file in the root directory:

```bash
# .env
PROJECT_ENV=development  # or "production"

# For Development:
DOMAIN_FRONTEND=localhost:5173
DOMAIN_BACKEND=localhost:5000

# For Production (uncomment these):
# DOMAIN_FRONTEND=thunderclap.lolevel.de
# DOMAIN_BACKEND=api.lolevel.de/thunderclap

# Required: Add your Riot API Key
RIOT_API_KEY=your-riot-api-key-here
```

### 2. Start the Application
```bash
docker-compose up -d
```

### 3. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## Switching Between Development and Production

**That's it!** Just edit these 2 lines in `.env`:

```bash
# Development
PROJECT_ENV=development
DOMAIN_FRONTEND=localhost:5173
DOMAIN_BACKEND=localhost:5000

# Production
PROJECT_ENV=production
DOMAIN_FRONTEND=thunderclap.lolevel.de
DOMAIN_BACKEND=api.lolevel.de/thunderclap
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

## File Structure (Simplified)

```
thunderclap/
├── .env                    # 🎯 ONLY file you need to edit
├── docker-compose.yml      # Single compose file for all environments
│
├── backend/
│   ├── Dockerfile          # Single Dockerfile
│   ├── .env.example        # Template (for non-Docker setup)
│   └── .env                # Ignored (not used with Docker)
│
└── frontend/
    ├── Dockerfile          # Single Dockerfile
    └── .env                # Ignored (not used with Docker)
```

## CORS Configuration

CORS is automatically configured to allow **BOTH** localhost and your production domain:

```
http://localhost:5173
http://localhost:5174
https://thunderclap.lolevel.de
```

This means you can:
- Develop locally and access localhost
- Access production from your domain
- No need to change CORS settings when switching environments

## Advanced: Running Without Docker

If you want to run services locally without Docker:

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your settings
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### Frontend
```bash
cd frontend
# Create .env with: VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

## Useful Commands

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

## Troubleshooting

### Port already in use
```bash
# Check what's using port 5000 or 5173
netstat -ano | findstr :5000
netstat -ano | findstr :5173

# Kill the process or change ports in docker-compose.yml
```

### CORS errors
Check that `DOMAIN_FRONTEND` in `.env` matches the URL you're accessing.

### Database connection errors
```bash
# Check if postgres is healthy
docker ps
# Should show "healthy" status for pl_scout_postgres

# Check logs
docker logs pl_scout_postgres
```

## Need Help?

1. Check logs: `docker-compose logs -f backend`
2. Verify `.env` settings
3. Ensure ports 5000, 5173, and 5432 are available
