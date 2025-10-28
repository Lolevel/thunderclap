# ⚡ Thunderclap - Prime League Scout

Ein umfassendes Scouting- und Vorbereitungs-Tool für Prime League Teams. Analysiert Gegner über die Riot Games API, erstellt Lineup-Predictions und bietet strategische Insights für Wettbewerbsspiele.

## 🚀 Quick Start

### Voraussetzungen
- Docker & Docker Compose
- [Riot Games API Key](https://developer.riotgames.com/)

### Setup in 3 Schritten

**1. Environment konfigurieren**

Bearbeite `.env` im Root-Verzeichnis:
```bash
PROJECT_ENV=development

# Domains
DOMAIN_FRONTEND=localhost:5173
DOMAIN_BACKEND=localhost:5000

# Dein Riot API Key
RIOT_API_KEY=RGAPI-dein-key-hier
```

**2. Starten**
```bash
docker-compose up -d
```

**3. Zugreifen**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

**Fertig!** 🎉

### Nützliche Commands
```bash
docker-compose up -d              # Alles starten
docker-compose logs -f            # Logs anzeigen
docker-compose down               # Alles stoppen
docker-compose up -d --build      # Neu bauen und starten
```

---

## 🔄 Wechsel zwischen Dev und Production

Nur `.env` im Root editieren:
```bash
# Für Production:
PROJECT_ENV=production
DOMAIN_FRONTEND=thunderclap.lolevel.de
DOMAIN_BACKEND=api.lolevel.de/thunderclap
```

Dann neustarten:
```bash
docker-compose down && docker-compose up -d
```

**CORS ist automatisch für BEIDE konfiguriert** - localhost und production domains funktionieren gleichzeitig!

---

## ✨ Features

### Team Management
- **Team Import**: Teams via OP.GG Multi-Search URLs importieren
- **Bulk Analysis**: Bis zu 20 Spieler analysieren und Tournament-Games finden
- **Team Overview**: Key Stats auf einen Blick (PL Games, Top 5 Champions, Avg Rank)
- **OP.GG Integration**: Team oder einzelne Spieler OP.GG öffnen, Multi-Search für ausgewählte Spieler

### Player Analysis
- **Zwei Champion Tabs**: Getrennte Prime League und Solo Queue Stats
- **Performance Metrics**: Games, Winrate, KDA, CS/min, Pink Wards per game
- **Role Display**: User-friendly Namen (Top, Jungle, Mid, Bot, Support)

### Draft Preparation (Game Preparation)
- **Roster Scenarios**: Erstelle und manage mehrere Roster-Szenarien
- **Draft Scenarios**: Für jeden Roster-Scenario eigene Draft-Simulationen
- **Champion Pool**: Team-Champion-Pool mit Winrates
- **Ban Analysis**: Favorite Bans nach Rotation (1/2/3)
- **First Pick Priority**: Meist gepickte Champions bei First Pick

### Scouting Reports
- **Side Performance**: Blue/Red Side Winrates
- **Objective Control**: Dragons, Barons, Heralds pro Spiel
- **Early Game Stats**: First Blood %, First Tower %, Avg Game Duration
- **Timeline Analytics**: Gold Diff @15, Early Objective Timings

---

## 🏗️ Architektur

### Tech Stack

**Backend:**
- Python 3.11+ mit Flask
- PostgreSQL 15 (Datenbank)
- Redis (Caching)
- SQLAlchemy (ORM)
- Riot Games API

**Frontend:**
- React 18 mit Vite
- TailwindCSS
- Recharts (Visualisierung)

**Deployment:**
- Docker & Docker Compose
- Caddy (Reverse Proxy für Production)

### Projekt-Struktur
```
thunderclap/
├── .env                    # 🎯 Zentrale Konfiguration
├── .env.example            # Template
├── docker-compose.yml      # Docker Setup
├── schema.sql              # DB Schema
│
├── backend/
│   ├── app/
│   │   ├── models/         # SQLAlchemy Models
│   │   ├── routes/         # API Endpoints
│   │   ├── services/       # Business Logic
│   │   └── utils/          # Helper Functions
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/     # React Components
│   │   ├── hooks/          # Custom Hooks
│   │   ├── lib/            # Utilities
│   │   └── styles/         # TailwindCSS
│   ├── Dockerfile
│   └── package.json
│
└── migrations/             # DB Migrations
```

---

## 🔌 API Endpoints

### Teams
```
POST   /api/teams/import                # Team via OP.GG URL importieren
POST   /api/teams/bulk-analyze          # Bis zu 20 Spieler analysieren
GET    /api/teams/<id>                  # Team Details
GET    /api/teams/<id>/overview         # Team Overview Stats
POST   /api/teams/<id>/refresh          # Stats aktualisieren
GET    /api/teams/<id>/roster           # Aktueller Roster
GET    /api/teams/<id>/draft-analysis   # Draft Patterns
GET    /api/teams/<id>/scouting-report  # Detaillierte Spielstatistiken
```

### Players
```
GET    /api/players/<id>                      # Player Details
GET    /api/players/<id>/champions/tournament # PL Champion Stats
GET    /api/players/<id>/champions/soloqueue  # Solo Queue Top 20
GET    /api/players/<id>/matches              # Match History
```

### Scouting
```
POST   /api/scout/predict-lineup        # Lineup für Team vorhersagen
GET    /api/scout/report/<team_id>      # Scouting Report generieren
POST   /api/scout/draft-helper          # Draft Vorschläge
```

### Draft Scenarios (Game Preparation)
```
GET    /api/teams/<id>/draft-scenarios  # Alle Scenarios für ein Team
POST   /api/teams/<id>/draft-scenarios  # Neues Scenario erstellen
PUT    /api/draft-scenarios/<id>        # Scenario updaten
DELETE /api/draft-scenarios/<id>        # Scenario löschen
POST   /api/draft-scenarios/<id>/lock   # Scenario locken
```

---

## 🎮 Key Algorithms

### Lineup Prediction Weights
```python
PREDICTION_WEIGHTS = {
    'recent_tournament_games': 0.50,  # Tournament History (HIGHEST)
    'role_coverage': 0.30,            # Rolle-Distribution
    'solo_queue_activity': 0.18,      # Recent Activity
    'performance_rating': 0.02        # Performance (Benching selten)
}
```

### Tournament Game Detection
Alle Custom Games (queue_id=0) über API sind Tournament Games. Scrims sind privat und nicht zugänglich.

**Kriterien:**
- queue_id = 0 (Custom Game)
- game_duration > 900s (min. 15 Min, filtert Remakes)
- Alle Spieler Level 30+
- Draft Mode enabled

### Timeline Data Usage
**Nur die letzten 10 Tournament Games pro Team** fetchen Timeline-Daten (API Rate Limit schonen).

Verwendet für:
- Gold Differential @ 15min
- Early Game Objective Control
- Early Game Aggression Patterns

---

## 🎨 UI Struktur

### Team Page Tabs
1. **Overview**: PL Games Stats, Top 5 Champions, Avg Rank, Player Count
2. **Players**: Roster mit Rollen, OP.GG Buttons, Multi-Select für OP.GG Multi-Search
3. **Game Preparation**: Roster-Scenarios und Draft-Scenarios
4. **Draft Analysis**: Champion Pool, Ban Priorities, First Pick Stats
5. **Scouting Report**: Side Performance, Objective Control, Timeline Data
6. **Match History**: Letzte Spiele mit Details

### Player Detail Pages
- **Prime League Tab**: Tournament Game Champion Stats
- **Solo Queue Tab**: Top 20 Champions dieser Season
- Stats: Games, Winrate, KDA, CS/min, Pink Wards/game

### Role Names
- **Display**: Top, Jungle, Mid, Bot, Support
- **Storage**: TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY (Riot's interne Werte)

---

## 📦 Deployment auf Production

### Voraussetzungen
- Docker & Docker Compose auf Server
- Caddy als Reverse Proxy
- Externes Docker Network: `pl_scout_network`

### Deploy Steps

**1. Network erstellen (einmalig)**
```bash
docker network create pl_scout_network
```

**2. Environment für Production**
```bash
# In .env anpassen:
PROJECT_ENV=production
DOMAIN_FRONTEND=thunderclap.lolevel.de
DOMAIN_BACKEND=api.lolevel.de/thunderclap
RIOT_API_KEY=dein-echter-key
SECRET_KEY=sicherer-random-key
```

**3. Deployen**
```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

**4. Verify**
```bash
docker-compose ps              # Container Status
docker-compose logs -f backend # Logs checken
curl http://localhost:5000/health # Backend Test
```

### Caddy Configuration
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

---

## 🔧 Development

### Lokal ohne Docker

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations

**Automatisch!** Migrations werden beim Container-Start automatisch ausgeführt.

```bash
# 1. Model in backend/app/models/ ändern
# 2. Container neustarten
docker-compose restart backend

# Fertig! Auto-Migration erkennt Änderungen und führt durch
```

**Manuell** (optional):
```bash
# Migration generieren
docker exec pl_scout_backend flask db migrate -m "beschreibung"

# Migration anwenden
docker exec pl_scout_backend flask db upgrade
```

Siehe **[MIGRATIONS.md](MIGRATIONS.md)** für Details.

### Testing
```bash
# Backend Tests
cd backend
pytest

# Frontend Tests
cd frontend
npm test
```

### Access Token erstellen
```bash
docker exec pl_scout_backend python create_token.py --name "Admin" --days 365
```

---

## 🐛 Troubleshooting

### CORS Errors
```bash
# Backend CORS Origins checken
docker logs pl_scout_backend | grep CORS

# Sollte zeigen:
# [CORS] Configured origins: ['http://localhost:5173', 'http://localhost:5174', 'https://thunderclap.lolevel.de']
```

### Frontend erreicht Backend nicht
```bash
# Frontend Environment checken
docker exec pl_scout_frontend env | grep VITE

# API direkt testen
curl http://localhost:5000/health
```

### Database Connection Errors
```bash
# Postgres Health Check
docker ps | grep postgres

# Connection String checken
docker exec pl_scout_backend env | grep DATABASE_URL
```

### Port bereits in Verwendung
```bash
# Prüfen was Port 5000 oder 5173 nutzt
netstat -ano | findstr :5000
netstat -ano | findstr :5173
```

---

## 📊 Database Schema

Siehe [`schema.sql`](schema.sql) für das komplette Schema.

### Wichtigste Tabellen:
- `teams` - Team Metadaten
- `players` - Spieler Daten (summoner_name, puuid, rank)
- `team_rosters` - Many-to-Many zwischen teams/players mit Rolle
- `matches` - Game Daten mit Tournament/Scrim Flags
- `match_participants` - Player Performance in Matches
- `player_champions` - Champion Pool Stats (Tournament + Solo Queue)
- `draft_patterns` - Ban/Pick Tendenzen
- `draft_scenarios` - Game Preparation Scenarios
- `lineup_predictions` - Vorhergesagte Rosters mit Confidence Scores

---

## 🔒 Security

- `.env` Datei ist in `.gitignore` und wird nicht committed
- API Keys nur über Environment Variables
- CORS auf spezifische Domains beschränkt
- Production nutzt Gunicorn statt Flask Dev Server
- Health Checks nur auf localhost (nicht über externe Domains)

---

## 📚 Weitere Dokumentation

- **[SETUP.md](SETUP.md)** - Detaillierte Setup-Anleitung
- **[MIGRATIONS.md](MIGRATIONS.md)** - Database Migrations Guide
- **[CLAUDE.md](CLAUDE.md)** - Projekt-Kontext für AI-Assistenten
- **[schema.sql](schema.sql)** - Komplettes Database Schema

---

## 📝 Lizenz

MIT

---

## 🤝 Contributing

Pull Requests sind willkommen! Für größere Änderungen bitte zuerst ein Issue öffnen.

---

**Made with ⚡ for Prime League Teams**
