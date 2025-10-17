"""
Statistics Calculator Service
Calculates team and player statistics from match data
Best Practice: Single Responsibility Principle - dedicated service for stats
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_
from flask import current_app
from app import db
from app.models import (
    Team, TeamStats, Player, PlayerChampion, Match,
    MatchParticipant, MatchTimelineData, PlayerPerformanceTimeline
)


class StatsCalculator:
    """
    Service for calculating statistics
    Modular: Can be used independently or as part of larger workflows
    """

    def calculate_team_stats(self, team: Team, stat_type: str = 'tournament') -> TeamStats:
        """
        Calculate and update team statistics

        Args:
            team: Team model instance
            stat_type: 'tournament' or 'all'

        Returns:
            Updated TeamStats instance
        """
        current_app.logger.info(f'Calculating {stat_type} stats for team {team.name}')

        # Get matches for this team
        matches_query = Match.query.filter(
            or_(
                Match.winning_team_id == team.id,
                Match.losing_team_id == team.id
            )
        )

        if stat_type == 'tournament':
            matches_query = matches_query.filter(Match.is_tournament_game == True)

        matches = matches_query.all()

        if not matches:
            current_app.logger.warning(f'No matches found for team {team.name}')
            return None

        # Calculate basic stats
        total_games = len(matches)
        wins = len([m for m in matches if m.winning_team_id == team.id])
        losses = total_games - wins

        # Calculate advanced stats
        first_blood_count = 0
        first_tower_count = 0
        total_duration = 0
        gold_diffs_10 = []
        gold_diffs_15 = []
        comeback_wins = 0

        for match in matches:
            # Duration
            if match.game_duration:
                total_duration += match.game_duration

            # Get team participants
            team_participants = [
                p for p in match.participants
                if p.team_id == team.id
            ]

            # First blood rate
            if any(p.first_blood for p in team_participants):
                first_blood_count += 1

            # First tower rate
            if any(p.first_tower for p in team_participants):
                first_tower_count += 1

            # Gold differential stats (from timeline)
            if match.timeline_data:
                timeline = match.timeline_data

                # Determine if team was blue or red side
                # (participant IDs 1-5 are blue, 6-10 are red)
                first_participant = team_participants[0] if team_participants else None
                if first_participant:
                    # This is simplified - in real implementation, check team side from match data
                    if timeline.gold_diff_at_10 is not None:
                        gold_diffs_10.append(timeline.gold_diff_at_10)

                    if timeline.gold_diff_at_15 is not None:
                        gold_diffs_15.append(timeline.gold_diff_at_15)

                        # Comeback win: won despite being behind at 15
                        if match.winning_team_id == team.id and timeline.gold_diff_at_15 < -1000:
                            comeback_wins += 1

        # Calculate averages
        avg_game_duration = total_duration // total_games if total_games > 0 else 0
        avg_gold_diff_10 = sum(gold_diffs_10) // len(gold_diffs_10) if gold_diffs_10 else None
        avg_gold_diff_15 = sum(gold_diffs_15) // len(gold_diffs_15) if gold_diffs_15 else None

        # Get or create team stats
        team_stats = TeamStats.query.filter_by(
            team_id=team.id,
            stat_type=stat_type
        ).first()

        if not team_stats:
            team_stats = TeamStats(team_id=team.id, stat_type=stat_type)
            db.session.add(team_stats)

        # Update stats
        team_stats.games_played = total_games
        team_stats.wins = wins
        team_stats.losses = losses
        team_stats.first_blood_rate = round((first_blood_count / total_games) * 100, 2) if total_games > 0 else 0
        team_stats.first_tower_rate = round((first_tower_count / total_games) * 100, 2) if total_games > 0 else 0
        team_stats.average_game_duration = avg_game_duration
        team_stats.average_gold_diff_at_10 = avg_gold_diff_10
        team_stats.average_gold_diff_at_15 = avg_gold_diff_15
        team_stats.comeback_win_rate = round((comeback_wins / wins) * 100, 2) if wins > 0 else 0
        team_stats.updated_at = datetime.utcnow()

        db.session.commit()

        current_app.logger.info(
            f'Updated {stat_type} stats for {team.name}: {wins}W-{losses}L ({total_games} games)'
        )

        return team_stats

    def calculate_player_champion_stats(self, player: Player, days: int = 30) -> int:
        """
        Calculate champion statistics for a player

        Args:
            player: Player model instance
            days: Number of days to consider for "recent" stats

        Returns:
            Number of champions updated
        """
        current_app.logger.info(f'Calculating champion stats for {player.summoner_name}')

        # Get all match participations
        participations = MatchParticipant.query.filter_by(player_id=player.id).all()

        if not participations:
            current_app.logger.warning(f'No participations found for {player.summoner_name}')
            return 0

        # Group by champion
        champion_data = {}

        recent_cutoff = datetime.utcnow() - timedelta(days=days)

        for participation in participations:
            champion_id = participation.champion_id
            match = participation.match

            if champion_id not in champion_data:
                champion_data[champion_id] = {
                    'champion_name': participation.champion_name,
                    'total_games': 0,
                    'total_wins': 0,
                    'recent_games': 0,
                    'recent_wins': 0,
                    'kills': [],
                    'deaths': [],
                    'assists': [],
                    'cs_per_min': [],
                    'last_played': None
                }

            data = champion_data[champion_id]

            # Total stats
            data['total_games'] += 1
            if participation.win:
                data['total_wins'] += 1

            # KDA tracking
            if participation.kills is not None:
                data['kills'].append(participation.kills)
            if participation.deaths is not None:
                data['deaths'].append(participation.deaths)
            if participation.assists is not None:
                data['assists'].append(participation.assists)
            if participation.cs_per_min:
                data['cs_per_min'].append(float(participation.cs_per_min))

            # Recent stats (last N days)
            if match and match.created_at >= recent_cutoff:
                data['recent_games'] += 1
                if participation.win:
                    data['recent_wins'] += 1

            # Last played
            if match and (data['last_played'] is None or match.created_at > data['last_played']):
                data['last_played'] = match.created_at

        # Update database
        champions_updated = 0

        for champion_id, data in champion_data.items():
            # Get or create champion entry
            player_champion = PlayerChampion.query.filter_by(
                player_id=player.id,
                champion_id=champion_id
            ).first()

            if not player_champion:
                player_champion = PlayerChampion(
                    player_id=player.id,
                    champion_id=champion_id,
                    champion_name=data['champion_name']
                )
                db.session.add(player_champion)

            # Calculate averages
            avg_kills = sum(data['kills']) / len(data['kills']) if data['kills'] else 0
            avg_deaths = max(sum(data['deaths']) / len(data['deaths']), 1) if data['deaths'] else 1
            avg_assists = sum(data['assists']) / len(data['assists']) if data['assists'] else 0
            avg_kda = (avg_kills + avg_assists) / avg_deaths

            # Update stats
            player_champion.games_played_total = data['total_games']
            player_champion.games_played_recent = data['recent_games']
            player_champion.winrate_total = round((data['total_wins'] / data['total_games']) * 100, 2)
            player_champion.winrate_recent = round(
                (data['recent_wins'] / data['recent_games']) * 100, 2
            ) if data['recent_games'] > 0 else 0
            player_champion.kda_average = round(avg_kda, 2)
            player_champion.cs_per_min = round(
                sum(data['cs_per_min']) / len(data['cs_per_min']), 2
            ) if data['cs_per_min'] else 0
            player_champion.last_played = data['last_played']
            player_champion.updated_at = datetime.utcnow()

            champions_updated += 1

        db.session.commit()

        current_app.logger.info(
            f'Updated {champions_updated} champion stats for {player.summoner_name}'
        )

        return champions_updated

    def detect_player_main_role(self, player: Player, games_to_analyze: int = 20) -> Optional[str]:
        """
        Detect player's main role based on recent games

        Args:
            player: Player model instance
            games_to_analyze: Number of recent games to analyze

        Returns:
            Main role (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY) or None
        """
        # Get recent match participations
        participations = MatchParticipant.query.filter_by(
            player_id=player.id
        ).join(Match).order_by(
            Match.game_creation.desc()
        ).limit(games_to_analyze).all()

        if not participations:
            return None

        # Count role frequencies
        role_counts = {}

        for participation in participations:
            # Use team_position (Riot's detected position) if available
            role = participation.team_position or participation.role
            if role:
                role_counts[role] = role_counts.get(role, 0) + 1

        if not role_counts:
            return None

        # Get most common role
        main_role = max(role_counts, key=role_counts.get)
        frequency = role_counts[main_role] / len(participations)

        current_app.logger.info(
            f'{player.summoner_name} main role: {main_role} ({frequency:.0%} of games)'
        )

        return main_role

    def calculate_all_stats_for_team(self, team: Team, days: int = 30) -> Dict[str, Any]:
        """
        Calculate all statistics for a team (convenience method)

        Args:
            team: Team model instance
            days: Days for "recent" calculations

        Returns:
            Dictionary with summary of calculations
        """
        current_app.logger.info(f'Calculating all stats for team {team.name}')

        result = {
            'team_id': str(team.id),
            'team_name': team.name,
            'stats_calculated': []
        }

        # Team stats (tournament and all)
        tournament_stats = self.calculate_team_stats(team, 'tournament')
        all_stats = self.calculate_team_stats(team, 'all')

        if tournament_stats:
            result['stats_calculated'].append('tournament_stats')
        if all_stats:
            result['stats_calculated'].append('all_stats')

        # Player champion stats
        active_roster = [r for r in team.rosters if r.leave_date is None]
        champions_updated = 0

        for roster_entry in active_roster:
            player = roster_entry.player
            updated = self.calculate_player_champion_stats(player, days)
            champions_updated += updated

            # Detect main role
            main_role = self.detect_player_main_role(player)
            if main_role and not roster_entry.role:
                roster_entry.role = main_role
                db.session.commit()

        result['champions_updated'] = champions_updated
        result['players_processed'] = len(active_roster)

        current_app.logger.info(f'Finished calculating all stats for {team.name}')

        return result
