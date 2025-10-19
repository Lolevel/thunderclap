"""
Draft Analysis Service
Analyzes ban/pick patterns for teams
Best Practice: Focused service for draft-specific logic
"""

from typing import Dict, List
from collections import defaultdict
from datetime import datetime, timedelta
from flask import current_app
from app import db
from app.models import Team, Match, MatchParticipant, DraftPattern


class DraftAnalyzer:
    """Service for analyzing draft patterns"""

    def analyze_team_draft_patterns(self, team: Team, days: int = 90) -> Dict:
        """
        Analyze ban/pick patterns for a team

        Args:
            team: Team model instance
            days: Days to analyze (default: 90)

        Returns:
            {
                'ban_priorities': {...},
                'pick_priorities': {...},
                'flex_picks': [...],
                'side_preferences': {...}
            }
        """
        current_app.logger.info(f"Analyzing draft patterns for {team.name}")

        cutoff = datetime.utcnow() - timedelta(days=days)

        # Get tournament matches
        matches = Match.query.filter(
            Match.is_tournament_game == True,
            Match.created_at >= cutoff,
            db.or_(Match.winning_team_id == team.id, Match.losing_team_id == team.id),
        ).all()

        if not matches:
            return {"error": "No tournament matches found"}

        # Analyze picks
        pick_counts = defaultdict(int)
        pick_wins = defaultdict(int)
        role_champion_counts = defaultdict(lambda: defaultdict(int))

        for match in matches:
            team_participants = MatchParticipant.query.filter_by(
                match_id=match.id, team_id=team.id
            ).all()

            for participant in team_participants:
                champion_id = participant.champion_id
                champion_name = participant.champion_name
                role = participant.team_position

                pick_counts[champion_name] += 1

                if participant.win:
                    pick_wins[champion_name] += 1

                if role:
                    role_champion_counts[champion_name][role] += 1

        # Top picks (sorted by frequency)
        top_picks = sorted(
            [(champ, count) for champ, count in pick_counts.items()],
            key=lambda x: x[1],
            reverse=True,
        )[:10]

        # Flex picks (champions played in 2+ roles)
        flex_picks = [
            {
                "champion": champ,
                "roles": list(roles.keys()),
                "frequency": sum(roles.values()),
            }
            for champ, roles in role_champion_counts.items()
            if len(roles) >= 2
        ]

        result = {
            "team_id": str(team.id),
            "team_name": team.name,
            "matches_analyzed": len(matches),
            "top_picks": [
                {
                    "champion": champ,
                    "games": count,
                    "winrate": (
                        round((pick_wins[champ] / count) * 100, 1) if count > 0 else 0
                    ),
                }
                for champ, count in top_picks
            ],
            "flex_picks": flex_picks[:5],  # Top 5 flex picks
            "total_unique_champions": len(pick_counts),
        }

        return result

    def suggest_bans_against_team(
        self, opponent_team: Team, limit: int = 5
    ) -> List[Dict]:
        """
        Suggest bans against an opponent team

        Args:
            opponent_team: Opponent team
            limit: Number of ban suggestions

        Returns:
            List of champion suggestions with reasoning
        """
        patterns = self.analyze_team_draft_patterns(opponent_team)

        if "error" in patterns:
            return []

        suggestions = []

        # Suggest high-priority picks with good winrate
        for pick in patterns["top_picks"][:limit]:
            if pick["games"] >= 3 and pick["winrate"] >= 55:
                suggestions.append(
                    {
                        "champion": pick["champion"],
                        "priority": "high",
                        "reason": f"Played {pick['games']} times with {pick['winrate']}% winrate",
                    }
                )

        return suggestions[:limit]
