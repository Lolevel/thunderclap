# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prime League Scout is a scouting and preparation tool for Prime League (League of Legends) teams. It leverages the Riot Games API to analyze opponents, predict lineups, and provide strategic insights for competitive matches.

## Architecture

### Data Flow
The system follows a three-tier architecture:
1. **Frontend** (React/Vue) - User interface for viewing reports and managing teams
2. **Backend API** (Python FastAPI or Node.js Express) - Business logic and data processing
3. **Database** (PostgreSQL) - Persistent storage with Redis for caching

External integrations:
- **Riot Games API** - Primary data source for player/match statistics
- **OP.GG** - Team roster discovery via URL parsing

### Core Components

**Data Collection Pipeline**: Imports teams via OP.GG URLs → fetches player data from Riot API → filters tournament games (queue_id=0, duration>900s, draft mode) → computes statistics

**Tournament Game Detection**: Custom games are identified as tournament matches when they have queue_id=0, duration>15min, all players level 30+, and draft mode enabled

**Lineup Prediction Algorithm**: Uses weighted factors (40% recent tournament appearances, 30% role coverage, 20% solo queue activity, 10% performance rating) to predict the 5-player starting roster

## Database Schema

Key tables and relationships:
- `teams` - Team metadata (name, tag, prime_league_id, division)
- `players` - Player data (summoner_name, puuid, rank, region)
- `team_rosters` - Many-to-many between teams/players with role assignment
- `matches` - Game data with tournament/scrim flags
- `match_participants` - Player performance in specific matches
- `player_champions` - Champion pool statistics (mastery, games, winrate, KDA)
- `draft_patterns` - Ban/pick tendencies by team and side
- `lineup_predictions` - Predicted rosters with confidence scores
- `scouting_reports` - Generated analysis reports

Critical indexes for performance:
```sql
-- Fast player lookups
idx_players_puuid ON players(puuid)
idx_players_summoner_name ON players(summoner_name)

-- Efficient match queries
idx_matches_game_creation ON matches(game_creation DESC)
idx_matches_tournament ON matches(is_tournament_game, game_creation DESC)
idx_match_participants_player ON match_participants(player_id, match_id)

-- Draft analysis
idx_draft_patterns_team ON draft_patterns(team_id, action_type, frequency DESC)
```

## Riot API Integration

**API Endpoints Used**:
- `SUMMONER_V4` - Get summoner by name/PUUID
- `MATCH_V5` - Fetch match history and match details
- `CHAMPION_MASTERY_V4` - Champion pool data
- `LEAGUE_V4` - Ranked statistics

**Rate Limiting**: Riot API has strict limits (20/sec, 100/2min). Implement rate limiter with exponential backoff and request queuing.

**Data Fetching Strategy**:
1. Get summoner basic data (id, puuid, level)
2. Parallel fetch: ranked stats + match history (100 games) + champion mastery
3. Filter matches by type (tournament vs ranked vs normal)
4. Process match details in batches to respect rate limits

**Region/Platform**: Use `europe` for routing + `euw1` for platform-specific endpoints (Prime League is EUW)

## Key Algorithms

### Role Detection
Analyze last 20+ ranked games, map `teamPosition` field frequency. Players with <60% in one role are marked as flex players. Tournament game roles take priority over solo queue.

**Role Names**: Use `Top`, `Jungle`, `Mid`, `Bot`, `Support` (not UTILITY, rename UTILITY to Support in UI)

### Performance Metrics
- **KDA**: (Kills + Assists) / Deaths (minimum 1)
- **CS/min**: Total CS / (game_duration / 60)
- **Pink Wards**: Control wards placed per game
- **Vision Score**: Normalized per game length
- **Gold Diff @15**: Extracted from Timeline API (last 10 tournament games only to respect rate limits)

### Player Champion Statistics
Players should display two tabs:
1. **Prime League Tab**: Shows champion stats from tournament games (queue_id=0)
   - Games played
   - Winrate
   - KDA
   - CS/min
   - Pink wards per game

2. **Solo Queue Tab**: Shows top 20 most played champions this season
   - Games played
   - Winrate
   - KDA
   - CS/min
   - Pink wards per game

**Note**: Player level field is no longer needed

### Lineup Prediction Weights
```
PREDICTION_WEIGHTS = {
    'recent_tournament_games': 0.50,  # 50% - Increased importance
    'role_coverage': 0.30,            # 30% - Proper role distribution
    'solo_queue_activity': 0.18,      # 18% - Recent activity check
    'performance_rating': 0.02        # 2% - Minimal impact (benching rare)
}
```

Tournament history is the strongest predictor since roster changes are infrequent and benching is rare in Prime League.

### Lineup Prediction Confidence
Factors contributing to confidence score:
- Games together as a unit (higher = more confident)
- Role clarity (no overlapping mains = more confident)
- Recent activity (all 5 active in last 7 days = more confident)
- Historical accuracy (improves over time)

