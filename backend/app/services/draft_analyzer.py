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
            'players': defaultdict(lambda: {'picks': 0, 'wins': 0})  # Track detailed stats per player
        })

        # Side performance
        blue_side_games = 0
        blue_side_wins = 0
        red_side_games = 0
        red_side_wins = 0

        for match in matches:
            # Determine which side the team played on
            team_won = match.winning_team_id == team.id

            # Get all team stats for this match (2 records: blue and red)
            all_team_stats = MatchTeamStats.query.filter_by(match_id=match.id).all()

            # Find the stats for our team based on win/loss
            team_stats_record = None
            for stats in all_team_stats:
                if (team_won and stats.win) or (not team_won and not stats.win):
                    team_stats_record = stats
                    break

            # Track side performance
            if team_stats_record:
                is_blue_side = team_stats_record.riot_team_id == 100

                if is_blue_side:
                    blue_side_games += 1
                    if team_won:
                        blue_side_wins += 1
                else:
                    red_side_games += 1
                    if team_won:
                        red_side_wins += 1

            # Get participants for this match (for champion pool analysis)
            # Get all participants and filter by riot_team_id matching our team's side
            all_participants = MatchParticipant.query.filter_by(match_id=match.id).all()

            # Filter participants by team side
            team_participants = []
            if team_stats_record:
                team_participants = [p for p in all_participants if p.riot_team_id == team_stats_record.riot_team_id]

            for participant in team_participants:
                champion_id = participant.champion_id
                player_id = participant.player_id

                champion_picks[champion_id]['total'] += 1
                if participant.win:
                    champion_picks[champion_id]['wins'] += 1

                if player_id:
                    champion_picks[champion_id]['players'][player_id]['picks'] += 1
                    if participant.win:
                        champion_picks[champion_id]['players'][player_id]['wins'] += 1

        # Build team champion pool with player info
        # Enrich with champion data from database
        from app.utils.champion_helper import batch_enrich_champions

        champion_ids = list(champion_picks.keys())
        champion_data_map = batch_enrich_champions(champion_ids, include_images=True)

        team_champion_pool = []
        for champion_id, data in champion_picks.items():
            winrate = (data['wins'] / data['total'] * 100) if data['total'] > 0 else 0

            # Get champion info from database
            champ_info = champion_data_map.get(champion_id, {
                'id': champion_id,
                'name': f'Champion {champion_id}',
                'key': f'Champion{champion_id}'
            })

            # Build list of all players who played this champion
            players_list = []
            for player_id, player_data in data['players'].items():
                player = Player.query.get(player_id)
                if player:
                    player_losses = player_data['picks'] - player_data['wins']
                    player_winrate = (player_data['wins'] / player_data['picks'] * 100) if player_data['picks'] > 0 else 0
                    players_list.append({
                        'player_id': str(player_id),
                        'player_name': player.summoner_name,
                        'picks': player_data['picks'],
                        'wins': player_data['wins'],
                        'losses': player_losses,
                        'winrate': round(player_winrate, 1)
                    })

            # Sort players by pick count (most picks first)
            players_list.sort(key=lambda x: x['picks'], reverse=True)

            # For display: show primary player or "Multiple"
            if len(players_list) == 1:
                display_player = players_list[0]['player_name']
            elif len(players_list) > 1:
                display_player = f"{players_list[0]['player_name']} +{len(players_list)-1}"
            else:
                display_player = None

            team_champion_pool.append({
                'champion_id': champion_id,
                'champion': champ_info.get('name', f'Champion {champion_id}'),
                'champion_key': champ_info.get('key'),
                'champion_icon': champ_info.get('icon_url'),
                'picks': data['total'],
                'wins': data['wins'],
                'losses': data['total'] - data['wins'],
                'winrate': round(winrate, 1),
                'player': display_player,
                'players': players_list,  # All players with individual stats
                'has_multiple_players': len(players_list) > 1
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
        bans_against_phase1 = defaultdict(int)  # Bans opponents use against team (phase 1)
        bans_against_phase2 = defaultdict(int)  # Bans opponents use against team (phase 2)

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
                # Analyze OUR bans
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

            # Get OPPONENT team stats for bans against us
            opponent_stats = MatchTeamStats.query.filter(
                MatchTeamStats.match_id == match.id,
                MatchTeamStats.team_id != team.id
            ).first()

            if opponent_stats:
                # Analyze opponent's bans (bans against us)
                opponent_bans = opponent_stats.bans or []
                for ban in opponent_bans:
                    champion_id = ban.get('championId')
                    pick_turn = ban.get('pickTurn')

                    if champion_id and champion_id != -1:
                        if pick_turn <= 6:
                            bans_against_phase1[champion_id] += 1
                        else:
                            bans_against_phase2[champion_id] += 1

        # Convert ban counts to sorted lists
        favorite_bans_phase1_list = [
            {'champion_id': champ_id, 'count': count}
            for champ_id, count in sorted(favorite_bans_phase1.items(), key=lambda x: x[1], reverse=True)
        ]  # All bans

        favorite_bans_phase2_list = [
            {'champion_id': champ_id, 'count': count}
            for champ_id, count in sorted(favorite_bans_phase2.items(), key=lambda x: x[1], reverse=True)
        ]  # All bans

        bans_against_phase1_list = [
            {'champion_id': champ_id, 'count': count}
            for champ_id, count in sorted(bans_against_phase1.items(), key=lambda x: x[1], reverse=True)
        ]  # All bans against

        bans_against_phase2_list = [
            {'champion_id': champ_id, 'count': count}
            for champ_id, count in sorted(bans_against_phase2.items(), key=lambda x: x[1], reverse=True)
        ]  # All bans against

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
            "bans_against": {
                "phase_1": bans_against_phase1_list,  # Bans against team (phase 1)
                "phase_2": bans_against_phase2_list   # Bans against team (phase 2)
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
        Get team's favorite bans by rotation from match_team_stats

        Args:
            team: Team instance
            limit: Top N bans per rotation

        Returns:
            {
                'rotation_1': [...],  # First ban phase (3 bans)
                'rotation_2': [...]   # Second ban phase (2 bans)
            }
        """
        from app.models.match import MatchTeamStats
        from collections import Counter

        # Get all tournament matches for this team
        matches = Match.query.filter(
            Match.is_tournament_game == True,
            db.or_(Match.winning_team_id == team.id, Match.losing_team_id == team.id)
        ).all()

        # Track bans by phase
        # Phase 1: Blue [1,3,5], Red [2,4,6]
        # Phase 2: Blue [8,10], Red [7,9]
        phase1_bans = Counter()
        phase2_bans = Counter()

        for match in matches:
            # Determine which side the team played on
            team_won = match.winning_team_id == team.id

            # Get all team stats for this match (2 records: blue and red)
            all_team_stats = MatchTeamStats.query.filter_by(match_id=match.id).all()

            # Find the stats for our team based on win/loss
            team_stats = None
            for stats in all_team_stats:
                if (team_won and stats.win) or (not team_won and not stats.win):
                    team_stats = stats
                    break

            if not team_stats or not team_stats.bans:
                continue

            # Determine which turns belong to this team
            riot_team_id = team_stats.riot_team_id
            if riot_team_id == 100:  # Blue
                phase1_turns = [1, 3, 5]
                phase2_turns = [8, 10]
            else:  # 200 = Red
                phase1_turns = [2, 4, 6]
                phase2_turns = [7, 9]

            # Count bans by phase
            for ban in team_stats.bans:
                champion_id = ban.get('championId')
                pick_turn = ban.get('pickTurn')

                if not champion_id or champion_id == -1:  # No ban
                    continue

                if pick_turn in phase1_turns:
                    phase1_bans[champion_id] += 1
                elif pick_turn in phase2_turns:
                    phase2_bans[champion_id] += 1

        # Enrich with champion data from database
        from app.utils.champion_helper import batch_enrich_champions

        # Get all unique champion IDs from bans
        all_ban_ids = set(champ_id for champ_id, _ in phase1_bans.most_common(limit))
        all_ban_ids.update(champ_id for champ_id, _ in phase2_bans.most_common(limit))

        champion_data_map = batch_enrich_champions(list(all_ban_ids), include_images=True)

        result = {
            'rotation_1': [
                {
                    'champion_id': champ_id,
                    'champion': champion_data_map.get(champ_id, {}).get('name', f'Champion {champ_id}'),
                    'champion_icon': champion_data_map.get(champ_id, {}).get('icon_url'),
                    'frequency': count
                }
                for champ_id, count in phase1_bans.most_common(limit)
            ],
            'rotation_2': [
                {
                    'champion_id': champ_id,
                    'champion': champion_data_map.get(champ_id, {}).get('name', f'Champion {champ_id}'),
                    'champion_icon': champion_data_map.get(champ_id, {}).get('icon_url'),
                    'frequency': count
                }
                for champ_id, count in phase2_bans.most_common(limit)
            ]
        }

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
        Calculate objective control statistics from match_team_stats

        Args:
            team: Team instance
            days: Days to analyze

        Returns:
            {
                'avg_dragons': float,
                'avg_barons': float,
                'avg_heralds': float,
                'first_blood_rate': float,
                'first_tower_rate': float,
                'total_games': int
            }
        """
        from app.models.match import MatchTeamStats

        cutoff = datetime.utcnow() - timedelta(days=days)

        matches = Match.query.filter(
            Match.is_tournament_game == True,
            Match.created_at >= cutoff,
            db.or_(Match.winning_team_id == team.id, Match.losing_team_id == team.id),
        ).all()

        if not matches:
            return {
                'first_blood_rate': 0,
                'first_tower_rate': 0,
                'avg_dragons': 0,
                'avg_barons': 0,
                'avg_heralds': 0,
                'total_games': 0
            }

        total_games = len(matches)
        first_blood_count = 0
        first_tower_count = 0
        total_dragons = 0
        total_barons = 0
        total_heralds = 0

        for match in matches:
            # Determine which side the team played on
            # If winning_team_id matches, team won; if losing_team_id matches, team lost
            team_won = match.winning_team_id == team.id

            # Get all team stats for this match (2 records: blue and red)
            all_team_stats = MatchTeamStats.query.filter_by(match_id=match.id).all()

            # Find the stats for our team based on win/loss
            team_stats = None
            for stats in all_team_stats:
                if (team_won and stats.win) or (not team_won and not stats.win):
                    team_stats = stats
                    break

            if team_stats:
                # First objectives
                if team_stats.first_blood:
                    first_blood_count += 1
                if team_stats.first_tower:
                    first_tower_count += 1

                # Objective counts
                total_dragons += team_stats.dragon_kills
                total_barons += team_stats.baron_kills
                total_heralds += team_stats.herald_kills

        return {
            'first_blood_rate': round((first_blood_count / total_games * 100), 1) if total_games > 0 else 0,
            'first_tower_rate': round((first_tower_count / total_games * 100), 1) if total_games > 0 else 0,
            'avg_dragons': round(total_dragons / total_games, 1) if total_games > 0 else 0,
            'avg_barons': round(total_barons / total_games, 1) if total_games > 0 else 0,
            'avg_heralds': round(total_heralds / total_games, 1) if total_games > 0 else 0,
            'total_games': total_games
        }
