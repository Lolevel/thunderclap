# Prime League Scout

A comprehensive scouting and preparation tool for Prime League teams that leverages Riot Games API data to analyze opponents, predict lineups, and provide strategic insights.

## Features

### Team Management
- **Team Import**: Import teams via OP.GG multi-search URLs (filters for games with 4+ players together)
- **Bulk Team Analysis**: Analyze up to 20 players and find tournament games where 4-5 played together
- **Team Overview**: Key stats at a glance (PL games, top 5 champions, avg rank, player count)
- **OP.GG Integration**: Open team or individual player OP.GG profiles, multi-search for selected players

### Player Analysis
- **Two Champion Tabs**: Separate Prime League and Solo Queue stats
- **Performance Metrics**: Games, Winrate, KDA, CS/min, Pink Wards per game
- **Role Display**: User-friendly role names (Top, Jungle, Mid, Bot, Support)

### Draft Analysis
- **Team Champion Pool**: All champions with winrate (shows which player played what)
- **Ban Priorities**: Favorite bans by rotation (1/2/3)
- **Bans Against**: Champions most banned against the team
- **First Pick Priority**: Most picked champions on first pick

### Scouting Reports
- **Side Performance**: Blue/red side winrates
- **Objective Control**: Dragons, barons, heralds per game
- **Early Game Stats**: First blood %, first tower %, avg game duration
- **Timeline Analytics**: Gold diff @15, early objective timings

## Tech Stack

### Backend
- **Python 3.10+**
- **Flask 3.0** - Web framework
- **PostgreSQL 15** - Database
- **SQLAlchemy** - ORM
- **Riot Games API** - Data source

### Frontend (Coming soon)
- React 18
- Material-UI
- Recharts

## Quick Start with Docker (Recommended)

### Prerequisites
- Docker & Docker Compose
- Riot Games API Key

### Installation

1. **Clone and setup**
```bash
git clone <repo-url>
cd pl_prep
make dev-init
```

2. **Configure Riot API Key**
```bash
# Edit backend/.env and add your API key:
RIOT_API_KEY=RGAPI-your-key-here
```

3. **Start services**
```bash
make up
```

4. **Check status**
```bash
make logs
```

API available at `http://localhost:5000`

### Useful Commands
```bash
make build          # Build Docker images
make up             # Start all services
make down           # Stop all services
make logs           # View logs
make shell          # Backend shell
make db-shell       # PostgreSQL shell
make clean          # Clean up everything
```

---

## Manual Setup (Without Docker)

### Prerequisites
- Python 3.10+
- PostgreSQL 15+
- Riot Games API Key

### Installation

1. **Setup backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials and Riot API key
```

3. **Setup database**
```bash
createdb pl_scout
psql pl_scout < ../schema.sql
```

4. **Run application**
```bash
python run.py
```

## Development

### Database Migrations
```bash
# Create new migration
flask db migrate -m "description"

# Apply migrations
flask db upgrade

# Rollback
flask db downgrade
```

### Testing
```bash
pytest
```

### Flask Shell
```bash
flask shell
# Models are auto-imported (Team, Player, etc.)
```

## API Endpoints

### Teams
- `POST /api/teams/import` - Import team via OP.GG URL (filters for 4+ players together)
- `POST /api/teams/bulk-analyze` - Analyze up to 20 players for tournament games
- `GET /api/teams/<id>` - Get team details
- `GET /api/teams/<id>/overview` - Team overview (PL stats, top 5 champs, avg rank)
- `POST /api/teams/<id>/refresh` - Update team stats
- `GET /api/teams/<id>/roster` - Get current roster
- `GET /api/teams/<id>/stats` - Get team statistics
- `GET /api/teams/<id>/draft-analysis` - Draft patterns and champion pool
- `GET /api/teams/<id>/scouting-report` - Detailed game statistics

### Players
- `GET /api/players/<id>` - Get player details
- `GET /api/players/<id>/champions/tournament` - Prime League champion stats
- `GET /api/players/<id>/champions/soloqueue` - Solo Queue top 20 champions
- `GET /api/players/<id>/matches` - Get match history
- `GET /api/players/<id>/opgg` - Generate OP.GG URL

### Scouting
- `POST /api/scout/predict-lineup` - Predict lineup for team
- `GET /api/scout/report/<team_id>` - Generate scouting report
- `POST /api/scout/draft-helper` - Get draft suggestions

## Project Structure

```
backend/
├── app/
│   ├── __init__.py          # App factory
│   ├── models/              # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── team.py
│   │   ├── player.py
│   │   ├── match.py
│   │   └── ...
│   ├── routes/              # API endpoints
│   │   ├── __init__.py
│   │   ├── teams.py
│   │   ├── players.py
│   │   └── scouting.py
│   ├── services/            # Business logic
│   │   ├── __init__.py
│   │   ├── riot_client.py   # Riot API wrapper
│   │   ├── lineup_predictor.py
│   │   └── stats_calculator.py
│   └── utils/               # Helper functions
│       ├── __init__.py
│       └── opgg_parser.py
├── migrations/              # Database migrations
├── tests/                   # Tests
├── config.py               # Configuration
├── run.py                  # Entry point
└── requirements.txt        # Dependencies
```

## Key Algorithms

### Lineup Prediction Weights
```python
PREDICTION_WEIGHTS = {
    'recent_tournament_games': 0.50,  # Tournament history (HIGHEST)
    'role_coverage': 0.30,            # Role distribution
    'solo_queue_activity': 0.18,      # Recent activity
    'performance_rating': 0.02        # Performance (benching rare)
}
```

### Tournament Game Detection
All custom games (queue_id=0) visible via API are tournament games. Scrims are private and not accessible.

### Timeline Data
Only fetches timeline data for last 10 tournament games per team to respect API rate limits.

## UI Structure

### Team Page Tabs
1. **Overview**: PL games stats, top 5 champions, avg rank, player count
2. **Players**: Roster with role display (Top/Jungle/Mid/Bot/Support), OP.GG buttons
3. **Draft Analysis**: Champion pool with player info, ban priorities, first pick stats
4. **Scouting Report**: Side performance, objective control, timeline data

### Player Pages
- **Prime League Tab**: Tournament game champion stats
- **Solo Queue Tab**: Top 20 most played champions this season
- Stats shown: Games, Winrate, KDA, CS/min, Pink Wards/game

### Role Names
- **Display**: Top, Jungle, Mid, Bot, Support
- **Storage**: TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY (Riot's internal values)

## Documentation

- [CLAUDE.md](CLAUDE.md) - Development guide for AI assistants
- [project.md](project.md) - Complete project specification
- [schema.sql](schema.sql) - Database schema

## License

MIT
