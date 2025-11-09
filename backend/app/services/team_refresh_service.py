"""
Team Refresh Service
Core logic for refreshing team data with status tracking
"""
import logging
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from app import db
from app.models import (
    Team, TeamRoster, Player, Match, MatchParticipant,
    TeamRefreshStatus
)
from app.services.riot_client import RiotAPIClient
from app.services.match_fetcher import MatchFetcher
from app.services.stats_calculator import StatsCalculator
from app.services.player_match_service import PlayerMatchService

logger = logging.getLogger(__name__)


class TeamRefreshService:
    """Service for refreshing team data with real-time status updates"""

    PHASE_PROGRESS_MAP = {
        'collecting_matches': (0, 20),
        'filtering_matches': (20, 30),
        'fetching_matches': (30, 60),
        'linking_data': (60, 75),
        'calculating_stats': (75, 85),
        'updating_ranks': (85, 90),
        'player_details': (90, 100),
    }

    @staticmethod
    def refresh_team_data(team_id):
        """
        Refresh all data for a team. Updates status in database.
        This is the main entry point for team data refreshing.
        """
        try:
            # Mark as running
            TeamRefreshStatus.update_status(
                team_id=team_id,
                status='running',
                phase='collecting_matches',
                progress_percent=0
            )

            # Phase 1: Collect tournament match IDs
            logger.info(f"[Phase 1] Collecting tournament match IDs for team {team_id}")
            match_ids = TeamRefreshService._collect_tournament_match_ids(team_id)
            TeamRefreshService._update_progress(team_id, 'filtering_matches', 20)

            # Phase 2: Filter matches (already exists in DB?)
            logger.info(f"[Phase 2] Checking existing matches in database")
            existing_match_ids = TeamRefreshService._get_existing_match_ids(match_ids)
            missing_match_ids = match_ids - existing_match_ids
            logger.info(f"Found {len(existing_match_ids)} existing, {len(missing_match_ids)} new matches")
            TeamRefreshService._update_progress(team_id, 'fetching_matches', 30)

            # Phase 3: Fetch missing matches from Riot API
            if missing_match_ids:
                logger.info(f"[Phase 3] Fetching {len(missing_match_ids)} new matches from Riot API")
                TeamRefreshService._fetch_missing_matches(team_id, list(missing_match_ids))
            TeamRefreshService._update_progress(team_id, 'linking_data', 60)

            # Phase 4: Link participants to players and matches to team
            logger.info(f"[Phase 4] Linking match participants to players")
            TeamRefreshService._link_participants_to_players(team_id)
            TeamRefreshService._link_matches_to_team(team_id)
            TeamRefreshService._update_progress(team_id, 'calculating_stats', 75)

            # Phase 5: Calculate team statistics
            logger.info(f"[Phase 5] Calculating team statistics")
            TeamRefreshService._calculate_team_stats(team_id)
            TeamRefreshService._update_progress(team_id, 'updating_ranks', 85)

            # ⬆️ THIS IS WHERE FRONTEND SHOULD AUTO-RELOAD ⬆️

            # Phase 6: Update player ranks
            logger.info(f"[Phase 6] Updating player ranks")
            TeamRefreshService._update_player_ranks(team_id)
            TeamRefreshService._update_progress(team_id, 'player_details', 90)

            # Phase 7: Fetch individual player tournament games (background)
            logger.info(f"[Phase 7] Fetching individual player tournament games")
            TeamRefreshService._fetch_player_tournament_games(team_id)
            TeamRefreshStatus.update_status(
                team_id=team_id,
                status='completed',
                progress_percent=100
            )

            logger.info(f"✅ Team refresh completed successfully for team {team_id}")

        except Exception as e:
            logger.error(f"❌ Team refresh failed for team {team_id}: {str(e)}")
            TeamRefreshStatus.update_status(
                team_id=team_id,
                status='failed',
                error_message=str(e)
            )
            raise

    @staticmethod
    def _update_progress(team_id, phase, progress_percent):
        """Helper to update progress"""
        TeamRefreshStatus.update_status(
            team_id=team_id,
            phase=phase,
            progress_percent=progress_percent
        )

    @staticmethod
    def _collect_tournament_match_ids(team_id):
        """Collect all tournament match IDs from team roster"""
        roster = TeamRoster.query.filter_by(team_id=team_id).all()
        player_puuids = [r.player.puuid for r in roster if r.player]

        riot_client = RiotAPIClient()
        all_match_ids = set()

        for idx, puuid in enumerate(player_puuids, 1):
            try:
                match_history = riot_client.get_match_history(
                    puuid=puuid,
                    match_type='tourney',  # Tournament games only
                    count=100
                )
                all_match_ids.update(match_history)
                logger.info(f"  Player {idx}/{len(player_puuids)}: Found {len(match_history)} tournament games")
            except Exception as e:
                logger.warning(f"  Failed to get match history for PUUID {puuid}: {str(e)}")

        return all_match_ids

    @staticmethod
    def _get_existing_match_ids(match_ids):
        """Check which match IDs already exist in database"""
        if not match_ids:
            return set()

        existing_matches = Match.query.filter(Match.match_id.in_(match_ids)).all()
        return {match.match_id for match in existing_matches}

    @staticmethod
    def _fetch_missing_matches(team_id, missing_match_ids):
        """Fetch missing matches from Riot API with proper rate limiting"""
        match_fetcher = MatchFetcher()
        riot_client = RiotAPIClient()

        for idx, match_id in enumerate(missing_match_ids, 1):
            max_retries = 3
            retry_count = 0

            while retry_count < max_retries:
                try:
                    match_data = riot_client.get_match(match_id)
                    if match_data:
                        match_fetcher._store_match(match_data)
                        db.session.commit()  # Commit immediately to avoid rollback issues
                        logger.info(f"  Fetched match {idx}/{len(missing_match_ids)}: {match_id}")

                        # Update progress incrementally
                        progress = 30 + int((idx / len(missing_match_ids)) * 30)  # 30-60%
                        TeamRefreshService._update_progress(team_id, 'fetching_matches', progress)

                    # Rate limiting: 1 request per second to stay well under 20/sec limit
                    time.sleep(1.0)
                    break  # Success, exit retry loop

                except Exception as e:
                    # Rollback session on ANY error to prevent cascading failures
                    db.session.rollback()
                    error_msg = str(e)

                    # Check if it's a 429 (rate limit) error
                    if '429' in error_msg or 'rate limit' in error_msg.lower():
                        retry_count += 1
                        wait_time = 60 * retry_count  # 60s, 120s, 180s
                        logger.warning(f"  Rate limited on match {match_id}. Waiting {wait_time}s (attempt {retry_count}/{max_retries})")

                        # Update status to show we're waiting for rate limit
                        current_progress = 30 + int((idx / len(missing_match_ids)) * 30)
                        TeamRefreshService._update_progress(
                            team_id,
                            f'rate_limited_waiting_{wait_time}s',  # Phase shows wait time
                            current_progress
                        )

                        time.sleep(wait_time)
                    else:
                        # Other error, log and skip
                        logger.warning(f"  Failed to fetch match {match_id}: {error_msg}")
                        break

    @staticmethod
    def _link_participants_to_players(team_id):
        """Link match participants to players via PUUID"""
        roster = TeamRoster.query.filter_by(team_id=team_id).all()
        player_puuids = {r.player.puuid: r.player_id for r in roster if r.player}

        # Get all participants without player_id that match our roster PUUIDs
        unlinked_participants = MatchParticipant.query.filter(
            MatchParticipant.player_id.is_(None),
            MatchParticipant.puuid.in_(player_puuids.keys())
        ).all()

        for participant in unlinked_participants:
            participant.player_id = player_puuids[participant.puuid]

        db.session.commit()
        logger.info(f"  Linked {len(unlinked_participants)} participants to players")

    @staticmethod
    def _link_matches_to_team(team_id):
        """Link matches to team (winning_team_id or losing_team_id)"""
        roster = TeamRoster.query.filter_by(team_id=team_id).all()
        player_ids = [r.player_id for r in roster if r.player_id]

        # Find matches where 3+ team players participated
        matches_with_team = db.session.query(
            MatchParticipant.match_id,
            db.func.count(MatchParticipant.id).label('team_player_count')
        ).filter(
            MatchParticipant.player_id.in_(player_ids)
        ).group_by(
            MatchParticipant.match_id
        ).having(
            db.func.count(MatchParticipant.id) >= 3
        ).all()

        linked_count = 0
        for match_id, player_count in matches_with_team:
            match = Match.query.get(match_id)
            if not match:
                continue

            # Determine if team won or lost
            team_participants = MatchParticipant.query.filter(
                MatchParticipant.match_id == match_id,
                MatchParticipant.player_id.in_(player_ids)
            ).all()

            if not team_participants:
                continue

            team_won = team_participants[0].win

            # Update match
            if team_won:
                match.winning_team_id = team_id
            else:
                match.losing_team_id = team_id

            # Update participants with team_id
            for participant in team_participants:
                participant.team_id = team_id

            linked_count += 1

        db.session.commit()
        logger.info(f"  Linked {linked_count} matches to team")

    @staticmethod
    def _calculate_team_stats(team_id):
        """Calculate team statistics"""
        team = Team.query.get(team_id)
        if not team:
            logger.error(f"Team {team_id} not found for stats calculation")
            return

        stats_calculator = StatsCalculator()
        stats_calculator.calculate_all_stats_for_team(team)
        logger.info(f"  Team stats calculated")

    @staticmethod
    def _update_player_ranks(team_id):
        """Update solo queue ranks for all players with rate limiting"""
        roster = TeamRoster.query.filter_by(team_id=team_id).all()
        riot_client = RiotAPIClient()
        updated_count = 0

        for idx, roster_entry in enumerate(roster, 1):
            max_retries = 2
            retry_count = 0

            while retry_count < max_retries:
                try:
                    player = roster_entry.player
                    if not player or not player.puuid:
                        logger.warning(f"  Skipping player {roster_entry.player_id}: no PUUID")
                        break

                    # Use PUUID-based endpoint (works without summoner_id)
                    ranked_data = riot_client.get_league_entries_by_puuid(player.puuid)

                    if not ranked_data:
                        logger.info(f"  No ranked data for {player.summoner_name} (unranked)")
                        break

                    # Process all queue types
                    for entry in ranked_data:
                        queue_type = entry.get('queueType')
                        tier = entry.get('tier')
                        division = entry.get('rank')
                        lp = entry.get('leaguePoints', 0)
                        wins = entry.get('wins', 0)
                        losses = entry.get('losses', 0)

                        if queue_type == 'RANKED_SOLO_5x5':
                            player.soloq_tier = tier
                            player.soloq_division = division
                            player.soloq_lp = lp
                            player.soloq_wins = wins
                            player.soloq_losses = losses
                            player.rank_last_updated = datetime.utcnow()
                        elif queue_type == 'RANKED_FLEX_SR':
                            player.flexq_tier = tier
                            player.flexq_division = division
                            player.flexq_lp = lp
                            player.flexq_wins = wins
                            player.flexq_losses = losses

                    updated_count += 1
                    logger.info(f"  Updated ranks for {player.summoner_name}")

                    # Update progress
                    progress = 85 + int((idx / len(roster)) * 5)  # 85-90%
                    TeamRefreshService._update_progress(team_id, 'updating_ranks', progress)

                    # Rate limiting: 1 request per second
                    time.sleep(1.0)
                    break  # Success

                except Exception as e:
                    error_msg = str(e)

                    # Check for rate limit error
                    if '429' in error_msg or 'rate limit' in error_msg.lower():
                        retry_count += 1
                        wait_time = 30 * retry_count
                        logger.warning(f"  Rate limited on player rank. Waiting {wait_time}s (attempt {retry_count}/{max_retries})")
                        time.sleep(wait_time)
                    else:
                        logger.warning(f"  Failed to update rank for player {roster_entry.player_id}: {error_msg}")
                        break

        db.session.commit()
        logger.info(f"  Updated ranks for {updated_count}/{len(roster)} players")

    @staticmethod
    def _fetch_player_tournament_games(team_id):
        """Fetch all tournament games for individual players (background, concurrent)"""
        roster = TeamRoster.query.filter_by(team_id=team_id).all()
        riot_client = RiotAPIClient()
        player_match_service = PlayerMatchService(riot_client)

        # Use ThreadPoolExecutor for concurrent processing (max 3 workers)
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {}
            for roster_entry in roster:
                if roster_entry.player:
                    future = executor.submit(
                        player_match_service.fetch_all_player_tournament_games,
                        roster_entry.player  # Pass Player object, not player_id
                    )
                    futures[future] = roster_entry.player.summoner_name

            # Track progress as futures complete
            completed = 0
            for future in as_completed(futures):
                player_name = futures[future]
                try:
                    result = future.result()
                    logger.info(f"  Completed player details for: {player_name} - New: {result.get('new_games', 0)}, Existing: {result.get('existing_games', 0)}")
                except Exception as e:
                    logger.warning(f"  Failed to fetch player details for {player_name}: {str(e)}")

                completed += 1
                progress = 90 + int((completed / len(futures)) * 10)  # 90-100%
                TeamRefreshService._update_progress(team_id, 'player_details', progress)

        logger.info(f"  Fetched individual tournament games for {len(roster)} players")