## API Endpoints (Backend)

```
POST   /api/teams/import          # Import via OP.GG URL
POST   /api/teams/bulk-analyze    # Analyze up to 20 players for tournament games
GET    /api/teams/{id}/roster     # Current roster
GET    /api/teams/{id}/stats      # Team statistics

GET    /api/players/{id}/champions # Champion pool
GET    /api/players/{id}/performance # Performance metrics

POST   /api/scout/predict-lineup  # Predict starting 5
GET    /api/scout/report/{team_id} # Generate scouting report
POST   /api/scout/draft-helper    # Get draft suggestions
```

## Development Workflow

### Setting Up Database
1. Run schema from project.md (tables section)
2. Create indexes for performance
3. Optionally seed with test data

### Team Import & Analysis
**Import Process**: Import entire team via OP.GG multi-search URL. System filters for Prime League games where at least 4 players from the imported roster participated together.

**API Endpoint**: `POST /api/teams/import`
```json
{
  "opgg_url": "https://www.op.gg/multisearch/euw?summoners=Player1,Player2,...",
  "min_players_together": 4
}
```

The system will:
1. Parse all player names from OP.GG URL
2. Fetch tournament games for each player
3. Find games where 4+ of the imported players played together
4. Store only relevant tournament games for the team

**Bulk Team Analysis**: Still available for analyzing up to 20 players

**API Endpoint**: `POST /api/teams/bulk-analyze`
```json
{
  "player_names": ["Player1", "Player2", "Player3", ...],
  "min_players": 4,
  "max_players": 5
}
```

**Response Format**:
```json
{
  "analysis_id": "uuid",
  "total_players": 20,
  "tournament_games": [
    {
      "match_id": "EUW1_1234567890",
      "game_creation": 1640995200000,
      "players_found": ["Player1", "Player2", "Player3", "Player4", "Player5"],
      "player_count": 5,
      "team_composition": "full_team",
      "win": true,
      "game_duration": 1800
    },
    {
      "match_id": "EUW1_1234567891", 
      "game_creation": 1640995200000,
      "players_found": ["Player1", "Player2", "Player3", "Player4"],
      "player_count": 4,
      "team_composition": "partial_team",
      "win": false,
      "game_duration": 2100
    }
  ],
  "statistics": {
    "total_games": 15,
    "full_team_games": 8,
    "partial_team_games": 7,
    "winrate_full_team": 0.75,
    "winrate_partial_team": 0.57
  }
}
```

**Implementation Notes**:
- Query all tournament games for each player
- Find intersections where 4+ players participated
- Mark games as "full_team" (5 players) or "partial_team" (4 players)
- Calculate winrates and statistics for each composition type
- Return comprehensive analysis of team combinations

### Tournament Game Detection
**Important:** All custom games visible via Riot API are tournament games (scrims are never public).

Detection criteria:
```python
def is_tournament_game(match):
    return (
        match.queue_id == 0 and              # Custom Game
        match.game_duration > 900 and        # Minimum 15 minutes (filters remakes)
        all_players_above_level_30 and       # Tournament accounts only
        draft_mode_enabled                   # Pick & Ban required
    )
```

No need to distinguish scrims from tournaments - treat all as competitive data.

### Timeline API Usage Strategy
**Only fetch timeline data for the last 10 tournament games per team** to respect rate limits.

```python
def fetch_timeline_data(team_id):
    tournament_games = get_tournament_games(team_id, limit=10)

    for game in tournament_games:
        timeline = riot_api.get_match_timeline(game.match_id)  # Expensive API call
        gold_diff_15 = extract_gold_diff_at_15(timeline)
        # Store in database for caching
```

Use this data for:
- Gold differential at 15 minutes
- Early game objective control (first dragon/herald timing)
- Early game aggression patterns

### Rate Limit Handling
When implementing Riot API client:
- Use semaphore/queue for concurrent requests
- Track remaining rate limit from response headers
- Implement retry logic with exponential backoff for 429 errors
- Log all API calls for debugging rate limit issues
- **Timeline calls count against rate limit heavily - use sparingly**

### Lineup Prediction Testing
Compare predicted lineups against actual tournament rosters. Track accuracy over time to tune prediction weights.

## Important Data Patterns

**OP.GG Multi-Search URL Format**:
```
https://www.op.gg/multisearch/euw?summoners=Name1,Name2,Name3,...
```
Parse summoner names from `summoners` query parameter (comma-separated, URL-encoded)

**Riot Match ID Format**: `{platform}_{matchId}` (e.g., `EUW1_6543210987`)

**Role Names**: Store as Riot's values internally (`TOP`, `JUNGLE`, `MIDDLE`, `BOTTOM`, `UTILITY`) but display as: `Top`, `Jungle`, `Mid`, `Bot`, `Support` in the UI

