# Prime League Scout

A comprehensive scouting and preparation tool for Prime League teams that leverages Riot Games API data to analyze opponents, predict lineups, and provide strategic insights.

## Features

- **Team Import**: Import teams via OP.GG multi-search URLs
- **Player Analysis**: Champion pools, performance metrics, role detection
- **Lineup Prediction**: AI-powered starting lineup predictions (50% tournament history)
- **Draft Analysis**: Ban/pick patterns by team and side
- **Scouting Reports**: Automated pre-game analysis and recommendations
- **Early Game Analytics**: Gold differential, objective control, first blood rates

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
- `POST /api/teams/import` - Import team via OP.GG URL
- `GET /api/teams/<id>` - Get team details
- `GET /api/teams/<id>/roster` - Get current roster
- `GET /api/teams/<id>/stats` - Get team statistics

### Players
- `GET /api/players/<id>` - Get player details
- `GET /api/players/<id>/champions` - Get champion pool
- `GET /api/players/<id>/matches` - Get match history

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

## Documentation

- [CLAUDE.md](CLAUDE.md) - Development guide for AI assistants
- [project.md](project.md) - Complete project specification
- [schema.sql](schema.sql) - Database schema

## License

MIT
