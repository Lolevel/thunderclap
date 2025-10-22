"""
Match Data Fetching Service
Fetches and stores match data for players and teams
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from flask import current_app
from app import db
from app.models import Player, Match, MatchParticipant, MatchTimelineData, MatchTeamStats, Team
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
                            match_type: Optional[str] = None) -> int:
        """
        Fetch match history for a player and store in database

        Args:
            player: Player model instance
            count: Number of matches to fetch (max 100)
            match_type: Match type filter ('tourney' for tournament games, None for all)

        Returns:
            Number of new matches stored
        """
        current_app.logger.info(f'Fetching {count} matches for {player.summoner_name}')

        # Get match IDs from Riot API
        match_ids = self.riot_client.get_match_history(
            player.puuid,
            count=count,
            match_type=match_type
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

    def fetch_tournament_games_only(self, team: Team, count_per_player: int = 100,
                                   min_players_together: int = 3) -> int:
        """
        Fetch only tournament games (custom games) for a team
        Stores games where at least 3 players from THIS TEAM participated

        Args:
            team: Team model instance
            count_per_player: Matches to check per player (default: 100)
            min_players_together: Minimum number of team players required (default: 3)

        Returns:
            Number of tournament games stored
        """
        current_app.logger.info(
            f'Fetching tournament games for team {team.name} '
            f'(min {min_players_together} players together)'
        )

        total_tournament_games = 0
        active_roster = [r for r in team.rosters if r.leave_date is None]
        team_player_puuids = {r.player.puuid for r in active_roster}
        team_player_ids = {r.player_id for r in active_roster}

        # Track matches we've already processed to avoid duplicates
        processed_match_ids = set()

        for roster_entry in active_roster:
            player = roster_entry.player

            # Get tournament match IDs for this player (last 100)
            # Using type=tourney to get only Prime League games
            match_ids = self.riot_client.get_match_history(
                player.puuid,
                count=count_per_player,
                match_type='tourney'
            )

            if not match_ids:
                continue

            for match_id in match_ids:
                # Skip if already processed in this run
                if match_id in processed_match_ids:
                    continue

                processed_match_ids.add(match_id)

                # Check if match already exists in database
                existing_match = Match.query.filter_by(match_id=match_id).first()
                if existing_match:
                    # Match exists - check if already linked to this team
                    if existing_match.winning_team_id == team.id or existing_match.losing_team_id == team.id:
                        current_app.logger.debug(f'Match {match_id} already linked to team {team.name}')
                        continue

                    # Match exists but not linked to this team - check if we should link it
                    team_participants = [p for p in existing_match.participants if p.player_id in team_player_ids]

                    if len(team_participants) >= min_players_together:
                        # Link existing match to this team
                        team_won = team_participants[0].win if team_participants else False
                        if team_won:
                            existing_match.winning_team_id = team.id
                        else:
                            existing_match.losing_team_id = team.id

                        # Update participant team_id
                        for participant in team_participants:
                            participant.team_id = team.id

                        # Update MatchTeamStats team_id for this team's side
                        team_riot_team_id = team_participants[0].riot_team_id if team_participants and team_participants[0].riot_team_id else None
                        if team_riot_team_id:
                            team_stats = MatchTeamStats.query.filter_by(
                                match_id=existing_match.id,
                                riot_team_id=team_riot_team_id
                            ).first()
                            if team_stats:
                                team_stats.team_id = team.id

                        total_tournament_games += 1
                        current_app.logger.info(
                            f'Linked existing match {match_id} to team {team.name} '
                            f'({len(team_participants)} team players)'
                        )

                    continue

                # Fetch match details from Riot API
                match_data = self.riot_client.get_match(match_id)
                if not match_data:
                    continue

                # Count how many team players participated (via PUUID)
                participants = match_data.get('info', {}).get('participants', [])
                team_players_in_match = sum(
                    1 for p in participants
                    if p.get('puuid') in team_player_puuids
                )

                # Only store if 3+ team players participated
                if team_players_in_match >= min_players_together:
                    try:
                        # Store match with team assignment
                        match = self._store_match(match_data)

                        # Determine if team won
                        team_won = None
                        for participant_data in participants:
                            if participant_data.get('puuid') in team_player_puuids:
                                team_won = participant_data.get('win', False)
                                break

                        # Assign team to match
                        if team_won:
                            match.winning_team_id = team.id
                        else:
                            match.losing_team_id = team.id

                        # Update participant team_id for team players
                        for participant in match.participants:
                            player_obj = Player.query.filter_by(puuid=participant_data.get('puuid')).first() if participant_data.get('puuid') else None
                            if player_obj and player_obj.id in team_player_ids:
                                participant.team_id = team.id

                        # Update MatchTeamStats team_id for this team's side
                        # Find which riot_team_id our team played on
                        team_riot_team_id = None
                        for participant in match.participants:
                            if participant.team_id == team.id and participant.riot_team_id:
                                team_riot_team_id = participant.riot_team_id
                                break

                        if team_riot_team_id:
                            team_stats = MatchTeamStats.query.filter_by(
                                match_id=match.id,
                                riot_team_id=team_riot_team_id
                            ).first()
                            if team_stats:
                                team_stats.team_id = team.id

                        total_tournament_games += 1
                        current_app.logger.info(
                            f'Stored match {match_id} with {team_players_in_match} team players from {team.name}'
                        )
                    except Exception as e:
                        current_app.logger.error(f'Error storing match {match_id}: {e}')
                        db.session.rollback()
                else:
                    current_app.logger.debug(
                        f'Skipped match {match_id}: only {team_players_in_match} team players '
                        f'(need {min_players_together})'
                    )

        db.session.commit()
        current_app.logger.info(
            f'Fetched {total_tournament_games} tournament games for team {team.name} '
            f'({min_players_together}+ players together)'
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

        # Store team stats (objectives and bans)
        teams = info.get('teams', [])
        for team_data in teams:
            self._store_team_stats(match, team_data)

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

        # Extract pink wards (control wards)
        # Try multiple field names as Riot API can be inconsistent
        control_wards = (
            participant_data.get('detectedControlWardsPlaced') or
            participant_data.get('visionWardsBoughtInGame') or
            participant_data.get('controlWardsPlaced') or
            0
        )

        participant = MatchParticipant(
            match_id=match.id,
            player_id=player.id if player else None,

            # CRITICAL: Store PUUID for player linking
            puuid=puuid,
            summoner_name=participant_data.get('summonerName'),
            riot_game_name=participant_data.get('riotIdGameName'),
            riot_tagline=participant_data.get('riotIdTagline'),

            # Champion & Position
            champion_id=participant_data.get('championId'),
            champion_name=participant_data.get('championName'),
            role=participant_data.get('role'),
            lane=participant_data.get('lane'),
            team_position=participant_data.get('teamPosition'),
            individual_position=participant_data.get('individualPosition'),
            participant_id=participant_data.get('participantId'),

            # Team assignment
            riot_team_id=participant_data.get('teamId'),  # 100=Blue, 200=Red

            # Core stats
            kills=participant_data.get('kills'),
            deaths=participant_data.get('deaths'),
            assists=participant_data.get('assists'),

            # CS & Gold
            total_minions_killed=participant_data.get('totalMinionsKilled'),
            neutral_minions_killed=participant_data.get('neutralMinionsKilled'),
            cs_total=cs_total,
            cs_per_min=round(cs_per_min, 2),
            gold_earned=participant_data.get('goldEarned'),
            gold_spent=participant_data.get('goldSpent'),

            # Damage
            total_damage_dealt_to_champions=participant_data.get('totalDamageDealtToChampions'),
            physical_damage_dealt_to_champions=participant_data.get('physicalDamageDealtToChampions'),
            magic_damage_dealt_to_champions=participant_data.get('magicDamageDealtToChampions'),
            true_damage_dealt_to_champions=participant_data.get('trueDamageDealtToChampions'),
            total_damage_taken=participant_data.get('totalDamageTaken'),
            damage_self_mitigated=participant_data.get('damageSelfMitigated'),

            # Vision
            vision_score=participant_data.get('visionScore'),
            wards_placed=participant_data.get('wardsPlaced'),
            control_wards_placed=control_wards,  # Pink wards
            wards_killed=participant_data.get('wardsKilled'),

            # Combat achievements
            first_blood=participant_data.get('firstBloodKill', False),
            first_blood_assist=participant_data.get('firstBloodAssist', False),
            first_tower=participant_data.get('firstTowerKill', False),
            first_tower_assist=participant_data.get('firstTowerAssist', False),
            double_kills=participant_data.get('doubleKills', 0),
            triple_kills=participant_data.get('tripleKills', 0),
            quadra_kills=participant_data.get('quadraKills', 0),
            penta_kills=participant_data.get('pentaKills', 0),

            # Objectives
            baron_kills=participant_data.get('baronKills', 0),
            dragon_kills=participant_data.get('dragonKills', 0),
            turret_kills=participant_data.get('turretKills', 0),
            inhibitor_kills=participant_data.get('inhibitorKills', 0),

            # Result
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

    def _store_team_stats(self, match: Match, team_data: Dict[str, Any]) -> MatchTeamStats:
        """
        Store team statistics for a match (objectives, bans)

        Args:
            match: Match model instance
            team_data: Team data from Riot API

        Returns:
            Created MatchTeamStats instance
        """
        riot_team_id = team_data.get('teamId')
        objectives = team_data.get('objectives', {})
        bans = team_data.get('bans', [])

        # Extract objective counts
        baron = objectives.get('baron', {})
        dragon = objectives.get('dragon', {})
        herald = objectives.get('riftHerald', {})
        tower = objectives.get('tower', {})
        inhibitor = objectives.get('inhibitor', {})

        team_stats = MatchTeamStats(
            match_id=match.id,
            riot_team_id=riot_team_id,
            win=team_data.get('win', False),
            baron_kills=baron.get('kills', 0),
            dragon_kills=dragon.get('kills', 0),
            herald_kills=herald.get('kills', 0),
            tower_kills=tower.get('kills', 0),
            inhibitor_kills=inhibitor.get('kills', 0),
            first_baron=baron.get('first', False),
            first_dragon=dragon.get('first', False),
            first_herald=herald.get('first', False),
            first_tower=tower.get('first', False),
            bans=bans  # Store full ban list with pickTurn
        )

        db.session.add(team_stats)
        return team_stats
