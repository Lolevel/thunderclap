"""
Draft Analysis Service
Analyzes ban/pick patterns for teams
NEW: Tracks ban rotations, first picks, player assignments
"""

from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from datetime import datetime, timedelta
from flask import current_app
from app import db
from app.models import Team, Match, MatchParticipant, MatchTeamStats, DraftPattern, Player


class DraftAnalyzer:
    """Service for analyzing draft patterns"""

    def analyze_team_draft_patterns(self, team: Team, days: int = 90) -> Dict:
        """
        Analyze ban/pick patterns for a team
        NEW: Includes ban rotations, first picks, player assignments

        Args:
            team: Team model instance
            days: Days to analyze (default: 90)

        Returns:
            {
                'team_champion_pool': [...],  # All champions with player info
                'favorite_bans': {...},       # Ban priorities by rotation
                'bans_against': {...},        # Bans opponents use against team
                'first_pick_priority': [...], # Most picked on first pick
                'side_performance': {...}     # Blue/red side stats
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

        # Analyze picks with player info
        champion_picks = defaultdict(lambda: {
            'total': 0,
            'wins': 0,
            'players': defaultdict(int)  # Track which players played this champion
        })

        # Side performance
        blue_side_games = 0
        blue_side_wins = 0
        red_side_games = 0
        red_side_wins = 0

        for match in matches:
            team_participants = MatchParticipant.query.filter_by(
                match_id=match.id, team_id=team.id
            ).all()

            # Determine side using Riot's teamId (100 = Blue, 200 = Red)
            if team_participants:
                # Get side from first team participant's riot_team_id
                first_participant = team_participants[0]
                is_blue_side = first_participant.riot_team_id == 100 if first_participant.riot_team_id else None
                team_won = match.winning_team_id == team.id

                if is_blue_side is not None:
                    if is_blue_side:
                        blue_side_games += 1
                        if team_won:
                            blue_side_wins += 1
                    else:
                        red_side_games += 1
                        if team_won:
                            red_side_wins += 1

            for participant in team_participants:
                champion_name = participant.champion_name
                player_id = participant.player_id

                champion_picks[champion_name]['total'] += 1
                if participant.win:
                    champion_picks[champion_name]['wins'] += 1

                if player_id:
                    champion_picks[champion_name]['players'][player_id] += 1

        # Build team champion pool with player info
        team_champion_pool = []
        for champion, data in champion_picks.items():
            # Find most common player for this champion
            most_common_player_id = max(
                data['players'].items(),
                key=lambda x: x[1],
                default=(None, 0)
            )[0]

            player_name = None
            if most_common_player_id:
                player = Player.query.get(most_common_player_id)
                if player:
                    player_name = player.summoner_name

            winrate = (data['wins'] / data['total'] * 100) if data['total'] > 0 else 0

            team_champion_pool.append({
                'champion': champion,
                'picks': data['total'],
                'wins': data['wins'],
                'losses': data['total'] - data['wins'],
                'winrate': round(winrate, 1),
                'player': player_name,
                'player_id': str(most_common_player_id) if most_common_player_id else None
            })

        # Sort by picks descending
        team_champion_pool.sort(key=lambda x: x['picks'], reverse=True)

        # Side performance
        side_performance = {
            'blue': {
                'games': blue_side_games,
                'wins': blue_side_wins,
                'losses': blue_side_games - blue_side_wins,
                'winrate': round((blue_side_wins / blue_side_games * 100), 1) if blue_side_games > 0 else 0
            },
            'red': {
                'games': red_side_games,
                'wins': red_side_wins,
                'losses': red_side_games - red_side_wins,
                'winrate': round((red_side_wins / red_side_games * 100), 1) if red_side_games > 0 else 0
            }
        }

        # Analyze bans and objectives from MatchTeamStats
        favorite_bans_phase1 = defaultdict(int)  # Pick turns 1-6 (first 3 bans per team)
        favorite_bans_phase2 = defaultdict(int)  # Pick turns 7-10 (last 2 bans per team)

        # Objective control
        total_baron = 0
        total_dragon = 0
        total_herald = 0
        first_baron_count = 0
        first_dragon_count = 0
        first_herald_count = 0

        for match in matches:
            # Get team stats for this match
            team_stats = MatchTeamStats.query.filter_by(
                match_id=match.id,
                team_id=team.id
            ).first()

            if team_stats:
                # Analyze bans
                bans = team_stats.bans or []
                for ban in bans:
                    champion_id = ban.get('championId')
                    pick_turn = ban.get('pickTurn')

                    if champion_id and champion_id != -1:  # -1 means no ban
                        # Phase 1: Pick turns 1-6 (first 3 bans per team)
                        # Phase 2: Pick turns 7-10 (last 2 bans per team)
                        if pick_turn <= 6:
                            favorite_bans_phase1[champion_id] += 1
                        else:
                            favorite_bans_phase2[champion_id] += 1

                # Objective control
                total_baron += team_stats.baron_kills
                total_dragon += team_stats.dragon_kills
                total_herald += team_stats.herald_kills

                if team_stats.first_baron:
                    first_baron_count += 1
                if team_stats.first_dragon:
                    first_dragon_count += 1
                if team_stats.first_herald:
                    first_herald_count += 1

        # Convert ban counts to sorted lists
        favorite_bans_phase1_list = [
            {'champion_id': champ_id, 'count': count}
            for champ_id, count in sorted(favorite_bans_phase1.items(), key=lambda x: x[1], reverse=True)
        ][:10]  # Top 10

        favorite_bans_phase2_list = [
            {'champion_id': champ_id, 'count': count}
            for champ_id, count in sorted(favorite_bans_phase2.items(), key=lambda x: x[1], reverse=True)
        ][:10]  # Top 10

        # Calculate objective rates
        games_count = len(matches)
        objective_control = {
            'baron': {
                'total_kills': total_baron,
                'avg_per_game': round(total_baron / games_count, 2) if games_count > 0 else 0,
                'first_baron_rate': round((first_baron_count / games_count) * 100, 1) if games_count > 0 else 0
            },
            'dragon': {
                'total_kills': total_dragon,
                'avg_per_game': round(total_dragon / games_count, 2) if games_count > 0 else 0,
                'first_dragon_rate': round((first_dragon_count / games_count) * 100, 1) if games_count > 0 else 0
            },
            'herald': {
                'total_kills': total_herald,
                'avg_per_game': round(total_herald / games_count, 2) if games_count > 0 else 0,
                'first_herald_rate': round((first_herald_count / games_count) * 100, 1) if games_count > 0 else 0
            }
        }

        result = {
            "team_id": str(team.id),
            "team_name": team.name,
            "matches_analyzed": len(matches),
            "team_champion_pool": team_champion_pool,
            "side_performance": side_performance,
            "total_unique_champions": len(champion_picks),
            "favorite_bans": {
                "phase_1": favorite_bans_phase1_list,  # First ban phase (turns 1-6)
                "phase_2": favorite_bans_phase2_list   # Second ban phase (turns 7-10)
            },
            "objective_control": objective_control
        }

        return result

    def store_draft_pattern(
        self,
        team: Team,
        champion_id: int,
        champion_name: str,
        action_type: str,  # 'ban' or 'pick'
        player_id: Optional[str] = None,
        ban_rotation: Optional[int] = None,  # 1, 2, or 3
        is_first_pick: bool = False,
        pick_order: Optional[int] = None,
        side: str = 'both',  # 'blue', 'red', or 'both'
        won: bool = False
    ) -> DraftPattern:
        """
        Store or update a draft pattern

        Args:
            team: Team instance
            champion_id: Champion ID
            champion_name: Champion name
            action_type: 'ban' or 'pick'
            player_id: Player who picked (for picks)
            ban_rotation: Ban rotation (1, 2, 3)
            is_first_pick: Was this the first pick?
            pick_order: Pick order (1-5)
            side: 'blue', 'red', or 'both'
            won: Did team win this game?

        Returns:
            DraftPattern instance
        """
        # Find existing pattern
        pattern = DraftPattern.query.filter_by(
            team_id=team.id,
            champion_id=champion_id,
            action_type=action_type,
            ban_rotation=ban_rotation,
            is_first_pick=is_first_pick,
            side=side
        ).first()

        if not pattern:
            pattern = DraftPattern(
                team_id=team.id,
                champion_id=champion_id,
                champion_name=champion_name,
                action_type=action_type,
                ban_rotation=ban_rotation,
                is_first_pick=is_first_pick,
                pick_order=pick_order,
                side=side,
                frequency=0,
                winrate=0
            )
            db.session.add(pattern)

        # Update frequency
        pattern.frequency += 1
        pattern.last_used = datetime.utcnow()
        pattern.champion_name = champion_name  # Update in case it changed

        if player_id and action_type == 'pick':
            pattern.player_id = player_id

        # Update winrate
        if pattern.frequency == 1:
            pattern.winrate = 100.0 if won else 0.0
        else:
            # Incremental winrate calculation
            old_wins = (pattern.frequency - 1) * (pattern.winrate / 100.0)
            new_wins = old_wins + (1 if won else 0)
            pattern.winrate = round((new_wins / pattern.frequency) * 100, 2)

        db.session.commit()

        return pattern

    def get_favorite_bans(self, team: Team, limit: int = 3) -> Dict[str, List[Dict]]:
        """
        Get team's favorite bans by rotation

        Args:
            team: Team instance
            limit: Top N bans per rotation

        Returns:
            {
                'rotation_1': [...],
                'rotation_2': [...],
                'rotation_3': [...]
            }
        """
        result = {
            'rotation_1': [],
            'rotation_2': [],
            'rotation_3': []
        }

        for rotation in [1, 2, 3]:
            patterns = DraftPattern.query.filter_by(
                team_id=team.id,
                action_type='ban',
                ban_rotation=rotation
            ).order_by(DraftPattern.frequency.desc()).limit(limit).all()

            result[f'rotation_{rotation}'] = [
                {
                    'champion': p.champion_name,
                    'champion_id': p.champion_id,
                    'frequency': p.frequency,
                    'winrate': float(p.winrate) if p.winrate else 0
                }
                for p in patterns
            ]

        return result

    def get_first_pick_priority(self, team: Team, limit: int = 3) -> List[Dict]:
        """
        Get team's first pick priorities

        Args:
            team: Team instance
            limit: Top N champions

        Returns:
            List of first pick champions with stats
        """
        patterns = DraftPattern.query.filter_by(
            team_id=team.id,
            action_type='pick',
            is_first_pick=True
        ).order_by(DraftPattern.frequency.desc()).limit(limit).all()

        return [
            {
                'champion': p.champion_name,
                'champion_id': p.champion_id,
                'frequency': p.frequency,
                'winrate': float(p.winrate) if p.winrate else 0,
                'player': p.player.summoner_name if p.player_id else None,
                'player_id': str(p.player_id) if p.player_id else None
            }
            for p in patterns
        ]

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
        for pick in patterns["team_champion_pool"][:limit]:
            if pick["picks"] >= 3 and pick["winrate"] >= 55:
                suggestions.append(
                    {
                        "champion": pick["champion"],
                        "priority": "high",
                        "reason": f"Played {pick['picks']} times with {pick['winrate']}% winrate by {pick['player'] or 'team'}",
                        "player": pick["player"],
                        "games": pick["picks"],
                        "winrate": pick["winrate"]
                    }
                )

        return suggestions[:limit]

    def calculate_objective_stats(self, team: Team, days: int = 90) -> Dict:
        """
        Calculate objective control statistics

        Args:
            team: Team instance
            days: Days to analyze

        Returns:
            {
                'avg_dragons': float,
                'avg_barons': float,
                'avg_heralds': float,
                'first_blood_rate': float,
                'first_tower_rate': float
            }
        """
        cutoff = datetime.utcnow() - timedelta(days=days)

        matches = Match.query.filter(
            Match.is_tournament_game == True,
            Match.created_at >= cutoff,
            db.or_(Match.winning_team_id == team.id, Match.losing_team_id == team.id),
        ).all()

        if not matches:
            return {}

        total_games = len(matches)
        first_blood_count = 0
        first_tower_count = 0

        for match in matches:
            team_participants = MatchParticipant.query.filter_by(
                match_id=match.id, team_id=team.id
            ).all()

            # First blood
            if any(p.first_blood for p in team_participants):
                first_blood_count += 1

            # First tower
            if any(p.first_tower for p in team_participants):
                first_tower_count += 1

        return {
            'first_blood_rate': round((first_blood_count / total_games * 100), 1) if total_games > 0 else 0,
            'first_tower_rate': round((first_tower_count / total_games * 100), 1) if total_games > 0 else 0,
            'total_games': total_games,
            # Note: Dragon/Baron/Herald stats need timeline data
            # TODO: Parse from MatchTimelineData
            'avg_dragons': 0,  # Placeholder
            'avg_barons': 0,   # Placeholder
            'avg_heralds': 0   # Placeholder
        }
