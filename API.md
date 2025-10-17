# API Documentation

Prime League Scout REST API

Base URL: `http://localhost:5000/api`

---

## Teams

### Import Team via OP.GG
```http
POST /teams/import
Content-Type: application/json

{
  "opgg_url": "https://www.op.gg/multisearch/euw?summoners=Player1,Player2,Player3,Player4,Player5",
  "team_name": "Team Name" (optional),
  "team_tag": "TAG" (optional)
}
```

### Get Team
```http
GET /teams/{team_id}
```

### Get Team Roster
```http
GET /teams/{team_id}/roster
```

### List Teams
```http
GET /teams?page=1&per_page=20
```

---

## Matches

### Fetch Matches for Team
```http
POST /matches/fetch/team/{team_id}
Content-Type: application/json

{
  "count_per_player": 50,
  "tournament_only": false,
  "fetch_timelines": true
}
```

### Get Tournament Matches
```http
GET /matches/tournament/{team_id}?limit=20
```

### Get Match Details
```http
GET /matches/{match_id}
```

---

## Statistics

### Calculate Team Stats
```http
POST /stats/team/{team_id}/calculate
Content-Type: application/json

{
  "stat_type": "both",  // "tournament", "all", or "both"
  "days": 30
}
```

### Get Team Stats
```http
GET /stats/team/{team_id}?stat_type=tournament
```

---

## Players

### Get Player
```http
GET /players/{player_id}
```

### Get Player Champion Pool
```http
GET /players/{player_id}/champions?min_games=5&limit=20
```

---

## Scouting

### Predict Lineup
```http
POST /scout/predict-lineup
Content-Type: application/json

{
  "team_id": "uuid",
  "match_date": "2024-10-16" (optional),
  "save": true (optional)
}
```

**Response:**
```json
{
  "team_id": "uuid",
  "predicted_lineup": {
    "TOP": {
      "player_id": "...",
      "player_name": "...",
      "confidence": 85.5
    },
    "JUNGLE": {...},
    "MIDDLE": {...},
    "BOTTOM": {...},
    "UTILITY": {...}
  },
  "overall_confidence": 82.3,
  "prediction_factors": {
    "TOP": {
      "player_name": "...",
      "total_score": 0.855,
      "breakdown": {
        "tournament_games": 0.9,
        "role_coverage": 1.0,
        "solo_queue_activity": 0.7,
        "performance_rating": 0.75
      }
    }
  }
}
```

### Generate Scouting Report
```http
GET /scout/report/{team_id}
```

**Response:**
```json
{
  "team_id": "uuid",
  "team_name": "Team Name",
  "generated_at": "2024-10-16T...",
  "predicted_lineup": {...},
  "team_stats": {
    "games_played": 15,
    "wins": 9,
    "losses": 6,
    "winrate": 60.0,
    "first_blood_rate": 66.67,
    "first_tower_rate": 73.33,
    "average_gold_diff_at_15": 1500
  },
  "draft_patterns": {
    "top_picks": [
      {"champion": "Azir", "games": 8, "winrate": 75.0},
      {"champion": "Rell", "games": 7, "winrate": 71.4}
    ],
    "flex_picks": [...]
  },
  "suggested_bans": [
    {
      "champion": "Azir",
      "priority": "high",
      "reason": "Played 8 times with 75.0% winrate"
    }
  ]
}
```

### Draft Helper
```http
POST /scout/draft-helper
Content-Type: application/json

{
  "opponent_team_id": "uuid",
  "current_bans": ["Ksante", "Viego"],
  "current_picks": [],
  "our_side": "blue"
}
```

---

## Workflow Example

### 1. Import Team
```bash
curl -X POST http://localhost:5000/api/teams/import \
  -H "Content-Type: application/json" \
  -d '{
    "opgg_url": "https://www.op.gg/multisearch/euw?summoners=Player1,Player2,Player3",
    "team_name": "Example Team"
  }'
```

### 2. Fetch Match Data
```bash
curl -X POST http://localhost:5000/api/matches/fetch/team/{team_id} \
  -H "Content-Type: application/json" \
  -d '{
    "count_per_player": 100,
    "tournament_only": true,
    "fetch_timelines": true
  }'
```

### 3. Calculate Statistics
```bash
curl -X POST http://localhost:5000/api/stats/team/{team_id}/calculate \
  -H "Content-Type: application/json" \
  -d '{"stat_type": "both", "days": 30}'
```

### 4. Predict Lineup
```bash
curl -X POST http://localhost:5000/api/scout/predict-lineup \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": "{team_id}",
    "save": true
  }'
```

### 5. Generate Report
```bash
curl http://localhost:5000/api/scout/report/{team_id}
```

---

## Error Responses

All endpoints return standard error format:

```json
{
  "error": "Error message",
  "details": "Detailed error information (if available)"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error
- `501` - Not Implemented
