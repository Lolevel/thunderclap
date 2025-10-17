"""
Match Data Fetching Service
Fetches and stores match data for players and teams
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from flask import current_app
from app import db
from app.models import Player, Match, MatchParticipant, MatchTimelineData, Team
from app.services.riot_client import RiotAPIClient


class MatchFetcher:
    """
    Service for fetching and storing match data
    Best Practice: Separation of concerns - handles only match fetching logic
    """

    def __init__(self, riot_client: Optional[RiotAPIClient] = None):
        """
        Initialize Match Fetcher

        Args:
            riot_client: RiotAPIClient instance (creates new if None)
        """
        self.riot_client = riot_client or RiotAPIClient()

    def fetch_player_matches(self, player: Player, count: int = 100,
                            queue: Optional[int] = None) -> int:
        """
        Fetch match history for a player and store in database

        Args:
            player: Player model instance
            count: Number of matches to fetch (max 100)
            queue: Queue ID filter (None for all, 0 for custom, 420 for ranked)

        Returns:
            Number of new matches stored
        """
        current_app.logger.info(f'Fetching {count} matches for {player.summoner_name}')

        # Get match IDs from Riot API
        match_ids = self.riot_client.get_match_history(
            player.puuid,
            count=count,
            queue=queue
        )

        if not match_ids:
            current_app.logger.warning(f'No matches found for {player.summoner_name}')
            return 0

        new_matches = 0

        for match_id in match_ids:
            # Skip if match already exists
            existing_match = Match.query.filter_by(match_id=match_id).first()
            if existing_match:
                current_app.logger.debug(f'Match {match_id} already exists, skipping')
                continue

            # Fetch match details
            match_data = self.riot_client.get_match(match_id)
            if not match_data:
                current_app.logger.warning(f'Could not fetch match {match_id}')
                continue

            # Store match and participants
            try:
                self._store_match(match_data)
                new_matches += 1
                current_app.logger.debug(f'Stored match {match_id}')
            except Exception as e:
                current_app.logger.error(f'Error storing match {match_id}: {e}')
                db.session.rollback()
                continue

        db.session.commit()
        current_app.logger.info(f'Fetched {new_matches} new matches for {player.summoner_name}')
        return new_matches

    def fetch_team_matches(self, team: Team, count_per_player: int = 50) -> int:
        """
        Fetch matches for all players in a team

        Args:
            team: Team model instance
            count_per_player: Matches to fetch per player

        Returns:
            Total number of new matches stored
        """
        current_app.logger.info(f'Fetching matches for team {team.name}')

        total_new_matches = 0

        # Get active roster
        active_roster = [r for r in team.rosters if r.leave_date is None]

        for roster_entry in active_roster:
            player = roster_entry.player
            new_matches = self.fetch_player_matches(player, count=count_per_player)
            total_new_matches += new_matches

        current_app.logger.info(f'Fetched {total_new_matches} total matches for team {team.name}')
        return total_new_matches

    def fetch_tournament_games_only(self, team: Team, count_per_player: int = 100) -> int:
        """
        Fetch only tournament games (custom games) for a team

        Args:
            team: Team model instance
            count_per_player: Matches to check per player

        Returns:
            Number of tournament games stored
        """
        current_app.logger.info(f'Fetching tournament games for team {team.name}')

        total_tournament_games = 0

        active_roster = [r for r in team.rosters if r.leave_date is None]

        for roster_entry in active_roster:
            player = roster_entry.player

            # Fetch custom games only (queue_id = 0)
            tournament_games = self.fetch_player_matches(
                player,
                count=count_per_player,
                queue=0  # Custom games only
            )
            total_tournament_games += tournament_games

        current_app.logger.info(
            f'Fetched {total_tournament_games} tournament games for team {team.name}'
        )
        return total_tournament_games

    def fetch_timeline_for_recent_tournament_games(self, team: Team, limit: int = 10) -> int:
        """
        Fetch timeline data for last N tournament games of a team
        Only fetches if timeline doesn't exist yet (expensive API call)

        Args:
            team: Team model instance
            limit: Number of recent tournament games to fetch timeline for

        Returns:
            Number of timelines fetched
        """
        current_app.logger.info(
            f'Fetching timeline data for last {limit} tournament games of {team.name}'
        )

        # Get recent tournament games for this team (ordered by date desc)
        recent_tournament_games = Match.query.filter(
            Match.is_tournament_game == True,
            db.or_(
                Match.winning_team_id == team.id,
                Match.losing_team_id == team.id
            )
        ).order_by(Match.game_creation.desc()).limit(limit).all()

        timelines_fetched = 0

        for match in recent_tournament_games:
            # Skip if timeline already exists
            if match.timeline_data:
                current_app.logger.debug(f'Timeline for {match.match_id} already exists')
                continue

            # Fetch timeline (expensive!)
            timeline_data = self.riot_client.get_match_timeline(match.match_id)
            if not timeline_data:
                current_app.logger.warning(f'Could not fetch timeline for {match.match_id}')
                continue

            # Store timeline
            try:
                self._store_timeline(match, timeline_data)
                timelines_fetched += 1
                current_app.logger.info(f'Stored timeline for {match.match_id}')
            except Exception as e:
                current_app.logger.error(f'Error storing timeline for {match.match_id}: {e}')
                db.session.rollback()
                continue

        db.session.commit()
        current_app.logger.info(f'Fetched {timelines_fetched} timelines for team {team.name}')
        return timelines_fetched

    # ============================================================
    # PRIVATE HELPER METHODS
    # ============================================================

    def _store_match(self, match_data: Dict[str, Any]) -> Match:
        """
        Store match and participants in database

        Args:
            match_data: Match data from Riot API

        Returns:
            Created Match model instance
        """
        metadata = match_data.get('metadata', {})
        info = match_data.get('info', {})

        # Check if tournament game
        is_tournament = self.riot_client.is_tournament_game(match_data)

        # Create match
        match = Match(
            match_id=metadata.get('matchId'),
            game_creation=info.get('gameCreation'),
            game_duration=info.get('gameDuration'),
            game_version=info.get('gameVersion'),
            map_id=info.get('mapId'),
            queue_id=info.get('queueId'),
            is_tournament_game=is_tournament
        )

        db.session.add(match)
        db.session.flush()  # Get match ID without committing

        # Store participants
        participants = info.get('participants', [])
        for participant_data in participants:
            self._store_participant(match, participant_data)

        return match

    def _store_participant(self, match: Match, participant_data: Dict[str, Any]) -> MatchParticipant:
        """
        Store match participant

        Args:
            match: Match model instance
            participant_data: Participant data from Riot API

        Returns:
            Created MatchParticipant instance
        """
        # Try to find player by PUUID
        puuid = participant_data.get('puuid')
        player = Player.query.filter_by(puuid=puuid).first() if puuid else None

        # Calculate CS/min
        cs_total = participant_data.get('totalMinionsKilled', 0) + participant_data.get('neutralMinionsKilled', 0)
        game_duration_minutes = match.game_duration / 60 if match.game_duration else 1
        cs_per_min = cs_total / game_duration_minutes if game_duration_minutes > 0 else 0

        participant = MatchParticipant(
            match_id=match.id,
            player_id=player.id if player else None,
            champion_id=participant_data.get('championId'),
            champion_name=participant_data.get('championName'),
            role=participant_data.get('role'),
            lane=participant_data.get('lane'),
            team_position=participant_data.get('teamPosition'),
            kills=participant_data.get('kills'),
            deaths=participant_data.get('deaths'),
            assists=participant_data.get('assists'),
            cs_total=cs_total,
            cs_per_min=round(cs_per_min, 2),
            gold_earned=participant_data.get('goldEarned'),
            damage_dealt=participant_data.get('totalDamageDealtToChampions'),
            damage_taken=participant_data.get('totalDamageTaken'),
            vision_score=participant_data.get('visionScore'),
            wards_placed=participant_data.get('wardsPlaced'),
            wards_destroyed=participant_data.get('wardsKilled'),
            first_blood=participant_data.get('firstBloodKill', False),
            first_tower=participant_data.get('firstTowerKill', False),
            win=participant_data.get('win', False)
        )

        db.session.add(participant)
        return participant

    def _store_timeline(self, match: Match, timeline_data: Dict[str, Any]) -> MatchTimelineData:
        """
        Store match timeline data

        Args:
            match: Match model instance
            timeline_data: Timeline data from Riot API

        Returns:
            Created MatchTimelineData instance
        """
        # Extract key metrics from timeline
        frames = timeline_data.get('info', {}).get('frames', [])

        # Helper to get frame at specific minute
        def get_frame_at_minute(minute: int):
            if minute < len(frames):
                return frames[minute]
            return None

        # Get gold/xp diffs at 10 and 15 minutes
        frame_10 = get_frame_at_minute(10)
        frame_15 = get_frame_at_minute(15)

        def calculate_team_diff(frame, metric='totalGold'):
            if not frame or 'participantFrames' not in frame:
                return None

            team_100 = sum(p.get(metric, 0) for p in frame['participantFrames'].values()
                          if int(p.get('participantId', 0)) <= 5)
            team_200 = sum(p.get(metric, 0) for p in frame['participantFrames'].values()
                          if int(p.get('participantId', 0)) > 5)

            return team_100 - team_200

        gold_diff_10 = calculate_team_diff(frame_10, 'totalGold')
        gold_diff_15 = calculate_team_diff(frame_15, 'totalGold')
        xp_diff_10 = calculate_team_diff(frame_10, 'xp')
        xp_diff_15 = calculate_team_diff(frame_15, 'xp')

        # Extract objective times
        def find_first_objective_time(objective_type: str) -> Optional[int]:
            for frame in frames:
                events = frame.get('events', [])
                for event in events:
                    if event.get('type') == 'ELITE_MONSTER_KILL':
                        monster_type = event.get('monsterType', '')
                        if monster_type == objective_type:
                            return event.get('timestamp', 0) // 1000  # Convert to seconds
            return None

        timeline = MatchTimelineData(
            match_id=match.id,
            gold_diff_at_10=gold_diff_10,
            gold_diff_at_15=gold_diff_15,
            xp_diff_at_10=xp_diff_10,
            xp_diff_at_15=xp_diff_15,
            first_blood_time=None,  # TODO: Extract from events
            first_tower_time=None,  # TODO: Extract from events
            first_dragon_time=find_first_objective_time('DRAGON'),
            first_herald_time=find_first_objective_time('RIFTHERALD'),
            timeline_data=timeline_data  # Store full data for advanced analysis
        )

        db.session.add(timeline)
        return timeline
