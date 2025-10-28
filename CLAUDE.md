# CLAUDE.md

Projekt-Kontext für AI-Assistenten (Claude Code, GitHub Copilot, etc.)

## Projekt Overview

**Thunderclap** ist ein Scouting- und Vorbereitungs-Tool für Prime League (League of Legends) Teams. Es nutzt die Riot Games API um Gegner zu analysieren, Lineups vorherzusagen und strategische Insights für Wettbewerbsspiele zu bieten.

## Tech Stack

- **Backend**: Python 3.11, Flask, PostgreSQL 15, SQLAlchemy, Redis
- **Frontend**: React 18, Vite, TailwindCSS
- **Deployment**: Docker, Docker Compose, Caddy (Reverse Proxy)
- **API**: Riot Games API (RGAPI)

## Environment Setup

**Zentrale Konfiguration**: Alle Settings sind in `.env` im Root-Verzeichnis.

```bash
PROJECT_ENV=development        # oder "production"
DOMAIN_FRONTEND=localhost:5173
DOMAIN_BACKEND=localhost:5000
RIOT_API_KEY=RGAPI-xxx
```

**Wichtig**:
- CORS ist automatisch für localhost UND production konfiguriert
- Nur `.env` im Root editieren - keine anderen .env Dateien nötig
- `docker-compose.yml` liest alles aus `.env`

## Projekt-Struktur

```
thunderclap/
├── .env                    # Zentrale Config
├── docker-compose.yml      # Docker Setup
├── schema.sql              # DB Schema
│
├── backend/
│   ├── app/
│   │   ├── models/         # SQLAlchemy Models
│   │   ├── routes/         # API Endpoints
│   │   ├── services/       # Business Logic (Riot API Client, etc.)
│   │   ├── utils/          # Helper Functions
│   │   └── middleware/     # Auth, CORS
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/     # React Components
│   │   ├── hooks/          # Custom Hooks
│   │   ├── lib/            # API Client, Utils
│   │   └── styles/         # TailwindCSS
│   └── Dockerfile
│
└── migrations/             # SQL Migrations
```

## Wichtige Datenbank-Tabellen

- **teams**: Team-Metadaten (name, tag, prime_league_id)
- **players**: Spieler (summoner_name, puuid, rank)
- **team_rosters**: Many-to-Many mit Rolle (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)
- **matches**: Game-Daten (queue_id=0 für Tournament Games)
- **match_participants**: Player Performance per Match
- **player_champions**: Champion-Pool (separat für tournament + soloqueue)
- **draft_scenarios**: Game Preparation - Roster + Draft Scenarios
- **draft_patterns**: Ban/Pick Tendenzen nach Rotation

**Wichtig bei Schema-Änderungen**:
1. `schema.sql` updaten
2. Migration-Script in `migrations/` erstellen
3. Models in `backend/app/models/` anpassen

## Core Features & Business Logic

### 1. Team Import
- Import via OP.GG Multi-Search URL: `https://www.op.gg/multisearch/euw?summoners=Player1,Player2,...`
- Parse Player-Namen → Fetch von Riot API → Filtere Tournament Games
- **Tournament Game Detection**:
  - `queue_id = 0` (Custom Game)
  - `game_duration > 900` (min. 15 Min)
  - Draft Mode enabled
  - **Alle Custom Games via API sind Tournament Games** (Scrims sind privat)

### 2. Player Champion Stats
- **Zwei Tabs**: Prime League (Tournament) + Solo Queue
- Solo Queue: Top 20 most played dieser Season
- Stats: Games, Winrate, KDA, CS/min, Pink Wards per game

### 3. Lineup Prediction
```python
WEIGHTS = {
    'recent_tournament_games': 0.50,  # Tournament History (höchste Gewichtung)
    'role_coverage': 0.30,            # Rolle-Distribution
    'solo_queue_activity': 0.18,      # Recent Activity
    'performance_rating': 0.02        # Performance (Benching ist selten)
}
```

### 4. Timeline Data
- **Nur letzte 10 Tournament Games** per Team (API Rate Limit!)
- Verwendet für: Gold Diff @15, Early Game Objectives

