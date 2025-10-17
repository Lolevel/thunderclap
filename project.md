# Prime League Scout - Complete Documentation

## 📋 Overview
A comprehensive scouting and preparation tool for Prime League teams that leverages Riot Games API data to analyze opponents, predict lineups, and provide strategic insights.

## 🗄️ Database Model

### Core Tables

#### `teams`
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    tag VARCHAR(10),
    prime_league_id VARCHAR(50) UNIQUE,
    opgg_url TEXT,
    division VARCHAR(50),
    current_split VARCHAR(20),
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `players`
```sql
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summoner_name VARCHAR(100) NOT NULL,
    summoner_id VARCHAR(100) UNIQUE NOT NULL,
    puuid VARCHAR(100) UNIQUE NOT NULL,
    summoner_level INTEGER,
    profile_icon_id INTEGER,
    current_rank VARCHAR(20),
    current_lp INTEGER,
    peak_rank VARCHAR(20),
    region VARCHAR(10) DEFAULT 'EUW1',
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `team_rosters`
```sql
CREATE TABLE team_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    role VARCHAR(20), -- TOP, JUNGLE, MID, ADC, SUPPORT
    is_main_roster BOOLEAN DEFAULT true,
    join_date DATE,
    leave_date DATE,
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, player_id, join_date)
);
```

#### `player_champions`
```sql
CREATE TABLE player_champions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    champion_id INTEGER NOT NULL,
    champion_name VARCHAR(50),
    mastery_level INTEGER,
    mastery_points INTEGER,
    games_played_total INTEGER DEFAULT 0,
    games_played_recent INTEGER DEFAULT 0, -- last 30 days
    winrate_total DECIMAL(5,2),
    winrate_recent DECIMAL(5,2),
    kda_average DECIMAL(4,2),
    cs_per_min DECIMAL(4,2),
    last_played TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(player_id, champion_id)
);
```

#### `matches`
```sql
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id VARCHAR(50) UNIQUE NOT NULL,
    game_creation BIGINT,
    game_duration INTEGER,
    game_version VARCHAR(20),
    map_id INTEGER,
    queue_id INTEGER, -- 0 for custom, 420 for ranked solo
    is_tournament_game BOOLEAN DEFAULT false,
    tournament_name VARCHAR(100),
    winning_team_id UUID REFERENCES teams(id),
    losing_team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Note: is_scrim field removed because scrims are never publicly visible via Riot API
-- All custom games (queue_id=0) that meet tournament criteria are treated as competitive games
```

#### `match_participants`
```sql
CREATE TABLE match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id),
    team_id UUID REFERENCES teams(id),
    champion_id INTEGER NOT NULL,
    champion_name VARCHAR(50),
    role VARCHAR(20),
    lane VARCHAR(20),
    team_position VARCHAR(20), -- Riot's detected position
    kills INTEGER,
    deaths INTEGER,
    assists INTEGER,
    cs_total INTEGER,
    cs_per_min DECIMAL(4,2),
    gold_earned INTEGER,
    damage_dealt INTEGER,
    damage_taken INTEGER,
    vision_score INTEGER,
    wards_placed INTEGER,
    wards_destroyed INTEGER,
    first_blood BOOLEAN,
    first_tower BOOLEAN,
    win BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, player_id)
);
```

#### `team_stats`
```sql
CREATE TABLE team_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    stat_type VARCHAR(50), -- 'tournament', 'all' (no 'scrim' since scrims aren't public)
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    first_blood_rate DECIMAL(5,2),
    first_tower_rate DECIMAL(5,2),
    first_dragon_rate DECIMAL(5,2),
    dragon_control_rate DECIMAL(5,2),
    baron_control_rate DECIMAL(5,2),
    average_game_duration INTEGER,
    average_gold_diff_at_10 INTEGER,
    average_gold_diff_at_15 INTEGER,
    comeback_win_rate DECIMAL(5,2), -- wins when behind at 15
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, stat_type)
);
```

#### `draft_patterns`
```sql
CREATE TABLE draft_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    champion_id INTEGER NOT NULL,
    action_type VARCHAR(20), -- 'ban', 'pick'
    phase INTEGER, -- 1, 2, 3 for ban phases
    pick_order INTEGER, -- 1-5 for picks
    side VARCHAR(10), -- 'blue', 'red'
    frequency INTEGER DEFAULT 1,
    winrate DECIMAL(5,2),
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `player_performance_timeline`
```sql
CREATE TABLE player_performance_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    games_played INTEGER DEFAULT 0,
    average_kda DECIMAL(4,2),
    average_cs_per_min DECIMAL(4,2),
    average_vision_score DECIMAL(5,2),
    winrate DECIMAL(5,2),
    main_role VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(player_id, date)
);
```

