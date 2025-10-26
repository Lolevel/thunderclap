"""
Team routes
"""

from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models import Team, TeamRoster, Player
from app.services import RiotAPIClient, MatchFetcher
from app.utils import parse_opgg_url
from app.middleware.auth import require_auth
from datetime import datetime

bp = Blueprint("teams", __name__, url_prefix="/api/teams")

# Apply authentication to all routes in this blueprint
@bp.before_request
@require_auth
def before_request():
    pass


@bp.route("/import", methods=["POST"])
def import_team():
    """
    Import team via OP.GG URL

    Request body:
        {
            "opgg_url": "https://www.op.gg/multisearch/euw?summoners=Name1,Name2,...",
            "team_name": "Team Name" (optional),
            "team_tag": "TAG" (optional)
        }

    Returns:
        {
            "team_id": "uuid",
            "players_imported": 5,
            "message": "Team imported successfully"
        }
    """
    data = request.get_json()

    if not data or "opgg_url" not in data:
        return jsonify({"error": "opgg_url is required"}), 400

    opgg_url = data["opgg_url"]
    team_name = data.get("team_name")
    team_tag = data.get("team_tag")

    # Parse OP.GG URL
    summoner_names = parse_opgg_url(opgg_url)
    if not summoner_names:
        return jsonify({"error": "Invalid OP.GG URL"}), 400

    current_app.logger.info(
        f"Importing team with {len(summoner_names)} players: {summoner_names}"
    )

    try:
        # Initialize Riot API client
        riot_client = RiotAPIClient()

        # Fetch player data
        players = []
        for riot_id in summoner_names:
            current_app.logger.info(f"Fetching data for {riot_id}")

            # Parse Riot ID (gameName#tagLine)
            if "#" in riot_id:
                game_name, tag_line = riot_id.split("#", 1)
            else:
                # Fallback: assume EUW tagline if not provided
                game_name = riot_id
                tag_line = "EUW"
                current_app.logger.warning(
                    f"No tagline found for {riot_id}, assuming #{tag_line}"
                )

            # Step 1: Get PUUID from Riot ID using ACCOUNT-V1
            account_data = riot_client.get_account_by_riot_id(game_name, tag_line)
            if not account_data:
                current_app.logger.warning(f"Account not found: {game_name}#{tag_line}")
                continue

            puuid = account_data.get("puuid")
            if not puuid:
                current_app.logger.error(
                    f"No PUUID in account data for {game_name}#{tag_line}"
                )
                continue

            # Step 2: Get summoner data from PUUID using SUMMONER-V4
            summoner_data = riot_client.get_summoner_by_puuid(puuid)
            current_app.logger.info(
                f"Summoner data retrieved for {game_name}#{tag_line}: {summoner_data}"
            )
            if not summoner_data:
                current_app.logger.warning(f"Summoner not found for PUUID: {puuid}")
                continue

            # Extract name from account_data (ACCOUNT-V1 has gameName, SUMMONER-V4 doesn't have name)
            display_name = (
                f"{account_data.get('gameName')}#{account_data.get('tagLine')}"
            )

            # Check if player already exists
            player = Player.query.filter_by(puuid=puuid).first()

            # Note: summoner_data.get('id') returns None due to Riot API bug (Issue #1092, Aug 2025)
            # The by-puuid endpoint doesn't return the 'id' field
            summoner_id = summoner_data.get("id")
            if not summoner_id:
                current_app.logger.warning(
                    f"Summoner ID missing for {display_name} (Riot API bug)"
                )

            if not player:
                # Create new player
                player = Player(
                    summoner_name=display_name,
                    summoner_id=summoner_id,  # Will be None due to API bug
                    puuid=puuid,
                    profile_icon_id=summoner_data.get("profileIconId"),
                    region=current_app.config["RIOT_PLATFORM"],
                    last_active=datetime.utcnow(),
                )
                db.session.add(player)
                current_app.logger.info(
                    f"Created new player: {display_name} (PUUID: {puuid})"
                )
            else:
                # Update existing player
                player.summoner_name = display_name
                if summoner_id:  # Only update if we have it
                    player.summoner_id = summoner_id
                player.profile_icon_id = summoner_data.get("profileIconId")
                player.last_active = datetime.utcnow()
                player.updated_at = datetime.utcnow()
                current_app.logger.info(
                    f"Updated existing player: {display_name} (PUUID: {puuid})"
                )

            # Get ranked stats (only if we have summoner_id, which we don't due to API bug)
            if summoner_id:
                league_entries = riot_client.get_league_entries(summoner_id)
                if league_entries:
                    for entry in league_entries:
                        if entry.get("queueType") == "RANKED_SOLO_5x5":
                            player.current_rank = (
                                f"{entry.get('tier')} {entry.get('rank')}"
                            )
                            player.current_lp = entry.get("leaguePoints", 0)
                            break
            else:
                current_app.logger.warning(
                    f"Skipping ranked stats for {display_name} - no summoner_id available"
                )

            players.append(player)

        if not players:
            return jsonify({"error": "No valid summoners found"}), 404

        # Commit players first to get their IDs
        db.session.commit()

        # Create or update team
        if not team_name:
            team_name = f"Team {summoner_names[0]}"  # Default name

        team = Team(name=team_name, tag=team_tag, opgg_url=opgg_url)
        db.session.add(team)
        db.session.commit()

        # Create roster entries
        for player in players:
            roster_entry = TeamRoster(
                team_id=team.id,
                player_id=player.id,
                is_main_roster=True,
                join_date=datetime.utcnow().date(),
            )
            db.session.add(roster_entry)

        db.session.commit()

        current_app.logger.info(
            f"Team imported successfully: {team.name} with {len(players)} players"
        )

        return (
            jsonify(
                {
                    "team_id": str(team.id),
                    "team_name": team.name,
                    "players_imported": len(players),
                    "message": "Team imported successfully",
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error importing team: {str(e)}")
        return jsonify({"error": "Failed to import team", "details": str(e)}), 500


@bp.route("/<team_id>", methods=["GET"])
def get_team(team_id):
    """
    Get team details

    Returns:
        {
            "id": "uuid",
            "name": "Team Name",
            "tag": "TAG",
            ...
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    return jsonify(team.to_dict()), 200


@bp.route("/<team_id>", methods=["DELETE"])
def delete_team(team_id):
    """
    Delete a team from the database

    Query parameters:
        - delete_players: 'true' to also delete all players from database (default: false)
                         If false, only removes team and roster entries, players remain

    Returns:
        {
            "message": "Team deleted successfully",
            "players_deleted": 0 or N
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    delete_players_flag = request.args.get("delete_players", "false").lower() == "true"

    try:
        team_name = team.name
        players_deleted = 0

        # Get roster before deletion
        active_roster = [r for r in team.rosters if r.leave_date is None]

        # Remove team_id references from match_participants to avoid foreign key constraint violation
        from app.models import MatchParticipant, MatchTeamStats, Match
        MatchParticipant.query.filter_by(team_id=team.id).update({MatchParticipant.team_id: None})
        MatchTeamStats.query.filter_by(team_id=team.id).update({MatchTeamStats.team_id: None})

        # Remove team references from matches (winning/losing team)
        Match.query.filter_by(winning_team_id=team.id).update({Match.winning_team_id: None})
        Match.query.filter_by(losing_team_id=team.id).update({Match.losing_team_id: None})

        if delete_players_flag:
            # Delete all players associated with this team
            for roster_entry in active_roster:
                player = roster_entry.player
                if player:
                    db.session.delete(player)
                    players_deleted += 1
                    current_app.logger.info(f"Deleted player: {player.summoner_name}")

        # Delete team (cascade will handle roster entries, match associations, etc.)
        db.session.delete(team)
        db.session.commit()

        current_app.logger.info(
            f"Team deleted: {team_name} (ID: {team_id}), "
            f"Players deleted: {players_deleted}"
        )

        return (
            jsonify(
                {
                    "message": "Team deleted successfully",
                    "team_name": team_name,
                    "players_deleted": players_deleted,
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to delete team: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to delete team: {str(e)}"}), 500


@bp.route("/<team_id>/roster", methods=["GET"])
def get_team_roster(team_id):
    """
    Get team roster with tournament games count for each player

    Returns:
        {
            "team_id": "uuid",
            "roster": [
                {
                    "player_id": "uuid",
                    "summoner_name": "PlayerName",
                    "role": "TOP",
                    "is_main_roster": true,
                    "tournament_games": 15,  # Number of tournament games played for this team
                    ...
                }
            ]
        }
    """
    from app.models import Match, MatchParticipant
    from sqlalchemy import func

    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    # Get active roster (no leave_date)
    roster_entries = (
        TeamRoster.query.filter_by(team_id=team_id)
        .filter(TeamRoster.leave_date.is_(None))
        .all()
    )

    # Get tournament games count for all players in one query
    player_ids = [entry.player_id for entry in roster_entries]

    # Count tournament games per player for this team
    tournament_games_count = db.session.query(
        MatchParticipant.player_id,
        func.count(func.distinct(MatchParticipant.match_id)).label('game_count')
    ).join(
        Match, Match.id == MatchParticipant.match_id
    ).filter(
        MatchParticipant.player_id.in_(player_ids),
        MatchParticipant.team_id == team_id,
        Match.is_tournament_game == True
    ).group_by(
        MatchParticipant.player_id
    ).all()

    # Create a map for quick lookup
    games_count_map = {str(player_id): count for player_id, count in tournament_games_count}

    roster = []
    for entry in roster_entries:
        player_data = entry.player.to_dict()
        roster_data = entry.to_dict()
        roster_data["player"] = player_data

        # Add tournament games count
        roster_data["tournament_games"] = games_count_map.get(str(entry.player_id), 0)

        roster.append(roster_data)

    return (
        jsonify({"team_id": str(team_id), "team_name": team.name, "roster": roster}),
        200,
    )


@bp.route("/", methods=["GET"])
def list_teams():
    """
    List all teams

    Query parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20)

    Returns:
        {
            "teams": [...],
            "total": 42,
            "page": 1,
            "per_page": 20
        }
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get(
        "per_page", current_app.config["ITEMS_PER_PAGE"], type=int
    )

    pagination = Team.query.paginate(page=page, per_page=per_page, error_out=False)

    return (
        jsonify(
            {
                "teams": [team.to_dict() for team in pagination.items],
                "total": pagination.total,
                "page": page,
                "per_page": per_page,
                "pages": pagination.pages,
            }
        ),
        200,
    )


@bp.route("/<team_id>/fetch-matches", methods=["POST"])
def fetch_team_matches(team_id):
    """
    Fetch tournament matches for a team

    Request body:
        {
            "count_per_player": 50 (optional, default: 50),
            "min_players_together": 4 (optional, default: 4),
            "fetch_all_player_games": true (optional, default: true)
        }

    Returns:
        {
            "team_id": "uuid",
            "matches_fetched": 42,
            "message": "Matches fetched successfully"
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    data = request.get_json() or {}
    count_per_player = data.get("count_per_player", 50)
    min_players_together = data.get("min_players_together", 4)
    fetch_all_player_games = data.get("fetch_all_player_games", True)

    current_app.logger.info(
        f"Fetching tournament matches for team {team.name} "
        f"(min {min_players_together} players together)"
    )

    try:
        # Initialize services
        riot_client = RiotAPIClient()
        match_fetcher = MatchFetcher(riot_client)

        # Fetch tournament games with 4+ players filter (team games)
        matches_fetched = match_fetcher.fetch_tournament_games_only(
            team, count_per_player, min_players_together
        )

        current_app.logger.info(
            f"Fetched {matches_fetched} tournament matches for {team.name}"
        )

        # Additionally fetch ALL tournament games for each player individually
        # This ensures player profiles show their complete tournament history
        if fetch_all_player_games:
            from app.services.player_match_service import PlayerMatchService
            player_service = PlayerMatchService(riot_client)

            active_roster = [r for r in team.rosters if r.leave_date is None]

            current_app.logger.info(
                f"Fetching all individual tournament games for {len(active_roster)} players..."
            )

            for roster_entry in active_roster:
                player = roster_entry.player
                try:
                    stats = player_service.fetch_all_player_tournament_games(
                        player=player,
                        max_games=100,
                        force_refresh=False
                    )
                    current_app.logger.info(
                        f"Player {player.summoner_name}: {stats['new_games']} new games, "
                        f"{stats['existing_games']} already stored"
                    )

                    # Recalculate player champion stats if new games were fetched
                    if stats['new_games'] > 0:
                        from app.services.stats_calculator import StatsCalculator
                        stats_calculator = StatsCalculator()
                        stats_calculator.calculate_player_champion_stats(player)
                        current_app.logger.info(
                            f"Recalculated champion stats for {player.summoner_name}"
                        )

                except Exception as e:
                    current_app.logger.error(
                        f"Failed to fetch individual games for {player.summoner_name}: {str(e)}"
                    )

        return (
            jsonify(
                {
                    "team_id": str(team.id),
                    "team_name": team.name,
                    "matches_fetched": matches_fetched,
                    "min_players_together": min_players_together,
                    "message": f"Fetched {matches_fetched} tournament matches",
                }
            ),
            200,
        )

    except Exception as e:
        current_app.logger.error(
            f"Error fetching matches for team {team.name}: {str(e)}"
        )
        return jsonify({"error": "Failed to fetch matches", "details": str(e)}), 500


@bp.route("/<team_id>/calculate-stats", methods=["POST"])
def calculate_team_stats(team_id):
    """
    Calculate statistics for a team

    Returns:
        {
            "team_id": "uuid",
            "stats_calculated": ["tournament_stats", "all_stats"],
            "message": "Stats calculated successfully"
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    current_app.logger.info(f"Calculating stats for team {team.name}")

    try:
        from app.services.stats_calculator import StatsCalculator

        stats_calculator = StatsCalculator()
        result = stats_calculator.calculate_all_stats_for_team(team)

        return (
            jsonify(
                {
                    "team_id": str(team.id),
                    "team_name": team.name,
                    "stats_calculated": result.get("stats_calculated", []),
                    "champions_updated": result.get("champions_updated", 0),
                    "players_processed": result.get("players_processed", 0),
                    "message": "Stats calculated successfully",
                }
            ),
            200,
        )

    except Exception as e:
        current_app.logger.error(
            f"Error calculating stats for team {team.name}: {str(e)}"
        )
        return jsonify({"error": "Failed to calculate stats", "details": str(e)}), 500


@bp.route("/<team_id>/link-matches", methods=["POST"])
def link_team_matches(team_id):
    """
    Link matches to team by detecting which games had team players

    Returns:
        {
            "team_id": "uuid",
            "matches_linked": 42,
            "message": "Matches linked successfully"
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    current_app.logger.info(f"Linking matches for team {team.name}")

    try:
        from app.models import Match, MatchParticipant

        # Get team player IDs
        active_roster = [r for r in team.rosters if r.leave_date is None]
        team_player_ids = [r.player_id for r in active_roster]

        current_app.logger.info(f"Team has {len(team_player_ids)} players")

        # Find matches where at least 3 team players participated
        matches_linked = 0

        matches = Match.query.filter_by(is_tournament_game=True).all()

        for match in matches:
            # Skip if already linked
            if match.winning_team_id == team.id or match.losing_team_id == team.id:
                continue

            # Count how many team players participated and check if they won
            team_participants = []
            team_won = None

            for participant in match.participants:
                if participant.player_id in team_player_ids:
                    team_participants.append(participant)
                    if team_won is None:
                        team_won = participant.win
                    elif team_won != participant.win:
                        # Conflicting win status - skip this match (shouldn't happen)
                        current_app.logger.warning(
                            f"Match {match.match_id}: team players have conflicting win status"
                        )
                        team_participants = []
                        break

            # If at least 2 players from our team participated, link the match
            # TODO: In production, this should be 5 (full team) or at least 3
            if len(team_participants) >= 2:
                if team_won:
                    match.winning_team_id = team.id
                    matches_linked += 1
                    current_app.logger.debug(
                        f"Match {match.match_id}: team won with {len(team_participants)} players"
                    )
                else:
                    match.losing_team_id = team.id
                    matches_linked += 1
                    current_app.logger.debug(
                        f"Match {match.match_id}: team lost with {len(team_participants)} players"
                    )

                # Also set team_id on participants for easier queries
                for participant in team_participants:
                    participant.team_id = team.id

        db.session.commit()

        current_app.logger.info(f"Linked {matches_linked} matches for team {team.name}")

        return (
            jsonify(
                {
                    "team_id": str(team.id),
                    "team_name": team.name,
                    "matches_linked": matches_linked,
                    "message": f"Linked {matches_linked} matches",
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(
            f"Error linking matches for team {team.name}: {str(e)}"
        )
        return jsonify({"error": "Failed to link matches", "details": str(e)}), 500


@bp.route("/<team_id>/stats", methods=["GET"])
def get_team_stats(team_id):
    """
    Get team statistics

    Query parameters:
        - stat_type: 'tournament' or 'all' (default: 'tournament')

    Returns:
        {
            "team_id": "uuid",
            "team_name": "Team Name",
            "stats": {
                "games_played": 42,
                "wins": 30,
                "losses": 12,
                "first_blood_rate": 65.5,
                "first_tower_rate": 72.3,
                ...
            }
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    stat_type = request.args.get("stat_type", "tournament")

    from app.models import TeamStats

    team_stats = TeamStats.query.filter_by(team_id=team.id, stat_type=stat_type).first()

    if not team_stats:
        return (
            jsonify(
                {
                    "team_id": str(team.id),
                    "team_name": team.name,
                    "stats": None,
                    "message": f"No {stat_type} stats available. Fetch matches and calculate stats first.",
                }
            ),
            200,
        )

    return (
        jsonify(
            {
                "team_id": str(team.id),
                "team_name": team.name,
                "stat_type": stat_type,
                "stats": team_stats.to_dict(),
            }
        ),
        200,
    )


@bp.route("/<team_id>/roster/<player_id>", methods=["DELETE"])
def remove_player_from_roster(team_id, player_id):
    """
    Remove a player from team roster (player stays in database)

    Query parameters:
        - delete_player: 'true' to also delete player from database (default: false)

    Returns:
        {
            "message": "Player removed from roster"
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    player = Player.query.get(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404

    delete_player_param = request.args.get("delete_player", "false").lower() == "true"

    try:
        # Find roster entry
        roster_entry = (
            TeamRoster.query.filter_by(team_id=team_id, player_id=player_id)
            .filter(TeamRoster.leave_date.is_(None))
            .first()
        )

        if not roster_entry:
            return jsonify({"error": "Player not in team roster"}), 404

        if delete_player_param:
            # Delete player completely from database
            db.session.delete(player)
            message = f"Player {player.summoner_name} deleted from database"
            current_app.logger.info(
                f"Player {player.summoner_name} deleted from database"
            )
        else:
            # Just set leave_date to mark as inactive
            roster_entry.leave_date = datetime.utcnow().date()
            message = f"Player {player.summoner_name} removed from {team.name} roster"
            current_app.logger.info(
                f"Player {player.summoner_name} removed from team {team.name}"
            )

        db.session.commit()

        return (
            jsonify(
                {
                    "message": message,
                    "player_name": player.summoner_name,
                    "team_name": team.name,
                    "deleted_from_db": delete_player_param,
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(
            f"Failed to remove player from roster: {str(e)}", exc_info=True
        )
        return jsonify({"error": f"Failed to remove player: {str(e)}"}), 500


@bp.route("/<team_id>/roster/add", methods=["POST"])
def add_player_to_roster(team_id):
    """
    Add a player to team roster via OP.GG URL or player_id

    Request body:
        {
            "opgg_url": "https://op.gg/summoners/euw/Faker-KR1"
            OR
            "player_id": "uuid"
            "role": "TOP" (optional)
        }

    Returns:
        {
            "message": "Player added to roster",
            "player": {...}
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        player = None
        role = data.get("role")

        # Option 1: Add existing player by ID
        if "player_id" in data:
            player = Player.query.get(data["player_id"])
            if not player:
                return jsonify({"error": "Player not found"}), 404

        # Option 2: Import new player from OP.GG URL
        elif "opgg_url" in data:
            opgg_url = data["opgg_url"]
            summoner_names = parse_opgg_url(opgg_url)

            if not summoner_names or len(summoner_names) == 0:
                return jsonify({"error": "Invalid OP.GG URL or no players found"}), 400

            summoner_name = summoner_names[0]  # Take first player

            # Check if player already exists
            player = Player.query.filter_by(summoner_name=summoner_name).first()

            if not player:
                # Import new player
                riot_client = RiotAPIClient()

                # Parse Riot ID
                if "#" in summoner_name:
                    game_name, tag_line = summoner_name.split("#", 1)
                else:
                    game_name = summoner_name
                    tag_line = "EUW"

                # Get account data
                account_data = riot_client.get_account_by_riot_id(game_name, tag_line)
                if not account_data:
                    return (
                        jsonify({"error": f"Could not find summoner: {summoner_name}"}),
                        404,
                    )

                puuid = account_data.get("puuid")

                # Get summoner data
                summoner_data = riot_client.get_summoner_by_puuid(puuid)
                if not summoner_data:
                    return jsonify({"error": f"Could not fetch summoner data"}), 404

                display_name = (
                    f"{account_data.get('gameName')}#{account_data.get('tagLine')}"
                )
                summoner_id = summoner_data.get("id")

                # Get ranked data
                ranked_data = None
                current_rank = None
                if summoner_id:
                    ranked_data = riot_client.get_league_entries(summoner_id)
                    if ranked_data:
                        for entry in ranked_data:
                            if entry.get("queueType") == "RANKED_SOLO_5x5":
                                tier = entry.get("tier", "")
                                rank = entry.get("rank", "")
                                current_rank = f"{tier} {rank}"
                                break

                # Create player
                player = Player(
                    puuid=puuid,
                    summoner_name=display_name,
                    summoner_id=summoner_id,
                    profile_icon_id=summoner_data.get("profileIconId"),
                    current_rank=current_rank,
                    region=current_app.config["RIOT_PLATFORM"],
                    last_active=datetime.utcnow(),
                )

                db.session.add(player)
                db.session.commit()

                current_app.logger.info(f"Created new player: {display_name}")

        else:
            return jsonify({"error": "Either opgg_url or player_id required"}), 400

        # Check if player is already in roster
        existing_entry = (
            TeamRoster.query.filter_by(team_id=team_id, player_id=player.id)
            .filter(TeamRoster.leave_date.is_(None))
            .first()
        )

        if existing_entry:
            return jsonify({"error": "Player already in team roster"}), 409

        # Add to roster
        roster_entry = TeamRoster(
            team_id=team.id,
            player_id=player.id,
            role=role,
            is_main_roster=True,
            join_date=datetime.utcnow().date(),
        )

        db.session.add(roster_entry)
        db.session.commit()

        current_app.logger.info(
            f"Added player {player.summoner_name} to team {team.name}"
        )

        return (
            jsonify(
                {
                    "message": f"Player added to {team.name} roster",
                    "player": player.to_dict(),
                    "team_name": team.name,
                    "role": role,
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(
            f"Failed to add player to roster: {str(e)}", exc_info=True
        )
        return jsonify({"error": f"Failed to add player: {str(e)}"}), 500


@bp.route("/<team_id>/sync-from-opgg", methods=["POST"])
def sync_roster_from_opgg(team_id):
    """
    Sync team roster with OP.GG
    This will update the roster to match exactly what's on OP.GG

    Request body:
        {
            "opgg_url": "https://www.op.gg/multisearch/euw?summoners=..."
        }

    Returns:
        {
            "message": "Roster synced successfully",
            "players_added": 2,
            "players_removed": 1,
            "players_kept": 3
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    data = request.get_json()
    if not data or "opgg_url" not in data:
        return jsonify({"error": "opgg_url is required"}), 400

    opgg_url = data["opgg_url"]

    try:
        # Parse OP.GG URL
        summoner_names = parse_opgg_url(opgg_url)
        if not summoner_names:
            return jsonify({"error": "Invalid OP.GG URL"}), 400

        current_app.logger.info(
            f"Syncing team {team.name} with {len(summoner_names)} players from OP.GG"
        )

        # Get current roster
        current_roster = (
            TeamRoster.query.filter_by(team_id=team_id)
            .filter(TeamRoster.leave_date.is_(None))
            .all()
        )

        current_player_puuids = set()
        current_players_map = {}

        for entry in current_roster:
            current_player_puuids.add(entry.player.puuid)
            current_players_map[entry.player.puuid] = entry

        # Fetch/create players from OP.GG
        riot_client = RiotAPIClient()
        opgg_players = []
        opgg_puuids = set()

        for riot_id in summoner_names:
            # Parse Riot ID
            if "#" in riot_id:
                game_name, tag_line = riot_id.split("#", 1)
            else:
                game_name = riot_id
                tag_line = "EUW"

            # Get account data
            account_data = riot_client.get_account_by_riot_id(game_name, tag_line)
            if not account_data:
                current_app.logger.warning(f"Could not find: {riot_id}")
                continue

            puuid = account_data.get("puuid")
            opgg_puuids.add(puuid)

            # Check if player exists
            player = Player.query.filter_by(puuid=puuid).first()

            if not player:
                # Create new player
                summoner_data = riot_client.get_summoner_by_puuid(puuid)
                if not summoner_data:
                    current_app.logger.warning(
                        f"Could not fetch summoner data for {riot_id}"
                    )
                    continue

                display_name = (
                    f"{account_data.get('gameName')}#{account_data.get('tagLine')}"
                )
                summoner_id = summoner_data.get("id")

                # Get ranked data
                current_rank = None
                if summoner_id:
                    ranked_data = riot_client.get_league_entries(summoner_id)
                    if ranked_data:
                        for entry in ranked_data:
                            if entry.get("queueType") == "RANKED_SOLO_5x5":
                                current_rank = (
                                    f"{entry.get('tier')} {entry.get('rank')}"
                                )
                                break

                player = Player(
                    puuid=puuid,
                    summoner_name=display_name,
                    summoner_id=summoner_id,
                    profile_icon_id=summoner_data.get("profileIconId"),
                    current_rank=current_rank,
                    region=current_app.config["RIOT_PLATFORM"],
                    last_active=datetime.utcnow(),
                )

                db.session.add(player)
                current_app.logger.info(f"Created new player: {display_name}")

            opgg_players.append(player)

        db.session.commit()

        # Calculate differences
        players_to_add = (
            opgg_puuids - current_player_puuids
        )  # In OP.GG but not in roster
        players_to_remove = (
            current_player_puuids - opgg_puuids
        )  # In roster but not in OP.GG
        players_kept = opgg_puuids & current_player_puuids  # In both

        # Remove players not in OP.GG
        for puuid in players_to_remove:
            roster_entry = current_players_map[puuid]
            roster_entry.leave_date = datetime.utcnow().date()
            current_app.logger.info(
                f"Removed {roster_entry.player.summoner_name} from roster"
            )

        # Add new players from OP.GG
        for player in opgg_players:
            if player.puuid in players_to_add:
                roster_entry = TeamRoster(
                    team_id=team.id,
                    player_id=player.id,
                    is_main_roster=True,
                    join_date=datetime.utcnow().date(),
                )
                db.session.add(roster_entry)
                current_app.logger.info(f"Added {player.summoner_name} to roster")

        db.session.commit()

        # Update team OP.GG URL
        team.opgg_url = opgg_url
        db.session.commit()

        return (
            jsonify(
                {
                    "message": f"Roster synced successfully for {team.name}",
                    "team_name": team.name,
                    "players_added": len(players_to_add),
                    "players_removed": len(players_to_remove),
                    "players_kept": len(players_kept),
                    "total_players": len(opgg_players),
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to sync roster: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to sync roster: {str(e)}"}), 500