**Queue IDs**: 0=Custom, 420=Ranked Solo, 440=Ranked Flex, 400=Normal Draft

## Caching Strategy

Recommended TTL values:
- Player data: 1 hour (updates slowly)
- Team stats: 30 minutes (changes after games)
- Match data: 24 hours (immutable once completed)
- Lineup predictions: 10 minutes (recalculate frequently before matches)

Cache keys should include relevant parameters (e.g., `player:{puuid}:champions`, `team:{id}:stats:{stat_type}`)

## Performance Considerations

- **Batch Processing**: When importing a team, batch match detail fetches (e.g., 10 concurrent requests with rate limiting)
- **Materialized Views**: Pre-compute complex statistics (team_stats, player_champions aggregates)
- **Pagination**: Match history endpoints support pagination; fetch in chunks
- **Selective Updates**: Only re-fetch changed data (check last_active timestamps)

## Security Notes

- Store Riot API key in environment variable (`RIOT_API_KEY`), never commit
- Rate limit public API endpoints to prevent abuse
- Validate all user inputs (especially OP.GG URLs for injection)
- Only store public summoner data (no personal information)
- Implement proper CORS for frontend-backend communication

## UI/Frontend Requirements

### Team Overview Page
The overview should display the most important information at a glance:
- **Prime League Stats**: Total PL games, wins/losses, winrate
- **Top 5 Team Champions**: Most picked champions across all PL games (with winrate)
- **Average Team Rank**: Average Elo of the roster
- **Player Count**: Number of players on the roster

**Note**: Remove "last matches" widget from dashboard (not on team panel) as it's redundant

### Team Tabs Structure
1. **Overview** - Summary statistics (as above)
2. **Players** - Roster with roles (Top, Jungle, Mid, Bot, Support)
   - Display roles as: Top, Jungle, Mid, Bot, Support (not UTILITY)
   - Each player row should have button to open their individual OP.GG
   - Add checkbox selection to create multi-search OP.GG URL for selected players
   - Button to open full team OP.GG

3. **Draft Analysis** - Comprehensive draft statistics from PL games
   - **Team Champion Pool**: All champions played by the team with winrate
     - Show which player played which champion
   - **Favorite Bans (Rotation 1/2/3)**: Top 3 most banned champions in each ban phase
   - **Bans Against Them (Rotation 1/2/3)**: Champions most frequently banned against this team
   - **First Pick Priority**: Top 3 most picked champions when team has first pick

4. **Scouting Report** - Detailed game statistics
   - **Side Performance**: Games on blue/red side with winrate for each side
   - **Average Game Duration**: Mean game time across all PL games
   - **First Blood %**: Percentage of games where team gets first blood
   - **First Tower %**: Percentage of games where team gets first tower
   - **Objective Control**: Average dragons per game, average barons per game, etc.
   - **Timeline Data**: All timeline-based statistics from stored data

### Player Detail Pages
- Remove player level field
- Display champion statistics in two tabs:
  - **Prime League**: Tournament games only
  - **Solo Queue**: Top 20 champions this season
- For each champion show: Games, Winrate, KDA, CS/min, Pink Wards/game

### OP.GG Integration
- Team page: Button to open `https://www.op.gg/multisearch/euw?summoners=Player1,Player2,...`
- Player rows: Button to open individual OP.GG
- Checkboxes: Select multiple players → generate multi-search OP.GG URL

### Buttons to Review
- **"First Team Import" Button**: Currently non-functional when no teams exist - needs to be fixed or removed
- **"Update Stats" Button**: Verify it actually refreshes data correctly

## Common Gotchas

1. **Match Timeline**: Riot's timeline endpoint is separate from match details. **Only fetch for last 10 tournament games per team** due to rate limits. Timeline data is expensive.
2. **Champion IDs**: Use Data Dragon static data for champion ID → name mapping (changes with patches)
3. **Patch Versions**: Match data includes game_version; consider filtering by recent patches for accurate meta analysis
4. **Summoner Name Changes**: PUUID is permanent identifier, summoner names can change (always use PUUID internally)
5. **Queue ID Changes**: Riot occasionally modifies queue IDs; maintain a mapping table
6. **Role Ambiguity**: Riot's auto-detection isn't perfect; may need manual correction for flex picks
7. **Public Custom Games**: All custom games visible via API are competitive (tournaments). Scrims are always private and not accessible, so no need to filter them out.
8. **Role Display**: Store roles using Riot's values but always display user-friendly names (Support instead of UTILITY, Mid instead of MIDDLE, Bot instead of BOTTOM)

## Dependencies

**Backend**:
- Python 3.10+: `flask`, `flask-sqlalchemy`, `psycopg2-binary`, `requests`, `python-dotenv`
- Optional: `flask-cors`, `flask-migrate`, `redis` (for caching)

**Database**: PostgreSQL 15+ (requires UUID support and JSONB)

**Cache**: Redis 7+ (optional) for caching and rate limit tracking