#### `lineup_predictions`
```sql
CREATE TABLE lineup_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    match_date DATE,
    predicted_top UUID REFERENCES players(id),
    predicted_jungle UUID REFERENCES players(id),
    predicted_mid UUID REFERENCES players(id),
    predicted_adc UUID REFERENCES players(id),
    predicted_support UUID REFERENCES players(id),
    confidence_score DECIMAL(5,2),
    prediction_factors JSONB, -- detailed breakdown of prediction
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `scouting_reports`
```sql
CREATE TABLE scouting_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    opponent_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    match_date DATE,
    report_data JSONB, -- comprehensive report as JSON
    key_threats TEXT[],
    suggested_bans VARCHAR(50)[],
    win_conditions TEXT[],
    created_by UUID REFERENCES players(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `match_timeline_data`
```sql
CREATE TABLE match_timeline_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
    gold_diff_at_10 INTEGER,
    gold_diff_at_15 INTEGER,
    xp_diff_at_10 INTEGER,
    xp_diff_at_15 INTEGER,
    first_blood_time INTEGER, -- seconds into game
    first_tower_time INTEGER,
    first_dragon_time INTEGER,
    first_herald_time INTEGER,
    timeline_data JSONB, -- full timeline for advanced analysis
    created_at TIMESTAMP DEFAULT NOW()
);

-- Note: Only store timeline data for last 10 tournament games per team
-- This table caches expensive Riot API timeline calls
```

### Indexes for Performance

```sql
-- Player lookups
CREATE INDEX idx_players_summoner_name ON players(summoner_name);
CREATE INDEX idx_players_puuid ON players(puuid);

-- Match queries
CREATE INDEX idx_matches_game_creation ON matches(game_creation DESC);
CREATE INDEX idx_matches_tournament ON matches(is_tournament_game, game_creation DESC);
CREATE INDEX idx_match_participants_player ON match_participants(player_id, match_id);

-- Team statistics
CREATE INDEX idx_team_rosters_active ON team_rosters(team_id, is_main_roster) WHERE leave_date IS NULL;
CREATE INDEX idx_draft_patterns_team ON draft_patterns(team_id, action_type, frequency DESC);

-- Performance tracking
CREATE INDEX idx_player_champions_recent ON player_champions(player_id, games_played_recent DESC);
CREATE INDEX idx_performance_timeline ON player_performance_timeline(player_id, date DESC);

-- Timeline data
CREATE INDEX idx_match_timeline_match ON match_timeline_data(match_id);
```

## 🔄 Data Flow & Architecture

### System Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  Frontend (Web) │────▶│  Backend API     │────▶│  PostgreSQL DB  │
│  React/Vue      │     │  Node.js/Python  │     │                 │
│                 │     │                  │     └─────────────────┘
└─────────────────┘     │                  │              │
                        │                  │              │
                        └──────┬───────────┘              │
                               │                           │
                               ▼                           ▼
                    ┌──────────────────┐         ┌─────────────────┐
                    │                  │         │                 │
                    │  Riot Games API  │         │  Redis Cache    │
                    │                  │         │                 │
                    └──────────────────┘         └─────────────────┘
```

### Data Collection Pipeline

1. **Team Import Process**
   ```python
   # Step 1: Parse OP.GG URL
   parse_opgg_url(url) -> [summoner_names]
   
   # Step 2: Fetch player data
   for summoner in summoner_names:
       get_summoner_by_name() -> summoner_data
       get_match_history() -> recent_matches
       get_champion_mastery() -> champion_pool
   
   # Step 3: Analyze tournament games
   filter_custom_games() -> tournament_matches
   extract_team_compositions() -> lineups
   
   # Step 4: Calculate statistics
   compute_player_stats() -> individual_performance
   compute_team_stats() -> team_performance
   predict_lineup() -> probable_roster
   ```

2. **Match Analysis Pipeline**
   ```python
   # Tournament game detection
   # NOTE: All custom games visible via API are tournament games
   # Scrims are NEVER public, so no need to filter them out
   def is_tournament_game(match):
       return (
           match.queue_id == 0 and              # Custom game
           match.game_duration > 900 and        # Min 15 minutes (filters remakes)
           all_players_above_level_30 and       # Tournament accounts only
           draft_mode_enabled                   # Pick & Ban phase required
       )

   # Timeline data fetching (ONLY for last 10 tournament games per team)
   def fetch_timeline_data(team_id):
       tournament_games = get_tournament_games(team_id, limit=10)

       for game in tournament_games:
           if not has_timeline_cached(game.match_id):
               timeline = riot_api.get_match_timeline(game.match_id)  # Expensive!
               store_timeline_data(game.match_id, timeline)
   ```

## 📊 Core Features

### 1. Player Analysis
- **Role Detection Algorithm**
  - Analyze last 20+ ranked games
  - Position frequency mapping
  - Flex player identification
  
- **Champion Pool Metrics**
  - Mastery points & level
  - Recent game frequency (30 days)
  - Performance metrics per champion
  - Meta vs Comfort pick classification

- **Performance Indicators**
  - KDA trends over time
  - CS/min by game phase
  - Vision score patterns
  - Objective participation rate

### 2. Team Scouting

#### Early Game Analysis
```json
{
  "first_blood_rate": 0.65,
  "first_tower_rate": 0.58,
  "early_dragon_control": 0.72,
  "average_gold_diff_15": 1847,
  "invade_tendency": 0.23,
  "level_1_strategies": ["invade", "defensive", "lane_swap"]
}
```

#### Draft Patterns
```json
{
  "ban_priorities": {
    "phase_1": ["Ksante", "Viego", "Orianna"],
    "phase_2": ["Jinx", "Thresh"]
  },
  "first_pick_priorities": ["Jax", "Rell", "Azir"],
  "flex_picks": ["Gragas", "Yasuo"],
  "comfort_picks": {
    "top": ["Aatrox", "Gnar"],
    "jungle": ["Lee Sin", "Viego"]
  }
}
```

### 3. Lineup Prediction

#### Prediction Algorithm Weights
```python
PREDICTION_WEIGHTS = {
    'recent_tournament_games': 0.50,  # Appearance in last 10 tournament games (HIGHEST PRIORITY)
    'role_coverage': 0.30,            # Proper role distribution
    'solo_queue_activity': 0.18,      # Games played last 7 days
    'performance_rating': 0.02        # Recent performance scores (benching is rare)
}

# Rationale: Tournament history is the strongest predictor because:
# - Roster changes are infrequent in Prime League
# - Benching players is rare
# - Recent tournament appearances are the most reliable indicator
```

#### Confidence Scoring
```python
def calculate_lineup_confidence(predicted_lineup):
    factors = {
        'games_together': count_recent_games_as_unit(),
        'role_clarity': assess_role_overlap(),
        'recent_activity': check_all_players_active(),
        'historical_accuracy': previous_prediction_success_rate()
    }
    return weighted_average(factors)
```

### 4. Pre-Game Reports

#### Report Structure
```markdown
# Scouting Report: [Opponent Team]
Generated: [Date/Time]

## Predicted Lineup
- Top: Player1 (90% confidence)
- Jungle: Player2 (85% confidence)
- Mid: Player3 (95% confidence)
- ADC: Player4 (100% confidence)
- Support: Player5 (88% confidence)

## Key Threats
1. Player3's Azir (8-1 record, 5.2 KDA)
2. Early game aggression (75% FB rate)
3. Dragon control (82% first dragon)

## Suggested Strategy
### Ban Phase
Priority 1: Azir, Viego, Ksante
Priority 2: Adaptation based on reveals

### Win Conditions
- Survive early game (0-15 min)
- Contest second dragon
- Exploit weak side laning

## Statistical Comparison
[Your Team] vs [Opponent]
- Early Game: 45% vs 55%
- Mid Game: 52% vs 48%
- Late Game: 58% vs 42%
```

## 🔗 API Integration

### Riot API Endpoints Used

```python
# Configuration
API_KEY = "RGAPI-xxxxx"
REGION = "europe"
PLATFORM = "euw1"

# Endpoints
SUMMONER_V4 = f"https://{PLATFORM}.api.riotgames.com/lol/summoner/v4"
MATCH_V5 = f"https://{REGION}.api.riotgames.com/lol/match/v5"
CHAMPION_MASTERY_V4 = f"https://{PLATFORM}.api.riotgames.com/lol/champion-mastery/v4"
LEAGUE_V4 = f"https://{PLATFORM}.api.riotgames.com/lol/league/v4"

# Rate Limiting
RATE_LIMITS = {
    "20_per_1_second": RateLimit(20, 1),
    "100_per_2_minutes": RateLimit(100, 120)
}
```

### Data Fetching Strategy

```python
class RiotAPIClient:
    def fetch_player_complete_data(self, summoner_name):
        # 1. Get summoner basic data
        summoner = self.get_summoner(summoner_name)
        
        # 2. Fetch parallel data
        tasks = [
            self.get_ranked_stats(summoner.id),
            self.get_match_history(summoner.puuid, count=100),
            self.get_champion_mastery(summoner.id),
        ]
        
        # 3. Filter and analyze
        ranked_stats, matches, mastery = await gather(*tasks)
        
        # 4. Separate match types
        tournament_games = filter_tournament_games(matches)
        ranked_games = filter_ranked_games(matches)
        
        return PlayerData(
            summoner=summoner,
            ranked_stats=ranked_stats,
            tournament_games=tournament_games,
            ranked_games=ranked_games,
            champion_pool=mastery
        )
```

## 🚀 Implementation Roadmap

### Phase 1: Core Data Collection (Week 1-2)
- [ ] Setup database schema
- [ ] Implement Riot API client with rate limiting
- [ ] Build OP.GG parser
- [ ] Create data ingestion pipeline
- [ ] Basic player and team models

### Phase 2: Analysis Engine (Week 3-4)
- [ ] Tournament game detection algorithm
- [ ] Role detection system
- [ ] Team composition analyzer
- [ ] Statistical calculations
- [ ] Lineup prediction model

### Phase 3: Frontend Development (Week 5-6)
- [ ] Team overview dashboard
- [ ] Player detail pages
- [ ] Head-to-head comparison
- [ ] Draft helper interface
- [ ] Report generator

### Phase 4: Advanced Features (Week 7-8)
- [ ] Trend analysis over time
- [ ] Machine learning for predictions
- [ ] Discord bot integration
- [ ] Live game tracking
- [ ] Scrim result management

### Phase 5: Optimization & Polish (Week 9-10)
- [ ] Caching strategy
- [ ] Performance optimization
- [ ] UI/UX improvements
- [ ] Testing & bug fixes
- [ ] Documentation

## 💻 Technology Stack

### Backend
```yaml
Language: Python 3.10+
Framework: Flask 3.0+
Database: PostgreSQL 15
Cache: Redis 7 (optional)
Queue: Celery (optional for background tasks)
ORM: SQLAlchemy / Flask-SQLAlchemy
```

### Frontend
```yaml
Framework: React 18 / Vue 3
UI Library: Material-UI / Vuetify
State Management: Redux / Pinia
Charts: Recharts / Chart.js
Build Tool: Vite
```

### Infrastructure
```yaml
Hosting: Docker + Kubernetes
CI/CD: GitHub Actions
Monitoring: Prometheus + Grafana
Logging: ELK Stack
Storage: S3 for reports
```

## 📈 Analytics & Metrics

### Key Performance Indicators (KPIs)
1. **Prediction Accuracy**: Lineup predictions vs actual
2. **Data Freshness**: Time since last update
3. **Coverage**: % of Prime League teams tracked
4. **User Engagement**: Reports generated, active users

### Monitoring Dashboard
```python
METRICS = {
    'api_calls_remaining': gauge,
    'predictions_made': counter,
    'accuracy_rate': histogram,
    'data_processing_time': timing,
    'cache_hit_rate': gauge
}
```

## 🔐 Security & Privacy

### Data Protection
- Summoner names only (no personal data)
- Rate limiting on API endpoints
- Authentication for team-specific data
- Encrypted database connections
- GDPR compliance for EU users

### Access Control
```python
ROLES = {
    'admin': ['all_permissions'],
    'coach': ['view_all', 'edit_team', 'generate_reports'],
    'player': ['view_team', 'view_reports'],
    'analyst': ['view_all', 'generate_reports']
}
```

## 📝 Example API Endpoints

```python
# Team Management
POST   /api/teams/import          # Import team via OP.GG
GET    /api/teams/{id}            # Get team details
PUT    /api/teams/{id}            # Update team info
GET    /api/teams/{id}/roster     # Get current roster
GET    /api/teams/{id}/stats      # Get team statistics

# Player Analysis
GET    /api/players/{id}          # Get player details
GET    /api/players/{id}/champions # Get champion pool
GET    /api/players/{id}/matches  # Get match history
GET    /api/players/{id}/performance # Get performance metrics

# Scouting
POST   /api/scout/predict-lineup  # Predict lineup for team
GET    /api/scout/report/{team_id} # Generate scouting report
GET    /api/scout/compare         # Compare two teams
POST   /api/scout/draft-helper    # Get draft suggestions

# Analytics
GET    /api/analytics/trends      # Get trend analysis
GET    /api/analytics/meta        # Current meta analysis
GET    /api/analytics/predictions # Prediction accuracy stats
```

## 🎮 Usage Example

### Typical Workflow
1. **Coach adds opponent team**
   ```bash
   POST /api/teams/import
   {
     "opgg_url": "https://www.op.gg/multisearch/euw?summoners=Player1,Player2,Player3,Player4,Player5,Player6,Player7"
   }
   ```

2. **System processes data**
   - Fetches all player data
   - Analyzes last 100 games per player
   - Identifies tournament games
   - Calculates statistics

3. **Generate pre-game report**
   ```bash
   GET /api/scout/report/{opponent_team_id}?match_date=2024-02-15
   ```

4. **Live draft assistance**
   ```bash
   POST /api/scout/draft-helper
   {
     "opponent_team_id": "uuid",
     "current_bans": ["Ksante", "Viego"],
     "current_picks": [],
     "our_side": "blue"
   }
   ```

## 🔄 Update Strategies

### Automatic Updates
```python
SCHEDULE = {
    'player_solo_queue': 'every_6_hours',
    'team_rosters': 'daily',
    'tournament_games': 'every_3_hours',
    'statistics': 'after_new_games',
    'predictions': 'on_demand'
}
```

### Manual Triggers
- Force update before important matches
- Refresh after roster changes
- Update after scrims

## 📊 Sample Queries

### Get Team's Recent Performance
```sql
SELECT 
    t.name,
    ts.games_played,
    ts.wins,
    ts.losses,
    ROUND(ts.wins::numeric / ts.games_played * 100, 2) as winrate,
    ts.first_blood_rate,
    ts.average_game_duration
FROM teams t
JOIN team_stats ts ON t.id = ts.team_id
WHERE ts.stat_type = 'tournament'
    AND t.id = ?
ORDER BY ts.updated_at DESC
LIMIT 1;
```

### Find Player's Best Champions
```sql
SELECT 
    pc.champion_name,
    pc.games_played_recent,
    pc.winrate_recent,
    pc.kda_average,
    pc.mastery_level,
    pc.mastery_points
FROM player_champions pc
WHERE pc.player_id = ?
    AND pc.games_played_recent > 5
ORDER BY 
    pc.winrate_recent DESC,
    pc.games_played_recent DESC
LIMIT 5;
```

### Predict Most Likely Lineup
```sql
WITH recent_games AS (
    SELECT 
        mp.player_id,
        mp.team_position,
        COUNT(*) as games_count,
        MAX(m.game_creation) as last_played
    FROM match_participants mp
    JOIN matches m ON mp.match_id = m.id
    WHERE mp.team_id = ?
        AND m.is_tournament_game = true
        AND m.game_creation > (EXTRACT(EPOCH FROM NOW() - INTERVAL '14 days') * 1000)
    GROUP BY mp.player_id, mp.team_position
),
ranked_players AS (
    SELECT 
        player_id,
        team_position,
        games_count,
        ROW_NUMBER() OVER (PARTITION BY team_position ORDER BY games_count DESC) as position_rank
    FROM recent_games
)
SELECT 
    p.summoner_name,
    rp.team_position,
    rp.games_count
FROM ranked_players rp
JOIN players p ON rp.player_id = p.id
WHERE rp.position_rank = 1
ORDER BY 
    CASE rp.team_position
        WHEN 'TOP' THEN 1
        WHEN 'JUNGLE' THEN 2
        WHEN 'MIDDLE' THEN 3
        WHEN 'BOTTOM' THEN 4
        WHEN 'UTILITY' THEN 5
    END;
```

## 🐛 Debugging & Logging

### Logging Strategy
```python
import logging

logging.config = {
    'version': 1,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
        'file': {'class': 'logging.FileHandler', 'filename': 'scout.log'},
        'error_file': {'class': 'logging.FileHandler', 'filename': 'errors.log'}
    },
    'loggers': {
        'api': {'handlers': ['console', 'file'], 'level': 'INFO'},
        'riot_client': {'handlers': ['file'], 'level': 'DEBUG'},
        'predictions': {'handlers': ['console', 'file'], 'level': 'INFO'},
        'errors': {'handlers': ['error_file'], 'level': 'ERROR'}
    }
}
```

## 🚦 Performance Optimizations

### Caching Strategy
```python
CACHE_CONFIGS = {
    'player_data': {'ttl': 3600},  # 1 hour
    'team_stats': {'ttl': 1800},   # 30 minutes
    'match_data': {'ttl': 86400},  # 24 hours
    'predictions': {'ttl': 600}     # 10 minutes
}
```

### Database Optimizations
- Batch inserts for match data
- Materialized views for complex statistics
- Partitioning for match_participants table
- Connection pooling

## 📚 Additional Resources

### Data Sources
- [Riot Games API Documentation](https://developer.riotgames.com/apis)
- [Prime League Website](https://primeleague.gg)
- [OP.GG](https://op.gg)
- [League of Legends Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon)

### Libraries & Tools
- **Python**: `flask`, `flask-sqlalchemy`, `psycopg2`, `requests`, `riot-watcher` (optional)
- **Frontend**: `react`, `recharts`, `axios`, `material-ui`

### Community Resources
- Prime League Discord servers
- League of Legends analytics communities
- Esports statistics forums

---

## 📞 Support & Contribution

For questions, feature requests, or contributions, please refer to the project repository.

**Version**: 1.0.0  
**Last Updated**: 2024  
**License**: MIT