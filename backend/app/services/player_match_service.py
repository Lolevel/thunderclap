"""
Player Match Service
Handles fetching and storing ALL tournament games for individual players
Separate from team-based match tracking
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime
from app import db
from app.models.player import Player
from app.models.match import Match
from utils.match_data_extractor import store_complete_match_data

logger = logging.getLogger(__name__)


class PlayerMatchService:
    """
    Service for managing player-specific tournament matches

    Key difference from team match import:
    - Team imports: Only games where 4+ players from team played together
    - Player imports: ALL tournament games for a specific player

    This allows in-depth player analysis across all their Prime League games,
    not just games with their current team.
    """

    def __init__(self, riot_api):
        """
        Initialize service with Riot API client

        Args:
            riot_api: RiotAPI instance for fetching match data
        """
        self.riot_api = riot_api

    def fetch_all_player_tournament_games(
        self,
        player: Player,
        max_games: int = 100,
        force_refresh: bool = False
    ) -> Dict:
        """
        Fetch and store ALL tournament games for a specific player

        This is independent of team affiliation - we want to see:
        - All Prime League games this player participated in
        - Performance across different teams/rosters
        - Full career tournament statistics

        Args:
            player: Player instance
            max_games: Maximum number of recent games to fetch (default: 100)
            force_refresh: If True, re-fetch even if already stored

        Returns:
            {
                'player_id': str,
                'player_name': str,
                'total_fetched': int,
                'new_games': int,
                'existing_games': int,
                'errors': List[str]
            }
        """
        logger.info(f"Fetching all tournament games for player {player.summoner_name}")

        stats = {
            'player_id': str(player.id),
            'player_name': player.summoner_name,
            'total_fetched': 0,
            'new_games': 0,
            'existing_games': 0,
            'errors': []
        }

        try:
            # Get match history from Riot API
            # type=tourney filters for tournament games
            match_ids = self.riot_api.get_match_history(
                puuid=player.puuid,
                match_type='tourney',  # Tournament games only
                count=max_games
            )

            stats['total_fetched'] = len(match_ids)

            for match_id in match_ids:
                try:
                    # Check if match already exists
                    existing_match = Match.query.filter_by(match_id=match_id).first()

                    if existing_match and not force_refresh:
                        stats['existing_games'] += 1
                        logger.debug(f"Match {match_id} already exists, skipping")
                        continue

                    # Fetch full match data
                    match_data = self.riot_api.get_match(match_id)

                    if not match_data:
                        stats['errors'].append(f"Failed to fetch match {match_id}")
                        continue

                    # Store complete match data
                    # Note: We don't pass tracked_team_puuids here because this is
                    # player-specific, not team-specific
                    match = store_complete_match_data(
                        match_data=match_data,
                        tracked_team_puuids=None  # Player-focused, not team-focused
                    )

                    stats['new_games'] += 1
                    logger.info(f"Stored new tournament game {match_id} for {player.summoner_name}")

                except Exception as e:
                    error_msg = f"Error processing match {match_id}: {str(e)}"
                    logger.error(error_msg)
                    stats['errors'].append(error_msg)

            return stats

        except Exception as e:
            error_msg = f"Failed to fetch match history for {player.summoner_name}: {str(e)}"
            logger.error(error_msg)
            stats['errors'].append(error_msg)
            return stats

    def get_player_tournament_statistics(self, player: Player, days: int = 365) -> Dict:
        """
        Get comprehensive tournament statistics for a player
        Includes ALL tournament games, not just team games

        Args:
            player: Player instance
            days: Days to analyze (default: 365 = full year)

        Returns:
            {
                'total_games': int,
                'wins': int,
                'losses': int,
                'winrate': float,
                'kda': float,
                'avg_kills': float,
                'avg_deaths': float,
                'avg_assists': float,
                'champion_pool': List[Dict],  # All champions played
                'most_played': str,
                'best_winrate_champion': str
            }
        """
        from app.models.match import MatchParticipant
        from datetime import timedelta

        cutoff = datetime.utcnow() - timedelta(days=days)

        # Get all tournament game participations for this player
        participations = MatchParticipant.query.join(Match).filter(
            MatchParticipant.puuid == player.puuid,
            Match.is_tournament_game == True,
            Match.created_at >= cutoff
        ).all()

        if not participations:
            return {
                'total_games': 0,
                'wins': 0,
                'losses': 0,
                'winrate': 0,
                'error': 'No tournament games found'
            }

        # Calculate stats
        total_games = len(participations)
        wins = sum(1 for p in participations if p.win)
        losses = total_games - wins

        total_kills = sum(p.kills for p in participations)
        total_deaths = sum(p.deaths for p in participations)
        total_assists = sum(p.assists for p in participations)

        kda = ((total_kills + total_assists) / total_deaths) if total_deaths > 0 else total_kills + total_assists

        # Champion pool analysis
        from collections import defaultdict
        champion_stats = defaultdict(lambda: {'games': 0, 'wins': 0})

        for p in participations:
            champion_stats[p.champion_name]['games'] += 1
            if p.win:
                champion_stats[p.champion_name]['wins'] += 1

        champion_pool = [
            {
                'champion': champ,
                'games': data['games'],
                'wins': data['wins'],
                'winrate': round((data['wins'] / data['games'] * 100), 1) if data['games'] > 0 else 0
            }
            for champ, data in champion_stats.items()
        ]

        champion_pool.sort(key=lambda x: x['games'], reverse=True)

        return {
            'total_games': total_games,
            'wins': wins,
            'losses': losses,
            'winrate': round((wins / total_games * 100), 1) if total_games > 0 else 0,
            'kda': round(kda, 2),
            'avg_kills': round(total_kills / total_games, 1) if total_games > 0 else 0,
            'avg_deaths': round(total_deaths / total_games, 1) if total_games > 0 else 0,
            'avg_assists': round(total_assists / total_games, 1) if total_games > 0 else 0,
            'champion_pool': champion_pool,
            'most_played': champion_pool[0]['champion'] if champion_pool else None,
            'best_winrate_champion': max(
                [c for c in champion_pool if c['games'] >= 3],
                key=lambda x: x['winrate'],
                default={'champion': None}
            )['champion'] if len([c for c in champion_pool if c['games'] >= 3]) > 0 else None
        }