### 5. Role Display
- **Storage**: `TOP`, `JUNGLE`, `MIDDLE`, `BOTTOM`, `UTILITY` (Riot's Werte)
- **Display**: `Top`, `Jungle`, `Mid`, `Bot`, `Support` (User-friendly)

## Riot API Integration

**Endpoints genutzt**:
- `SUMMONER_V4` - Get summoner by name/PUUID
- `MATCH_V5` - Match history + match details
- `CHAMPION_MASTERY_V4` - Champion pool
- `LEAGUE_V4` - Ranked stats

**Region/Platform**:
- Routing: `europe`
- Platform: `euw1` (Prime League ist EUW)

**Rate Limiting**:
- 20 requests/sec
- 100 requests/2min
- Implementiere Rate Limiter mit exponential backoff
- Timeline API calls sparsam nutzen!

**Match ID Format**: `{platform}_{matchId}` (z.B. `EUW1_6543210987`)

## API Endpoints (Backend)

### Teams
```
POST   /api/teams/import              # Import via OP.GG URL
POST   /api/teams/bulk-analyze        # Analyze 20 players
GET    /api/teams/<id>/overview       # Overview stats
GET    /api/teams/<id>/roster         # Current roster
GET    /api/teams/<id>/draft-analysis # Draft patterns
```

### Players
```
GET    /api/players/<id>/champions/tournament  # PL stats
GET    /api/players/<id>/champions/soloqueue   # Solo Queue stats
GET    /api/players/<id>/matches               # Match history
```

### Draft Scenarios
```
GET    /api/teams/<id>/draft-scenarios  # All scenarios
POST   /api/teams/<id>/draft-scenarios  # Create scenario
PUT    /api/draft-scenarios/<id>        # Update scenario
POST   /api/draft-scenarios/<id>/lock   # Lock scenario
```

## Development Workflow

### Lokales Setup
```bash
# 1. Config
cp .env.example .env
# Edit .env mit RIOT_API_KEY

# 2. Start
docker-compose up -d

# 3. Logs
docker-compose logs -f
```

### Code-Änderungen
```bash
# Backend oder Frontend Code ändern
# Container neu bauen:
docker-compose up -d --build
```

### Database Migration
```bash
# Neue Spalte hinzufügen:
docker exec -i pl_scout_postgres psql -U pl_scout_user -d pl_scout < migrations/001_add_column.sql

# Oder via Flask-Migrate:
flask db migrate -m "Add column"
flask db upgrade
```

## Common Tasks für AI-Assistenten

### Neue API Endpoint hinzufügen
1. Route in `backend/app/routes/` erstellen
2. Service-Logik in `backend/app/services/` (falls Riot API)
3. Model in `backend/app/models/` (falls DB-Änderung)
4. Frontend API Call in `frontend/src/lib/api.js`

### Neues Feature im Frontend
1. Component in `frontend/src/components/`
2. Custom Hook in `frontend/src/hooks/` (für API Calls)
3. Styling mit TailwindCSS

### Database Schema ändern
1. `schema.sql` updaten
2. Migration in `migrations/` erstellen
3. Model in `backend/app/models/` anpassen
4. Migration auf Production ausführen

## UI Conventions

### Team Page Tabs
1. Overview
2. Players (mit OP.GG Integration)
3. Game Preparation (Roster + Draft Scenarios)
4. Draft Analysis
5. Scouting Report
6. Match History

### Styling
- TailwindCSS
- Dark Mode (Primary Color: #FF6B35)
- Responsive Design
- Icons: Lucide React

## Wichtige Gotchas

1. **Tournament Games**: Alle Custom Games (queue_id=0) sind Tournaments. Keine Scrim-Filterung nötig.
2. **Timeline API**: Nur für letzte 10 Games fetchen (Rate Limit!)
3. **Role Names**: Intern Riot-Werte, Display User-friendly
4. **PUUID**: Permanent ID für Spieler (Summoner Namen können sich ändern)
5. **Champion IDs**: Data Dragon für ID → Name Mapping
6. **CORS**: Automatisch localhost + production erlaubt

## Performance Considerations

- **Batch Processing**: Match Details in Batches fetchen (10 concurrent mit Rate Limiting)
- **Caching**: Redis für Player/Team Stats (TTL: 1h für Player, 30min für Team)
- **Pagination**: Match History in Chunks laden
- **Indexes**: Auf `puuid`, `match_id`, `team_id`, `player_id` in DB

## Security

- **API Key**: Nur via Environment Variable, nie committen
- **CORS**: Spezifische Domains (localhost + production)
- **Rate Limiting**: Public API Endpoints rate-limitieren
- **No Personal Data**: Nur public summoner data speichern

## Production Deployment

```bash
# 1. .env anpassen
PROJECT_ENV=production
DOMAIN_FRONTEND=thunderclap.lolevel.de
DOMAIN_BACKEND=api.lolevel.de/thunderclap

# 2. Deploy
docker-compose down
docker-compose up -d --build

# 3. Verify
docker-compose ps
docker-compose logs -f backend
curl http://localhost:5000/health
```

## Troubleshooting Quick Reference

```bash
# CORS Error
docker logs pl_scout_backend | grep CORS

# Frontend can't reach Backend
docker exec pl_scout_frontend env | grep VITE

# Database Connection
docker ps | grep postgres
docker exec pl_scout_backend env | grep DATABASE_URL

# Port in use
netstat -ano | findstr :5000
netstat -ano | findstr :5173
```

## Code Style

**Backend (Python)**:
- PEP 8
- Type hints wo möglich
- Docstrings für Functions/Classes
- Error Handling mit try/except

**Frontend (React)**:
- Functional Components mit Hooks
- Prop Types oder TypeScript (in Zukunft)
- Custom Hooks für API Calls
- TailwindCSS für Styling

## Testing

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

## Weitere Ressourcen

- **[README.md](README.md)** - User-facing Documentation
- **[SETUP.md](SETUP.md)** - Detaillierte Setup-Anleitung
- **[schema.sql](schema.sql)** - Komplettes DB Schema
- **Riot API Docs**: https://developer.riotgames.com/

---

**Bei Fragen zur Architektur oder Implementierung: Siehe README.md oder schema.sql**
