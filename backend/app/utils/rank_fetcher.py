"""
Rank Fetcher Utility
Fetches and updates player ranks from Riot API
"""
from datetime import datetime
from typing import Optional, Dict
from flask import current_app
from app import db
from app.models.player import Player
from app.services.riot_client import RiotAPIClient


def fetch_player_rank(player: Player, riot_client: Optional[RiotAPIClient] = None) -> bool:
    """
    Fetch and update player rank from Riot API

    Args:
        player: Player model instance
        riot_client: Optional RiotAPIClient (will create one if not provided)

    Returns:
        True if successful, False otherwise
    """
    try:
        # Create Riot client if not provided
        if riot_client is None:
            riot_client = RiotAPIClient()

        # Fetch league entries directly by PUUID (new Riot API v4)
        # The old summoner_id field is no longer returned by Riot API
        import requests
        url = f'{riot_client.platform_url}/lol/league/v4/entries/by-puuid/{player.puuid}'

        riot_client.rate_limiter.wait_if_needed()
        response = requests.get(url, headers={'X-Riot-Token': riot_client.api_key})

        if response.status_code != 200:
            current_app.logger.error(f"Failed to fetch league entries for {player.summoner_name}: {response.status_code}")
            return False

        league_entries = response.json()

        if not league_entries:
            current_app.logger.warning(f"No ranked data for {player.summoner_name}")
            return False

        # Process league entries
        soloq_data = None
        flexq_data = None

        for entry in league_entries:
            queue_type = entry.get('queueType')

            if queue_type == 'RANKED_SOLO_5x5':
                soloq_data = entry
            elif queue_type == 'RANKED_FLEX_SR':
                flexq_data = entry

        # Update Solo/Duo Queue rank
        if soloq_data:
            player.soloq_tier = soloq_data.get('tier')
            player.soloq_division = soloq_data.get('rank')
            player.soloq_lp = soloq_data.get('leaguePoints', 0)
            player.soloq_wins = soloq_data.get('wins', 0)
            player.soloq_losses = soloq_data.get('losses', 0)
        else:
            # Player is unranked in Solo/Duo
            player.soloq_tier = None
            player.soloq_division = None
            player.soloq_lp = 0
            player.soloq_wins = 0
            player.soloq_losses = 0

        # Update Flex Queue rank
        if flexq_data:
            player.flexq_tier = flexq_data.get('tier')
            player.flexq_division = flexq_data.get('rank')
            player.flexq_lp = flexq_data.get('leaguePoints', 0)
            player.flexq_wins = flexq_data.get('wins', 0)
            player.flexq_losses = flexq_data.get('losses', 0)
        else:
            # Player is unranked in Flex
            player.flexq_tier = None
            player.flexq_division = None
            player.flexq_lp = 0
            player.flexq_wins = 0
            player.flexq_losses = 0

        # Update timestamp
        player.rank_last_updated = datetime.utcnow()

        db.session.commit()

        current_app.logger.info(
            f"Updated rank for {player.summoner_name}: "
            f"Solo/Duo={player.soloq_tier} {player.soloq_division}, "
            f"Flex={player.flexq_tier} {player.flexq_division}"
        )

        return True

    except Exception as e:
        current_app.logger.error(f"Error fetching rank for {player.summoner_name}: {str(e)}")
        db.session.rollback()
        return False


def fetch_team_ranks(team_id: str) -> Dict[str, int]:
    """
    Fetch ranks for all players on a team

    Args:
        team_id: Team UUID

    Returns:
        Dictionary with 'success' and 'failed' counts
    """
    from app.models.team import Team

    try:
        team = Team.query.get(team_id)
        if not team:
            return {'success': 0, 'failed': 0, 'error': 'Team not found'}

        # Get active roster
        active_roster = [r for r in team.rosters if r.leave_date is None]

        # Create Riot client (reuse for all requests)
        riot_client = RiotAPIClient()

        success_count = 0
        failed_count = 0

        for roster_entry in active_roster:
            if roster_entry.player:
                if fetch_player_rank(roster_entry.player, riot_client):
                    success_count += 1
                else:
                    failed_count += 1

        current_app.logger.info(
            f"Updated ranks for team {team.name}: "
            f"{success_count} success, {failed_count} failed"
        )

        return {
            'success': success_count,
            'failed': failed_count
        }

    except Exception as e:
        current_app.logger.error(f"Error fetching team ranks: {str(e)}")
        return {'success': 0, 'failed': 0, 'error': str(e)}
