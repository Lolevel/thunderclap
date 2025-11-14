"""
Analytics routes - Team Overview, Champion Pool & Draft Patterns, In-Depth Statistics
NEW endpoints for enhanced team analysis
"""

from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models import Team, TeamStats, Player, PlayerChampion, Match, MatchParticipant, MatchTeamStats
from app.services.draft_analyzer import DraftAnalyzer
from app.services.stats_calculator import StatsCalculator
from app.middleware.auth import require_auth
from sqlalchemy import func, desc, or_
from collections import defaultdict
from datetime import datetime, timedelta
import urllib.parse

bp = Blueprint("analytics", __name__, url_prefix="/api")

# TODO: Authentication temporarily disabled for development
# Apply authentication to all routes
# @bp.before_request
# @require_auth
# def before_request():
#     pass


@bp.route("/teams/<team_id>/full-data", methods=["GET"])
def get_team_full_data(team_id):
    """
    UNIFIED ENDPOINT: Get ALL team data in a single request (CACHED)

    This endpoint combines data from all tabs to minimize round trips:
    - Overview stats
    - Roster
    - Champion pools
    - Draft analysis
    - Scouting report
    - Recent matches (limited to 20)

    Returns:
        {
            "team_id": "uuid",
            "team_name": "...",
            "overview": {...},
            "roster": {...},
            "champion_pools": {...},
            "draft_analysis": {...},
            "scouting_report": {...},
            "matches": {...}
        }
    """
    from app.services.cache_service import get_cache
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import time

    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    # Try cache first
    cache = get_cache()
    cache_key = cache._make_key('team_full_data', team_id)
    cached_data = cache.get(cache_key)

    if cached_data:
        current_app.logger.info(f"Cache HIT: team full data {team_id}")
        return jsonify(cached_data), 200

    current_app.logger.info(f"Cache MISS: team full data {team_id} - Building...")
    start_time = time.time()

    try:
        # Fetch all data in parallel using internal functions
        result = {}

        # Call individual endpoint functions directly (they handle their own caching)
        # Overview
        with current_app.test_request_context():
            overview_response = get_team_overview(team_id)
            if overview_response[1] == 200:
                result['overview'] = overview_response[0].get_json()

        # Roster
        with current_app.test_request_context():
            from app.routes.teams import get_team_roster
            roster_response = get_team_roster(team_id)
            if roster_response[1] == 200:
                result['roster'] = roster_response[0].get_json()

        # Champion pools
        with current_app.test_request_context():
            pools_response = get_team_player_champion_pools(team_id)
            if pools_response[1] == 200:
                result['champion_pools'] = pools_response[0].get_json()

        # Draft analysis
        with current_app.test_request_context():
            draft_response = get_draft_analysis(team_id)
            if draft_response[1] == 200:
                result['draft_analysis'] = draft_response[0].get_json()

        # Scouting report
        with current_app.test_request_context():
            report_response = get_scouting_report(team_id)
            if report_response[1] == 200:
                result['scouting_report'] = report_response[0].get_json()

        # Matches (limited to 20)
        with current_app.test_request_context(query_string={'limit': '20'}):
            matches_response = get_team_matches(team_id)
            if matches_response[1] == 200:
                result['matches'] = matches_response[0].get_json()

        # Add metadata
        result['team_id'] = str(team_id)
        result['team_name'] = team.name
        result['fetched_at'] = time.time()

        elapsed = time.time() - start_time
        current_app.logger.info(f"Built full data for team {team_id} in {elapsed:.2f}s")

        # Cache for 15 minutes (shorter than individual endpoints)
        cache.set(cache_key, result, ttl=900)

        return jsonify(result), 200

    except Exception as e:
        current_app.logger.error(f"Error getting full team data: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to get full team data", "details": str(e)}), 500


@bp.route("/teams/<team_id>/overview", methods=["GET"])
def get_team_overview(team_id):
    """
    Get team overview with most important stats (CACHED)

    Returns:
        {
            "team_id": "uuid",
            "pl_stats": {
                "games": 25,
                "wins": 18,
                "losses": 7,
                "winrate": 72.0
            },
            "top_5_champions": [...],
            "average_rank": "Diamond 2",
            "player_count": 7
        }
    """
    from app.services.cache_service import get_cache

    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    # Try cache first
    cache = get_cache()
    cache_key = cache._make_key('team_overview', team_id)
    cached_data = cache.get(cache_key)

    if cached_data:
        current_app.logger.debug(f"Cache HIT: team overview {team_id}")
        return jsonify(cached_data), 200

    current_app.logger.debug(f"Cache MISS: team overview {team_id}")

    try:
        # Get PL stats
        team_stats = TeamStats.query.filter_by(
            team_id=team.id,
            stat_type='tournament'
        ).first()

        pl_stats = {
            "games": 0,
            "wins": 0,
            "losses": 0,
            "winrate": 0
        }

        if team_stats:
            pl_stats = {
                "games": team_stats.games_played,
                "wins": team_stats.wins,
                "losses": team_stats.losses,
                "winrate": round((team_stats.wins / team_stats.games_played * 100), 1) if team_stats.games_played > 0 else 0
            }

        # Get top 5 team champions (by champion_id, not champion_name to avoid MonkeyKing)
        top_champions = db.session.query(
            MatchParticipant.champion_id,
            func.count(MatchParticipant.id).label('picks'),
            func.sum(func.cast(MatchParticipant.win, db.Integer)).label('wins'),
            Player.summoner_name
        ).join(
            Match, MatchParticipant.match_id == Match.id
        ).join(
            Player, MatchParticipant.player_id == Player.id
        ).filter(
            MatchParticipant.team_id == team.id,
            Match.is_tournament_game == True
        ).group_by(
            MatchParticipant.champion_id,
            Player.summoner_name
        ).order_by(
            desc('picks')
        ).limit(5).all()

        # Enrich with champion data from database
        from app.utils.champion_helper import batch_enrich_champions

        champion_ids = [champ.champion_id for champ in top_champions]
        champion_data_map = batch_enrich_champions(champion_ids, include_images=True)

        top_5_champions = [
            {
                "champion_id": champ.champion_id,
                "champion": champion_data_map.get(champ.champion_id, {}).get('name', f'Champion {champ.champion_id}'),
                "champion_icon": champion_data_map.get(champ.champion_id, {}).get('icon_url'),
                "picks": champ.picks,
                "wins": champ.wins or 0,
                "winrate": round((champ.wins / champ.picks * 100), 1) if champ.picks > 0 and champ.wins else 0,
                "player": champ.summoner_name
            }
            for champ in top_champions
        ]

        # Get average rank using new rank calculation system
        from app.utils.rank_calculator import calculate_average_rank, rank_to_points, points_to_rank

        active_roster = [r for r in team.rosters if r.leave_date is None]

        # Collect Solo/Duo Queue ranks from active roster with points
        soloq_ranks = []
        all_points = []
        for roster_entry in active_roster:
            if roster_entry.player and roster_entry.player.soloq_tier:
                rank_data = {
                    'tier': roster_entry.player.soloq_tier,
                    'division': roster_entry.player.soloq_division,
                    'lp': roster_entry.player.soloq_lp or 0
                }
                soloq_ranks.append(rank_data)

                # Calculate points for peak/lowest
                points = rank_to_points(
                    roster_entry.player.soloq_tier,
                    roster_entry.player.soloq_division,
                    roster_entry.player.soloq_lp or 0
                )
                all_points.append(points)

        # Calculate average, peak, and lowest
        avg_rank_info = calculate_average_rank(soloq_ranks)

        # Calculate peak (highest) and lowest ranks
        peak_rank_info = None
        lowest_rank_info = None

        if all_points:
            peak_points = max(all_points)
            lowest_points = min(all_points)

            from app.utils.rank_calculator import get_rank_icon_url

            peak_rank_info = points_to_rank(peak_points)
            peak_rank_info['icon_url'] = get_rank_icon_url(
                peak_rank_info['tier'],
                peak_rank_info.get('division')
            )

            lowest_rank_info = points_to_rank(lowest_points)
            lowest_rank_info['icon_url'] = get_rank_icon_url(
                lowest_rank_info['tier'],
                lowest_rank_info.get('division')
            )

        result = {
            "team_id": str(team.id),
            "team_name": team.name,
            "pl_stats": pl_stats,
            "top_5_champions": top_5_champions,
            "average_rank": avg_rank_info['display'] if soloq_ranks else 'Unranked',
            "average_rank_info": avg_rank_info if soloq_ranks else None,
            "peak_rank_info": peak_rank_info,
            "lowest_rank_info": lowest_rank_info,
            "player_count": len(active_roster)
        }

        # Cache result for 30 minutes
        cache.set(cache_key, result, ttl=1800)

        return jsonify(result), 200

    except Exception as e:
        current_app.logger.error(f"Error getting team overview: {str(e)}")
        return jsonify({"error": "Failed to get team overview", "details": str(e)}), 500


@bp.route("/teams/<team_id>/draft-analysis", methods=["GET"])
def get_draft_analysis(team_id):
    """
    Get champion pool and draft pattern analysis

    Query params:
        - days: Days to analyze (default: 90)

    Returns:
        {
            "team_champion_pool": [...],
            "favorite_bans": {phase_1: [...], phase_2: [...]},
            "bans_against": {phase_1: [...], phase_2: [...]},
            "first_pick_priority": [...],
            "side_performance": {blue: {...}, red: {...}}
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    days = request.args.get("days", 90, type=int)

    try:
        analyzer = DraftAnalyzer()
        analysis = analyzer.analyze_team_draft_patterns(team, days)

        if "error" in analysis:
            return jsonify(analysis), 200

        # Get first pick priority
        first_pick_priority = analyzer.get_first_pick_priority(team)

        analysis['first_pick_priority'] = first_pick_priority

        # Enrich bans with champion data
        from app.utils.champion_helper import batch_enrich_champions

        # Collect all champion IDs from bans
        all_ban_ids = set()
        if 'favorite_bans' in analysis:
            for phase_bans in analysis['favorite_bans'].values():
                for ban in phase_bans:
                    all_ban_ids.add(ban['champion_id'])
        if 'bans_against' in analysis:
            for phase_bans in analysis['bans_against'].values():
                for ban in phase_bans:
                    all_ban_ids.add(ban['champion_id'])

        # Batch enrich
        champion_data_map = batch_enrich_champions(list(all_ban_ids), include_images=True)

        # Enrich favorite_bans
        if 'favorite_bans' in analysis:
            for phase_key, phase_bans in analysis['favorite_bans'].items():
                for ban in phase_bans:
                    champ_info = champion_data_map.get(ban['champion_id'], {})
                    ban['champion'] = champ_info.get('name', f"Champion {ban['champion_id']}")
                    ban['champion_icon'] = champ_info.get('icon_url')
                    ban['frequency'] = ban.pop('count')

        # Enrich bans_against
        if 'bans_against' in analysis:
            for phase_key, phase_bans in analysis['bans_against'].items():
                for ban in phase_bans:
                    champ_info = champion_data_map.get(ban['champion_id'], {})
                    ban['champion'] = champ_info.get('name', f"Champion {ban['champion_id']}")
                    ban['champion_icon'] = champ_info.get('icon_url')
                    ban['frequency'] = ban.pop('count')

        return jsonify(analysis), 200

    except Exception as e:
        current_app.logger.error(f"Error getting champion pool analysis: {str(e)}")
        return jsonify({"error": "Failed to get champion pool analysis", "details": str(e)}), 500


@bp.route("/teams/<team_id>/player-champion-pools", methods=["GET"])
def get_team_player_champion_pools(team_id):
    """
    Get champion pools for all team members (individual player stats across all teams)

    Returns:
        {
            "players": [
                {
                    "player_id": "uuid",
                    "player_name": "...",
                    "champions": [
                        {
                            "champion": "Yasuo",
                            "champion_id": 157,
                            "champion_icon": "...",
                            "games": 15,
                            "wins": 10,
                            "losses": 5,
                            "winrate": 66.7,
                            "kda": 3.5,
                            "cs_per_min": 7.8
                        },
                        ...
                    ]
                },
                ...
            ]
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    try:
        # Get active roster
        active_roster = [r for r in team.rosters if r.leave_date is None]

        # Calculate bans against team (first rotation only)
        # Use the same logic as in draft_analyzer.analyze_team_draft_patterns
        days = 90
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Optimized: Load matches with MatchTeamStats in one query
        matches_with_stats = db.session.query(Match, MatchTeamStats).join(
            MatchTeamStats, Match.id == MatchTeamStats.match_id
        ).filter(
            Match.is_tournament_game == True,
            Match.created_at >= cutoff_date,
            or_(Match.winning_team_id == team.id, Match.losing_team_id == team.id)
        ).all()

        # Count bans against team (first rotation only - pick_turn <= 6)
        bans_against_first_rotation = defaultdict(int)

        # Group stats by match_id
        matches_dict = {}
        for match, team_stat in matches_with_stats:
            if match.id not in matches_dict:
                matches_dict[match.id] = {
                    'match': match,
                    'stats': []
                }
            matches_dict[match.id]['stats'].append(team_stat)

        for match_id, match_data in matches_dict.items():
            match = match_data['match']
            all_team_stats = match_data['stats']

            team_won = match.winning_team_id == team.id

            # Find opponent stats based on win/loss
            opponent_stats = None
            for stats in all_team_stats:
                if (team_won and not stats.win) or (not team_won and stats.win):
                    opponent_stats = stats
                    break

            # Analyze opponent's bans (bans against us)
            if opponent_stats:
                opponent_bans = opponent_stats.bans or []
                for ban in opponent_bans:
                    champion_id = ban.get('championId')
                    pick_turn = ban.get('pickTurn')

                    # Only count first rotation bans (pick_turn <= 6)
                    if champion_id and champion_id != -1 and pick_turn and pick_turn <= 6:
                        bans_against_first_rotation[champion_id] += 1

        player_pools = []

        from app.utils.champion_helper import batch_enrich_champions

        for roster_entry in active_roster:
            player = roster_entry.player

            # Get ALL champions for this player (not just tournament)
            # Try tournament first, if empty try without filter
            champions = PlayerChampion.query.filter_by(
                player_id=player.id,
                game_type='tournament'
            ).order_by(
                PlayerChampion.games_played.desc()
            ).all()

            # If no tournament champions found, try all game types
            if not champions:
                champions = PlayerChampion.query.filter_by(
                    player_id=player.id
                ).order_by(
                    PlayerChampion.games_played.desc()
                ).all()

            # If still no champions, add player with empty champion list
            champion_list = []

            if champions:
                # Batch enrich champions
                champion_ids = [champ.champion_id for champ in champions]
                champion_data_map = batch_enrich_champions(champion_ids, include_images=True)

                for champ in champions:
                    champ_info = champion_data_map.get(champ.champion_id, {
                        'name': champ.champion_name,
                        'icon_url': None
                    })

                    champion_list.append({
                        "champion": champ_info.get('name', champ.champion_name),
                        "champion_id": champ.champion_id,
                        "champion_icon": champ_info.get('icon_url'),
                        "games": champ.games_played,
                        "wins": champ.wins,
                        "losses": champ.losses,
                        "winrate": round((champ.wins / champ.games_played * 100) if champ.games_played > 0 else 0, 1),
                        "kda": round(float(champ.kda_average), 2) if champ.kda_average else 0,
                        "cs_per_min": round(float(champ.cs_per_min), 1) if champ.cs_per_min else 0,
                        "bans_against": bans_against_first_rotation.get(champ.champion_id, 0)  # NEW: First rotation bans
                    })

            # Always add the player, even if they have no champion data
            player_pools.append({
                "player_id": str(player.id),
                "player_name": player.summoner_name,
                "profile_icon_id": player.profile_icon_id,
                "role": roster_entry.role or "UNKNOWN",
                "champions": champion_list
            })

        return jsonify({"players": player_pools}), 200

    except Exception as e:
        current_app.logger.error(f"Error getting player champion pools: {str(e)}")
        return jsonify({"error": "Failed to get player champion pools", "details": str(e)}), 500


@bp.route("/teams/<team_id>/scouting-report", methods=["GET"])
def get_scouting_report(team_id):
    """
    Get detailed in-depth statistics and performance metrics

    Query params:
        - days: Days to analyze (default: 90)

    Returns:
        {
            "side_performance": {blue: {...}, red: {...}},
            "avg_game_duration": 1847,
            "first_blood_rate": 68.0,
            "first_tower_rate": 72.0,
            "objective_control": {...},
            "timeline_data": {...}
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    days = request.args.get("days", 90, type=int)

    try:
        analyzer = DraftAnalyzer()

        # Get draft patterns (includes side performance)
        draft_patterns = analyzer.analyze_team_draft_patterns(team, days)

        # Get objective stats
        objective_stats = analyzer.calculate_objective_stats(team, days)

        # Get team stats for game duration
        team_stats = TeamStats.query.filter_by(
            team_id=team.id,
            stat_type='tournament'
        ).first()

        avg_game_duration = team_stats.average_game_duration if team_stats else 0

        report = {
            "team_id": str(team.id),
            "team_name": team.name,
            "side_performance": draft_patterns.get('side_performance', {}),
            "avg_game_duration": avg_game_duration,
            "first_blood_rate": objective_stats.get('first_blood_rate', 0),
            "first_tower_rate": objective_stats.get('first_tower_rate', 0),
            "objective_control": {
                "avg_dragons": objective_stats.get('avg_dragons', 0),
                "avg_barons": objective_stats.get('avg_barons', 0),
                "avg_heralds": objective_stats.get('avg_heralds', 0)
            },
            "timeline_data": {
                "avg_gold_diff_15": team_stats.average_gold_diff_at_15 if team_stats else None,
                "avg_gold_diff_10": team_stats.average_gold_diff_at_10 if team_stats else None
            },
            "total_games": objective_stats.get('total_games', 0)
        }

        return jsonify(report), 200

    except Exception as e:
        current_app.logger.error(f"Error getting in-depth statistics: {str(e)}")
        return jsonify({"error": "Failed to get in-depth statistics", "details": str(e)}), 500


@bp.route("/players/<player_id>/champions/tournament", methods=["GET"])
def get_player_tournament_champions(player_id):
    """
    Get player's tournament (Prime League) champion statistics

    Returns:
        {
            "player_id": "uuid",
            "player_name": "...",
            "game_type": "tournament",
            "champions": [...]
        }
    """
    player = Player.query.get(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404

    try:
        champions = PlayerChampion.query.filter_by(
            player_id=player.id,
            game_type='tournament'
        ).order_by(
            PlayerChampion.games_played.desc()
        ).all()

        return jsonify({
            "player_id": str(player.id),
            "player_name": player.summoner_name,
            "game_type": "tournament",
            "champions": [champ.to_dict() for champ in champions]
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting tournament champions: {str(e)}")
        return jsonify({"error": "Failed to get tournament champions", "details": str(e)}), 500


@bp.route("/players/<player_id>/champions/soloqueue", methods=["GET"])
def get_player_soloqueue_champions(player_id):
    """
    Get player's solo queue top 20 champion statistics

    Returns:
        {
            "player_id": "uuid",
            "player_name": "...",
            "game_type": "soloqueue",
            "champions": [...]
        }
    """
    player = Player.query.get(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404

    try:
        champions = PlayerChampion.query.filter_by(
            player_id=player.id,
            game_type='soloqueue'
        ).order_by(
            PlayerChampion.games_played.desc()
        ).limit(20).all()

        return jsonify({
            "player_id": str(player.id),
            "player_name": player.summoner_name,
            "game_type": "soloqueue",
            "champions": [champ.to_dict() for champ in champions]
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting soloqueue champions: {str(e)}")
        return jsonify({"error": "Failed to get soloqueue champions", "details": str(e)}), 500


@bp.route("/players/<player_id>/opgg", methods=["GET"])
def get_player_opgg_url(player_id):
    """
    Generate OP.GG URL for a player

    Returns:
        {"opgg_url": "https://www.op.gg/summoners/euw/Player-EUW"}
    """
    player = Player.query.get(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404

    try:
        # Parse summoner name (format: "GameName#TAG")
        summoner_name = player.summoner_name

        if "#" in summoner_name:
            game_name, tag = summoner_name.split("#", 1)
        else:
            game_name = summoner_name
            tag = "EUW"

        # Generate OP.GG URL (single player uses - not %23)
        # Map Riot platform (euw1) to OP.GG region (euw)
        region = player.region.lower() if player.region else "euw1"
        region = region.replace("1", "")  # euw1 -> euw, na1 -> na, etc.
        opgg_url = f"https://www.op.gg/summoners/{region}/{game_name}-{tag}"

        return jsonify({
            "player_id": str(player.id),
            "player_name": player.summoner_name,
            "opgg_url": opgg_url
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error generating OP.GG URL: {str(e)}")
        return jsonify({"error": "Failed to generate OP.GG URL", "details": str(e)}), 500


@bp.route("/teams/<team_id>/opgg", methods=["GET"])
def get_team_opgg_url(team_id):
    """
    Generate OP.GG multi-search URL for a team

    Query params:
        - player_ids: Comma-separated player IDs (optional, uses all roster if not specified)

    Returns:
        {"opgg_url": "https://www.op.gg/multisearch/euw?summoners=P1-EUW,P2-EUW,..."}
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    try:
        # Get player IDs from query or use full roster
        player_ids_str = request.args.get("player_ids")

        if player_ids_str:
            player_ids = player_ids_str.split(",")
            players = Player.query.filter(Player.id.in_(player_ids)).all()
        else:
            # Use active roster
            active_roster = [r for r in team.rosters if r.leave_date is None]
            players = [r.player for r in active_roster]

        if not players:
            return jsonify({"error": "No players found"}), 404

        # Generate summoner names for URL (use %23 for # symbol)
        summoner_names = []
        for player in players:
            if "#" in player.summoner_name:
                game_name, tag = player.summoner_name.split("#", 1)
                summoner_names.append(f"{game_name}%23{tag}")
            else:
                summoner_names.append(player.summoner_name)

        # Generate OP.GG multi-search URL
        # Map Riot platform (euw1) to OP.GG region (euw)
        region = players[0].region.lower() if players[0].region else "euw1"
        region = region.replace("1", "")  # euw1 -> euw, na1 -> na, etc.
        encoded_names = ",".join([urllib.parse.quote(name, safe='%') for name in summoner_names])
        opgg_url = f"https://www.op.gg/multisearch/{region}?summoners={encoded_names}"

        return jsonify({
            "team_id": str(team.id),
            "team_name": team.name,
            "player_count": len(players),
            "opgg_url": opgg_url
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error generating team OP.GG URL: {str(e)}")
        return jsonify({"error": "Failed to generate team OP.GG URL", "details": str(e)}), 500


@bp.route("/teams/<team_id>/refresh-legacy", methods=["POST"])
def refresh_team_stats(team_id):
    """
    Refresh all team statistics
    Runs: fetch matches, link matches, calculate stats

    Request body:
        {
            "count_per_player": 50 (optional),
            "min_players_together": 3 (optional)
        }

    Returns:
        {
            "message": "Team stats refreshed",
            "details": {...}
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    data = request.get_json() or {}
    count_per_player = data.get("count_per_player", 50)
    min_players_together = data.get("min_players_together", 3)

    try:
        from app.services import RiotAPIClient, MatchFetcher

        current_app.logger.info(f"Refreshing stats for team {team.name}")

        # 1. Fetch matches
        riot_client = RiotAPIClient()
        match_fetcher = MatchFetcher(riot_client)

        matches_fetched = match_fetcher.fetch_tournament_games_only(
            team, count_per_player, min_players_together
        )

        # 2. Link matches (check if existing matches should be linked to this team)
        from app.models import Match, MatchParticipant

        active_roster = [r for r in team.rosters if r.leave_date is None]
        team_player_ids = {r.player_id for r in active_roster}

        matches_linked = 0
        # Only check unlinked tournament matches for performance
        matches = Match.query.filter_by(
            is_tournament_game=True,
            winning_team_id=None,
            losing_team_id=None
        ).all()

        for match in matches:
            # Count team players in this match
            team_participants = [p for p in match.participants if p.player_id in team_player_ids]

            # Link if 3+ team players participated
            if len(team_participants) >= 3:
                team_won = team_participants[0].win if team_participants else False

                if team_won:
                    match.winning_team_id = team.id
                else:
                    match.losing_team_id = team.id

                for participant in team_participants:
                    participant.team_id = team.id

                matches_linked += 1

        db.session.commit()

        # 3. Calculate stats
        stats_calculator = StatsCalculator()
        stats_result = stats_calculator.calculate_all_stats_for_team(team)

        # 4. Fetch player ranks
        from app.utils.rank_fetcher import fetch_team_ranks
        rank_result = fetch_team_ranks(str(team.id))

        return jsonify({
            "message": f"Team stats refreshed for {team.name}",
            "details": {
                "matches_fetched": matches_fetched,
                "matches_linked": matches_linked,
                "stats_calculated": stats_result.get("stats_calculated", []),
                "champions_updated": stats_result.get("champions_updated", 0),
                "players_processed": stats_result.get("players_processed", 0),
                "ranks_updated": rank_result.get("success", 0),
                "ranks_failed": rank_result.get("failed", 0)
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error refreshing team stats: {str(e)}")
        return jsonify({"error": "Failed to refresh team stats", "details": str(e)}), 500


@bp.route("/teams/<team_id>/refresh-stream", methods=["GET"])
def refresh_team_stats_stream(team_id):
    """
    OPTIMIZED: Stream progress updates for team stats refresh using Server-Sent Events (SSE)

    Flow:
    1. Collect all game IDs from all players (fast)
    2. Check which games exist in DB (batch query)
    3. Fetch only missing games from Riot API
    4. Link games to team
    5. Background: Fetch individual player stats

    Returns:
        Server-Sent Events stream with progress updates
    """
    from flask import Response, stream_with_context
    import json
    import time

    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    def generate():
        try:
            from app.services import RiotAPIClient, MatchFetcher
            from app.services.stats_calculator import StatsCalculator
            from app.utils.community_dragon import sync_champions_from_community_dragon
            from app.models.champion import Champion

            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': 'Starte Aktualisierung...', 'step': 'init', 'progress_percent': 0}})}\n\n"

            # ========================================
            # STEP 0: Check and sync champion data if DB is empty
            # ========================================
            champion_count = Champion.query.count()
            if champion_count == 0:
                yield f"data: {json.dumps({'type': 'progress', 'data': {'message': 'Lade Champion-Daten von Community Dragon...', 'step': 'sync_champions'}})}\n\n"

                sync_result = sync_champions_from_community_dragon()
                current_app.logger.info(f"Champion sync: {sync_result}")

                created_count = sync_result.get('created', 0)
                yield f"data: {json.dumps({'type': 'progress', 'data': {'message': f'{created_count} Champions geladen', 'step': 'champions_synced'}})}\n\n"

            riot_client = RiotAPIClient()
            match_fetcher = MatchFetcher(riot_client)

            active_roster = [r for r in team.rosters if r.leave_date is None]
            total_players = len(active_roster)
            team_player_puuids = {r.player.puuid for r in active_roster}
            team_player_ids = {r.player_id for r in active_roster}

            # ========================================
            # STEP 1: Collect TOURNAMENT game IDs ONLY (FAST & EFFICIENT)
            # ========================================
            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': 'Sammle Tournament Game-IDs...', 'step': 'collect_ids', 'total_players': total_players, 'progress_percent': 5}})}\n\n"

            all_match_ids = set()
            player_match_map = {}  # Track which player has which matches

            for idx, roster_entry in enumerate(active_roster):
                player = roster_entry.player
                # Calculate progress: 5-25% for collecting IDs
                progress = 5 + int((idx / total_players) * 20)
                yield f"data: {json.dumps({'type': 'progress', 'data': {'current_player': player.summoner_name, 'players_processed': idx, 'step': 'collect_ids', 'progress_percent': progress}})}\n\n"

                try:
                    # Get ONLY tournament match IDs using type=tourney filter
                    match_ids_tourney = riot_client.get_match_history(
                        player.puuid,
                        count=100,
                        match_type='tourney'
                    ) or []

                    # Store for this player
                    player_match_map[player.puuid] = match_ids_tourney
                    all_match_ids.update(match_ids_tourney)

                    current_app.logger.info(f'{player.summoner_name}: {len(match_ids_tourney)} tournament games found')

                except Exception as e:
                    if '429' in str(e) or 'rate limit' in str(e).lower():
                        yield f"data: {json.dumps({'type': 'rate_limit', 'wait_seconds': 120, 'message': 'Rate Limit - Warte 2 Minuten...'})}\n\n"
                        time.sleep(120)
                    else:
                        current_app.logger.error(f"Error fetching match IDs for {player.summoner_name}: {e}")

            total_match_ids = len(all_match_ids)
            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': f'{total_match_ids} Games gefunden', 'step': 'ids_collected', 'total_match_ids': total_match_ids}})}\n\n"

            # ========================================
            # STEP 1.5: PRE-FILTER - Only keep games where 3+ team players participated
            # This MUST happen BEFORE DB check to avoid wasting DB queries
            # ========================================
            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': 'Filtere Solo-Queue Games...', 'step': 'pre_filter'}})}\n\n"

            # Count how many players from our team have each match_id
            match_id_player_counts = {}
            for player_puuid, match_ids in player_match_map.items():
                for match_id in match_ids:
                    match_id_player_counts[match_id] = match_id_player_counts.get(match_id, 0) + 1

            # Filter: Only keep games where 3+ team players participated
            # This is our minimum requirement for team games
            team_match_ids = {mid for mid, count in match_id_player_counts.items() if count >= 3}
            soloq_filtered = len(all_match_ids) - len(team_match_ids)

            current_app.logger.info(f'Pre-filter: {len(all_match_ids)} total IDs → {len(team_match_ids)} potential team games (filtered out {soloq_filtered} solo/duo games)')
            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': f'{soloq_filtered} Solo-Queue Games herausgefiltert', 'step': 'pre_filtered', 'filtered': soloq_filtered, 'remaining': len(team_match_ids)}})}\n\n"

            # Replace all_match_ids with filtered list
            all_match_ids = team_match_ids

            # ========================================
            # STEP 2: Check which games exist in DB (BATCH QUERY)
            # ========================================
            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': 'Prüfe Datenbank...', 'step': 'check_db', 'progress_percent': 25}})}\n\n"

            existing_matches = Match.query.filter(Match.match_id.in_(all_match_ids)).all()
            existing_match_ids = {m.match_id for m in existing_matches}
            missing_match_ids = all_match_ids - existing_match_ids

            current_app.logger.info(f'DB Check: {len(all_match_ids)} team game IDs, {len(existing_match_ids)} exist in DB, {len(missing_match_ids)} missing')
            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': f'{len(existing_match_ids)} Games in DB, {len(missing_match_ids)} neue', 'existing': len(existing_match_ids), 'missing': len(missing_match_ids), 'step': 'db_checked', 'progress_percent': 30}})}\n\n"

            # ========================================
            # STEP 3: Fetch ONLY missing games from Riot API
            # ========================================
            matches_fetched = 0
            total_missing = len(missing_match_ids) if missing_match_ids else 1  # Avoid division by zero

            if missing_match_ids:
                yield f"data: {json.dumps({'type': 'progress', 'data': {'message': f'Lade {len(missing_match_ids)} neue Games...', 'step': 'fetch_missing', 'progress_percent': 35}})}\n\n"

                for idx, match_id in enumerate(missing_match_ids):
                    try:
                        # Fetch match data
                        match_data = riot_client.get_match(match_id)
                        if not match_data:
                            continue

                        # Count team players in this match
                        match_info = match_data.get('info', {})
                        participants = match_info.get('participants', [])
                        team_players_in_match = sum(1 for p in participants if p.get('puuid') in team_player_puuids)

                        # Only store if 3+ team players participated
                        if team_players_in_match >= 3:
                            # Store match
                            match = match_fetcher._store_match(match_data)
                            matches_fetched += 1

                            if matches_fetched % 5 == 0:
                                # Progress 35-60% for fetching matches
                                progress = 35 + int((idx / total_missing) * 25)
                                yield f"data: {json.dumps({'type': 'progress', 'data': {'message': f'{matches_fetched} Games geladen...', 'matches_fetched': matches_fetched, 'step': 'fetch_missing', 'progress_percent': progress}})}\n\n"

                    except Exception as e:
                        if '429' in str(e) or 'rate limit' in str(e).lower():
                            yield f"data: {json.dumps({'type': 'rate_limit', 'wait_seconds': 120, 'message': 'Rate Limit - Warte 2 Minuten...'})}\n\n"
                            time.sleep(120)
                        else:
                            current_app.logger.error(f"Error fetching match {match_id}: {e}")

                db.session.commit()

            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': f'{matches_fetched} neue Games gespeichert', 'matches_fetched': matches_fetched, 'step': 'fetch_complete', 'progress_percent': 60}})}\n\n"

            # ========================================
            # STEP 4A: First, link participants to players (for existing matches)
            # ========================================
            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': 'Verknüpfe Participants mit Spielern...', 'step': 'link_participants', 'progress_percent': 65}})}\n\n"

            participants_linked = 0
            all_tournament_matches = Match.query.filter(
                Match.is_tournament_game == True,
                Match.match_id.in_(all_match_ids)
            ).all()

            for match in all_tournament_matches:
                for participant in match.participants:
                    if participant.player_id:
                        continue  # Already linked

                    # Try to find player by PUUID
                    player = Player.query.filter_by(puuid=participant.puuid).first()

                    # Fallback: try by riot_game_name + riot_tagline
                    if not player and participant.riot_game_name and participant.riot_tagline:
                        summoner_name = f"{participant.riot_game_name}#{participant.riot_tagline}"
                        player = Player.query.filter_by(summoner_name=summoner_name).first()

                    if player:
                        participant.player_id = player.id
                        participants_linked += 1

            db.session.commit()
            current_app.logger.info(f"Linked {participants_linked} participants to players")
            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': f'{participants_linked} Participants verknüpft', 'step': 'participants_linked'}})}\n\n"

            # ========================================
            # STEP 4B: Link ALL tournament games to team (existing + new)
            # ========================================
            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': 'Verknüpfe Games mit Team...', 'step': 'link_matches'}})}\n\n"

            matches_linked = 0

            for match in all_tournament_matches:
                # ALWAYS re-check and update team assignment
                # This ensures fixes to the code are applied to existing matches

                # Count team players in this match (now with updated player_ids!)
                team_participants = [p for p in match.participants if p.player_id in team_player_ids]

                if len(team_participants) >= 3:
                    team_won = team_participants[0].win if team_participants else False

                    # Update match team assignment
                    old_winning = match.winning_team_id
                    old_losing = match.losing_team_id

                    if team_won:
                        match.winning_team_id = team.id
                        match.losing_team_id = None  # Clear opposite
                    else:
                        match.losing_team_id = team.id
                        match.winning_team_id = None  # Clear opposite

                    # Set team_id on participants
                    for participant in team_participants:
                        participant.team_id = team.id

                    # Only count as "linked" if it wasn't already linked to THIS team
                    if old_winning != team.id and old_losing != team.id:
                        matches_linked += 1

            db.session.commit()
            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': f'{matches_linked} Games verknüpft', 'matches_linked': matches_linked, 'step': 'link_complete', 'progress_percent': 75}})}\n\n"

            # ========================================
            # STEP 5: Calculate team stats
            # ========================================
            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': 'Berechne Team-Statistiken...', 'step': 'calc_stats', 'progress_percent': 80}})}\n\n"

            stats_calculator = StatsCalculator()
            stats_result = stats_calculator.calculate_all_stats_for_team(team)

            # ========================================
            # STEP 6: Fetch player ranks
            # ========================================
            yield f"data: {json.dumps({'type': 'progress', 'data': {'message': 'Aktualisiere Spieler-Ränge...', 'step': 'fetch_ranks', 'progress_percent': 85}})}\n\n"

            from app.utils.rank_fetcher import fetch_player_rank
            ranks_updated = 0
            ranks_failed = 0

            for roster_entry in active_roster:
                if roster_entry.player:
                    player = roster_entry.player
                    try:
                        if fetch_player_rank(player, riot_client):
                            ranks_updated += 1
                            if player.soloq_tier:
                                rank_display = f"{player.soloq_tier} {player.soloq_division or ''}"
                                yield f"data: {json.dumps({'type': 'progress', 'data': {'message': f'{player.summoner_name}: {rank_display}', 'step': 'fetch_ranks'}})}\n\n"
                        else:
                            ranks_failed += 1
                    except Exception as e:
                        current_app.logger.error(f"Error fetching rank for {player.summoner_name}: {e}")
                        ranks_failed += 1

            # ========================================
            # TEAM DATA COMPLETE - Send 'complete' event
            # ========================================
            yield f"data: {json.dumps({'type': 'complete', 'data': {'message': 'Team-Daten aktualisiert!', 'matches_fetched': matches_fetched, 'matches_linked': matches_linked, 'champions_updated': stats_result.get('champions_updated', 0), 'ranks_updated': ranks_updated, 'progress_percent': 90}})}\n\n"

            # ========================================
            # STEP 7: BACKGROUND - Fetch individual player tournament stats
            # ========================================
            yield f"data: {json.dumps({'type': 'background_progress', 'data': {'message': 'Lade Spieler-Statistiken...', 'player_index': 0, 'total_players': total_players}})}\n\n"

            # This runs in background but with progress updates
            # For each player, fetch their individual tournament games (not just team games)
            # This is for player profile stats

            # ========================================
            # STEP 6.5: Invalidate team cache
            # ========================================
            from app.services.cache_service import get_cache
            cache = get_cache()
            cache.invalidate_team(str(team.id))
            current_app.logger.info(f"Invalidated cache for team {team.id}")

            # Send completion with team stats
            yield f"data: {json.dumps({'type': 'complete', 'data': {'matches_fetched': matches_fetched, 'matches_linked': matches_linked, 'champions_updated': stats_result.get('champions_updated', 0), 'players_processed': total_players, 'ranks_updated': ranks_updated, 'ranks_failed': ranks_failed, 'message': 'Team-Aktualisierung abgeschlossen!'}})}\n\n"

            # Continue with individual player stats in background using PlayerMatchService
            from app.services.player_match_service import PlayerMatchService
            player_service = PlayerMatchService(riot_client)

            total_player_games_fetched = 0

            for idx, roster_entry in enumerate(active_roster):
                player = roster_entry.player
                current_player_msg = f'Lade alle PL-Games für {player.summoner_name}...'
                yield f"data: {json.dumps({'type': 'background_progress', 'data': {'message': current_player_msg, 'player': player.summoner_name, 'player_index': idx, 'total_players': total_players}})}\n\n"

                try:
                    # Fetch ALL tournament games for this player (not just team games)
                    stats = player_service.fetch_all_player_tournament_games(
                        player=player,
                        max_games=100,
                        force_refresh=False
                    )

                    if stats['new_games'] > 0:
                        total_player_games_fetched += stats['new_games']
                        new_games_count = stats['new_games']
                        existing_games_count = stats['existing_games']
                        message = f'{player.summoner_name}: {new_games_count} neue PL-Games ({existing_games_count} bereits vorhanden)'
                        yield f"data: {json.dumps({'type': 'background_progress', 'data': {'message': message, 'player': player.summoner_name, 'player_index': idx, 'total_players': total_players}})}\n\n"

                        # Recalculate player champion stats
                        stats_calculator.calculate_player_champion_stats(player)
                        stats_msg = f'{player.summoner_name}: Champion-Stats aktualisiert'
                        yield f"data: {json.dumps({'type': 'background_progress', 'data': {'message': stats_msg, 'player': player.summoner_name, 'player_index': idx, 'total_players': total_players}})}\n\n"
                    else:
                        existing_games_count = stats['existing_games']
                        message = f'{player.summoner_name}: Keine neuen Games ({existing_games_count} bereits vorhanden)'
                        yield f"data: {json.dumps({'type': 'background_progress', 'data': {'message': message, 'player': player.summoner_name, 'player_index': idx, 'total_players': total_players}})}\n\n"

                except Exception as e:
                    current_app.logger.error(f"Error fetching player stats for {player.summoner_name}: {e}")
                    if '429' in str(e) or 'rate limit' in str(e).lower():
                        yield f"data: {json.dumps({'type': 'rate_limit', 'wait_seconds': 120, 'message': 'Rate Limit - Warte 2 Minuten...'})}\n\n"
                        time.sleep(120)

            # Final background completion
            yield f"data: {json.dumps({'type': 'background_complete', 'data': {'message': f'Alle Spieler-Statistiken geladen! ({total_player_games_fetched} zusätzliche Games)'}})}\n\n"

        except Exception as e:
            current_app.logger.error(f"Error in refresh stream: {str(e)}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            # CRITICAL: Always remove DB session after SSE stream completes
            # This prevents connection pool exhaustion
            db.session.remove()
            current_app.logger.info(f"SSE stream completed for team {team_id}, DB session removed")

    # CORS headers for SSE
    response = Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    )
    return response


@bp.route("/teams/<team_id>/matches", methods=["GET"])
def get_team_matches(team_id):
    """
    Get match history for a team (Prime League games only)
    Includes games where at least 3 team members participated

    Query params:
        limit: Number of matches (default: 20)
        offset: Offset for pagination (default: 0)

    Returns:
        {
            "matches": [
                {
                    "match_id": "EUW1_...",
                    "game_creation": 1234567890,
                    "game_duration": 1800,
                    "win": true,
                    "team_players_count": 5,
                    "participants": [
                        {
                            "player_id": "uuid",
                            "summoner_name": "Player#TAG",
                            "is_team_member": true,
                            "champion_id": 157,
                            "champion_name": "Yasuo",
                            "role": "MIDDLE",
                            "kills": 10,
                            "deaths": 3,
                            "assists": 15,
                            "cs": 250,
                            "gold": 15000,
                            "damage_dealt": 25000,
                            "damage_taken": 18000,
                            "vision_score": 35,
                            "items": [3031, 3094, 3087, 3046, 3072, 3156, 3364],
                            "win": true
                        },
                        ...
                    ]
                },
                ...
            ],
            "total_matches": 50
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    try:
        limit = request.args.get('limit', 20, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Get active roster player IDs
        active_roster = [r for r in team.rosters if r.leave_date is None]
        team_player_ids = {r.player_id for r in active_roster}

        # Get all tournament matches for this team
        matches_query = Match.query.filter(
            Match.is_tournament_game == True,
            db.or_(
                Match.winning_team_id == team.id,
                Match.losing_team_id == team.id
            )
        ).order_by(Match.game_creation.desc())

        total_matches = matches_query.count()
        matches = matches_query.offset(offset).limit(limit).all()

        # Optimized: Load all participants for all matches in one query
        match_ids = [m.id for m in matches]
        all_participants = MatchParticipant.query.filter(
            MatchParticipant.match_id.in_(match_ids)
        ).order_by(
            MatchParticipant.match_id,
            MatchParticipant.riot_team_id,
            MatchParticipant.participant_id
        ).all()

        # Group participants by match_id
        participants_by_match = {}
        for p in all_participants:
            if p.match_id not in participants_by_match:
                participants_by_match[p.match_id] = []
            participants_by_match[p.match_id].append(p)

        # Build a map of player_id -> assigned_role from team roster
        player_assigned_roles = {}
        for roster_entry in active_roster:
            player_assigned_roles[roster_entry.player_id] = roster_entry.role

        result_matches = []

        for match in matches:
            # Get participants from pre-loaded data
            participants = participants_by_match.get(match.id, [])

            # Count team players in this match
            team_players_count = sum(1 for p in participants if p.player_id in team_player_ids)

            # Determine if team won
            team_won = match.winning_team_id == team.id

            # Determine which riot_team_id our team played on
            our_riot_team_id = None
            for p in participants:
                if p.player_id in team_player_ids:
                    our_riot_team_id = p.riot_team_id
                    break

            # Build participant data with enriched champion info
            from app.utils.champion_helper import batch_enrich_champions

            # Collect all champion IDs for batch enrichment
            champion_ids = [p.champion_id for p in participants]
            champion_data_map = batch_enrich_champions(champion_ids, include_images=True)

            # Separate teams
            our_team_participants = []
            enemy_team_participants = []

            # Role mapping for display (normalize roles)
            ROLE_DISPLAY = {
                'TOP': 'Top',
                'JUNGLE': 'Jungle',
                'MIDDLE': 'Mid',
                'BOTTOM': 'Bot',
                'UTILITY': 'Support',
                'top': 'Top',
                'jungle': 'Jungle',
                'mid': 'Mid',
                'middle': 'Mid',
                'bot': 'Bot',
                'bottom': 'Bot',
                'support': 'Support',
                'utility': 'Support'
            }

            # Role order for sorting
            ROLE_ORDER = {'TOP': 0, 'JUNGLE': 1, 'MIDDLE': 2, 'BOTTOM': 3, 'UTILITY': 4}

            for p in participants:
                is_team_member = p.player_id in team_player_ids
                is_our_team = p.riot_team_id == our_riot_team_id

                # Get champion info from database
                champ_info = champion_data_map.get(p.champion_id, {
                    'name': p.champion_name,
                    'icon_url': None
                })

                # Get Riot's assigned role for this game (prefer team_position)
                riot_role = p.team_position or p.individual_position or p.role or 'UNKNOWN'
                display_role = ROLE_DISPLAY.get(riot_role, riot_role)

                # Laneswap detection: Check if assigned role differs from Riot's role
                laneswap_detected = False
                if is_team_member and p.player_id in player_assigned_roles:
                    assigned_role = player_assigned_roles[p.player_id]
                    # Normalize riot_role for comparison
                    normalized_riot_role = riot_role.upper() if riot_role else 'UNKNOWN'

                    # Detect TOP <-> BOTTOM swap
                    if (assigned_role == 'TOP' and normalized_riot_role == 'BOTTOM') or \
                       (assigned_role == 'BOTTOM' and normalized_riot_role == 'TOP'):
                        laneswap_detected = True

                participant_info = {
                    "player_id": str(p.player_id) if p.player_id else None,
                    "summoner_name": p.summoner_name or (p.player.summoner_name if p.player else "Unknown"),
                    "profile_icon_id": p.player.profile_icon_id if p.player else None,
                    "is_team_member": is_team_member,
                    "champion_id": p.champion_id,
                    "champion_name": champ_info.get('name', p.champion_name),
                    "champion_icon": champ_info.get('icon_url'),
                    "role": display_role,
                    "riot_role_raw": riot_role.upper() if riot_role else 'UNKNOWN',  # For sorting
                    "laneswap_detected": laneswap_detected,
                    "riot_team_id": p.riot_team_id,  # 100=Blue, 200=Red
                    "kills": p.kills or 0,
                    "deaths": p.deaths or 0,
                    "assists": p.assists or 0,
                    "cs": p.cs_total or 0,
                    "gold": p.gold_earned or 0,
                    "damage_dealt": p.total_damage_dealt_to_champions or 0,
                    "damage_taken": p.total_damage_taken or 0,
                    "vision_score": p.vision_score or 0,
                    "control_wards": p.control_wards_placed or 0,
                    "items": [
                        p.item0, p.item1, p.item2,
                        p.item3, p.item4, p.item5, p.item6
                    ],
                    "win": p.win
                }

                if is_our_team:
                    our_team_participants.append(participant_info)
                else:
                    enemy_team_participants.append(participant_info)

            # Sort participants by Riot's role order
            def sort_by_role(participant):
                role = participant.get('riot_role_raw', 'UNKNOWN')
                return ROLE_ORDER.get(role, 999)

            our_team_participants.sort(key=sort_by_role)
            enemy_team_participants.sort(key=sort_by_role)

            # Get ban data from MatchTeamStats
            from app.models import MatchTeamStats

            team_stats_list = MatchTeamStats.query.filter_by(match_id=match.id).all()
            bans_data = {"blue": [], "red": []}

            for team_stats in team_stats_list:
                side = "blue" if team_stats.riot_team_id == 100 else "red"
                if team_stats.bans:
                    # Enrich ban data with champion names
                    enriched_bans = []
                    ban_champion_ids = [ban.get('championId') for ban in team_stats.bans if ban.get('championId', -1) != -1]
                    ban_champion_map = batch_enrich_champions(ban_champion_ids, include_images=True)

                    for ban in team_stats.bans:
                        champ_id = ban.get('championId', -1)
                        if champ_id == -1:
                            continue  # Skip empty bans

                        champ_info = ban_champion_map.get(champ_id, {'name': 'Unknown', 'icon_url': None})
                        enriched_bans.append({
                            'champion_id': champ_id,
                            'champion_name': champ_info.get('name', 'Unknown'),
                            'champion_icon': champ_info.get('icon_url'),
                            'pick_turn': ban.get('pickTurn')
                        })

                    bans_data[side] = enriched_bans

            result_matches.append({
                "match_id": match.match_id,
                "game_creation": match.game_creation or 0,  # Already in milliseconds
                "game_duration": match.game_duration or 0,
                "game_version": match.game_version,
                "win": team_won,
                "team_players_count": team_players_count,
                "our_team": our_team_participants,
                "enemy_team": enemy_team_participants,
                "bans": bans_data
            })

        return jsonify({
            "matches": result_matches,
            "total_matches": total_matches
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching team matches: {str(e)}")
        return jsonify({"error": "Failed to fetch team matches", "details": str(e)}), 500


@bp.route("/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    """
    Get overall dashboard statistics

    Returns:
        {
            "total_teams": 5,
            "total_players": 35,
            "total_matches": 150,
            "tournament_matches": 150
        }
    """
    try:
        total_teams = Team.query.count()
        total_players = Player.query.count()

        # Count all matches (tournament + non-tournament if any)
        total_matches = Match.query.count()

        # Count only tournament matches
        tournament_matches = Match.query.filter_by(is_tournament_game=True).count()

        return jsonify({
            "total_teams": total_teams,
            "total_players": total_players,
            "total_matches": total_matches,
            "tournament_matches": tournament_matches
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching dashboard stats: {str(e)}")
        return jsonify({"error": "Failed to fetch dashboard stats"}), 500


@bp.route("/players/<player_id>/matches", methods=["GET"])
def get_player_matches(player_id):
    """
    Get Prime League match history for a specific player

    Query params:
        limit: Number of matches (default: 50)

    Returns:
        {
            "matches": [
                {
                    "match_id": "EUW1_...",
                    "game_creation": 1234567890,
                    "game_duration": 1800,
                    "game_version": "14.24.1",
                    "win": true,
                    "our_team": [...],
                    "enemy_team": [...]
                }
            ]
        }
    """
    player = Player.query.get(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404

    try:
        limit = request.args.get('limit', 50, type=int)

        # Get only TOURNAMENT matches where player participated
        participants = MatchParticipant.query.filter_by(
            player_id=player_id
        ).join(
            Match
        ).filter(
            Match.is_tournament_game == True
        ).order_by(
            Match.game_creation.desc()
        ).limit(limit).all()

        # Enrich champion data
        from app.utils.champion_helper import batch_enrich_champions

        # Optimized: Load all participants for all matches in one query
        match_ids = [p.match_id for p in participants if p.match]
        all_match_participants = MatchParticipant.query.filter(
            MatchParticipant.match_id.in_(match_ids)
        ).order_by(
            MatchParticipant.match_id,
            MatchParticipant.riot_team_id,
            MatchParticipant.participant_id
        ).all()

        # Group participants by match_id
        participants_by_match = {}
        for pt in all_match_participants:
            if pt.match_id not in participants_by_match:
                participants_by_match[pt.match_id] = []
            participants_by_match[pt.match_id].append(pt)

        matches = []
        for p in participants:
            match = p.match
            if not match:
                continue

            # Get participants from pre-loaded data
            all_participants = participants_by_match.get(match.id, [])

            # Enrich all champions in this match
            champion_ids = [pt.champion_id for pt in all_participants]
            champion_data_map = batch_enrich_champions(champion_ids, include_images=True)

            # Find which riot_team_id our player was on
            our_riot_team_id = p.riot_team_id

            # Split into teams
            our_team = []
            enemy_team = []

            for pt in all_participants:
                champ_info = champion_data_map.get(pt.champion_id, {
                    'name': pt.champion_name,
                    'icon_url': None
                })

                participant_data = {
                    "player_id": str(pt.player_id) if pt.player_id else None,
                    "summoner_name": pt.summoner_name or (pt.player.summoner_name if pt.player else "Unknown"),
                    "profile_icon_id": pt.player.profile_icon_id if pt.player else None,
                    "champion_id": pt.champion_id,
                    "champion_name": champ_info.get('name', pt.champion_name),
                    "champion_icon": champ_info.get('icon_url'),
                    "role": pt.team_position or pt.individual_position or pt.role,
                    "riot_team_id": pt.riot_team_id,  # 100=Blue, 200=Red
                    "kills": pt.kills or 0,
                    "deaths": pt.deaths or 0,
                    "assists": pt.assists or 0,
                    "cs": (pt.total_minions_killed or 0) + (pt.neutral_minions_killed or 0),
                    "gold": pt.gold_earned or 0,
                    "damage_dealt": pt.total_damage_dealt_to_champions or 0,
                    "vision_score": pt.vision_score or 0,
                    "items": [
                        pt.item0, pt.item1, pt.item2,
                        pt.item3, pt.item4, pt.item5, pt.item6
                    ],
                    "win": pt.win
                }

                if pt.riot_team_id == our_riot_team_id:
                    our_team.append(participant_data)
                else:
                    enemy_team.append(participant_data)

            # Determine if player won
            win = p.win

            # Get ban data from MatchTeamStats
            from app.models import MatchTeamStats

            team_stats_list = MatchTeamStats.query.filter_by(match_id=match.id).all()
            bans_data = {"blue": [], "red": []}

            for team_stats in team_stats_list:
                side = "blue" if team_stats.riot_team_id == 100 else "red"
                if team_stats.bans:
                    # Enrich ban data with champion names
                    enriched_bans = []
                    ban_champion_ids = [ban.get('championId') for ban in team_stats.bans if ban.get('championId', -1) != -1]
                    ban_champion_map = batch_enrich_champions(ban_champion_ids, include_images=True)

                    for ban in team_stats.bans:
                        champ_id = ban.get('championId', -1)
                        if champ_id == -1:
                            continue  # Skip empty bans

                        champ_info = ban_champion_map.get(champ_id, {'name': 'Unknown', 'icon_url': None})
                        enriched_bans.append({
                            'champion_id': champ_id,
                            'champion_name': champ_info.get('name', 'Unknown'),
                            'champion_icon': champ_info.get('icon_url'),
                            'pick_turn': ban.get('pickTurn')
                        })

                    bans_data[side] = enriched_bans

            matches.append({
                "match_id": match.match_id,
                "game_creation": match.game_creation or 0,
                "game_duration": match.game_duration or 0,
                "game_version": match.game_version,
                "win": win,
                "our_team": our_team,
                "enemy_team": enemy_team,
                "bans": bans_data
            })

        return jsonify({"matches": matches}), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching player matches: {str(e)}")
        return jsonify({"error": "Failed to fetch player matches", "details": str(e)}), 500


@bp.route("/teams/<team_id>/refresh", methods=["POST"])
def trigger_team_refresh(team_id):
    """
    Trigger a non-blocking team data refresh.
    Returns immediately after starting the refresh in background.
    
    Returns:
        {
            "message": "Refresh started",
            "status": "running"
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404
    
    try:
        from app.services.refresh_scheduler import RefreshScheduler
        result = RefreshScheduler.refresh_single_team(team_id, current_app._get_current_object())
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Error triggering team refresh: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/teams/<team_id>/refresh-status", methods=["GET"])
def get_team_refresh_status(team_id):
    """
    Get current refresh status for a team.
    Used by frontend to poll refresh progress.

    Returns:
        {
            "team_id": "uuid",
            "status": "running|completed|failed|idle",
            "phase": "collecting_matches|filtering_matches|...",
            "progress_percent": 45,
            "started_at": "2025-01-03T10:30:00",
            "completed_at": null,
            "error_message": null
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    try:
        from app.models import TeamRefreshStatus
        refresh_status = TeamRefreshStatus.get_status(team_id)
        return jsonify(refresh_status.to_dict()), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching refresh status: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/teams/<team_id>/progress-stream", methods=["GET"])
def stream_team_refresh_progress(team_id):
    """
    Server-Sent Events (SSE) endpoint for streaming real-time refresh progress.
    Frontend connects to this endpoint and receives progress updates.

    Event types sent:
        - 'progress': Regular progress update with phase and percentage
        - 'complete': Refresh completed successfully
        - 'error': Refresh failed with error message
        - 'heartbeat': Keep-alive ping every 15 seconds

    Returns:
        SSE stream with real-time updates
    """
    from flask import Response, stream_with_context
    import json
    import time

    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    def generate():
        from app.models import TeamRefreshStatus

        last_progress = -1
        last_phase = None
        refresh_completed = False
        heartbeat_counter = 0

        current_app.logger.info(f"📡 SSE stream started for team {team_id}")

        try:
            while not refresh_completed:
                try:
                    # Get current status - FORCE FRESH READ from database
                    # Expire all cached instances to prevent stale data
                    db.session.expire_all()
                    status = TeamRefreshStatus.get_status(team_id)
                    current_progress = status.progress_percent or 0
                    current_phase = status.phase or 'idle'
                    current_status = status.status

                    # Map phase to user-friendly message
                    phase_messages = {
                        'collecting_matches': 'Sammle Tournament Games...',
                        'filtering_matches': 'Filtere bereits vorhandene Games...',
                        'fetching_matches': 'Lade neue Games von Riot API...',
                        'linking_data': 'Verknüpfe Games mit Spielern...',
                        'calculating_stats': 'Berechne Team-Statistiken...',
                        'updating_ranks': 'Aktualisiere Spieler-Ränge...',
                        'player_details': 'Lade individuelle Spieler-Daten...',
                        'completed': 'Abgeschlossen!'
                    }

                    # Check for rate limit - always send updates during rate limit
                    is_rate_limited = current_phase and current_phase.startswith('rate_limited_')

                    # Send progress event if:
                    # 1. Status changed (normal case), OR
                    # 2. Currently rate limited (send every iteration to keep showing wait status), OR
                    # 3. Every 2 seconds to ensure frontend always gets updates (prevents "stuck" UI)
                    send_progress_update = (
                        (current_progress != last_progress or current_phase != last_phase) or
                        is_rate_limited or
                        heartbeat_counter % 2 == 0  # Every 2 seconds (since we poll every 1s)
                    )

                    if send_progress_update:
                        last_progress = current_progress
                        last_phase = current_phase

                        if is_rate_limited:
                            # Extract wait time from phase like "rate_limited_52s"
                            wait_time = current_phase.replace('rate_limited_', '').replace('s', '')
                            message = f'⏳ Riot API Rate Limit - Warte {wait_time}s...'

                            event_data = {
                                'type': 'progress',
                                'data': {
                                    'step': current_phase,
                                    'message': message,
                                    'progress_percent': current_progress,
                                    'is_rate_limited': True,
                                    'wait_seconds': int(wait_time) if wait_time.isdigit() else 0
                                }
                            }
                        else:
                            message = phase_messages.get(current_phase, current_phase)

                            event_data = {
                                'type': 'progress',
                                'data': {
                                    'step': current_phase,
                                    'message': message,
                                    'progress_percent': current_progress
                                }
                            }

                        yield f"data: {json.dumps(event_data)}\n\n"

                    # Check if refresh completed
                    if current_status == 'completed':
                        current_app.logger.info(f"✅ SSE: Team refresh completed for {team_id}")

                        # Always send a final 100% progress update before complete event
                        final_progress = {
                            'type': 'progress',
                            'data': {
                                'step': 'completed',
                                'message': 'Abgeschlossen!',
                                'progress_percent': 100
                            }
                        }
                        yield f"data: {json.dumps(final_progress)}\n\n"

                        # Send complete event MULTIPLE TIMES for robustness
                        # (in case of brief connection issues)
                        complete_event = {'type': 'complete', 'data': {'message': 'Daten erfolgreich aktualisiert!'}}
                        for i in range(3):
                            current_app.logger.info(f"📤 Sending complete event {i+1}/3")
                            yield f"data: {json.dumps(complete_event)}\n\n"
                            if i < 2:  # Don't sleep after last one
                                time.sleep(1)

                        refresh_completed = True
                        break

                    # Check if refresh failed
                    elif current_status == 'failed':
                        error_msg = status.error_message or 'Unbekannter Fehler'
                        current_app.logger.error(f"❌ SSE: Team refresh failed for {team_id}: {error_msg}")
                        yield f"data: {json.dumps({'type': 'error', 'data': {'message': error_msg}})}\n\n"
                        refresh_completed = True
                        break

                    # Send heartbeat every 10 seconds to keep connection alive
                    heartbeat_counter += 1
                    if heartbeat_counter >= 10:  # 10 iterations * 1 second = 10 seconds
                        current_app.logger.debug(f"💓 SSE heartbeat for team {team_id} (status: {current_status}, phase: {current_phase}, progress: {current_progress}%)")
                        yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
                        heartbeat_counter = 0

                except Exception as e:
                    current_app.logger.error(f"Error in SSE stream: {str(e)}")
                    yield f"data: {json.dumps({'type': 'error', 'data': {'message': f'Stream error: {str(e)}'}})}\n\n"
                    break

                # Poll every 1 second
                time.sleep(1)

        except GeneratorExit:
            current_app.logger.info(f"🔌 SSE stream closed by client for team {team_id}")
        except Exception as e:
            current_app.logger.error(f"❌ SSE stream error for team {team_id}: {str(e)}")

        current_app.logger.info(f"📡 SSE stream ended for team {team_id}")

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',  # Disable nginx buffering
            'Connection': 'keep-alive'
        }
    )


@bp.route("/admin/trigger-nightly-refresh", methods=["POST"])
def trigger_nightly_refresh():
    """
    ADMIN ENDPOINT: Manually trigger the nightly refresh for all teams.
    Useful for testing the scheduler logic without waiting until 4 AM.

    Returns:
        {
            "message": "Nightly refresh triggered for N teams",
            "teams_count": N
        }
    """
    try:
        from app.services.refresh_scheduler import RefreshScheduler

        teams = Team.query.all()
        teams_count = len(teams)

        if teams_count == 0:
            return jsonify({"message": "No teams found", "teams_count": 0}), 200

        # Trigger refresh in background (same logic as nightly job)
        RefreshScheduler.refresh_all_teams(current_app._get_current_object())

        return jsonify({
            "message": f"Nightly refresh triggered for {teams_count} teams",
            "teams_count": teams_count
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error triggering nightly refresh: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route("/admin/scheduler-status", methods=["GET"])
def get_scheduler_status():
    """
    ADMIN ENDPOINT: Get status of scheduled jobs

    Returns:
        {
            "scheduler_running": true,
            "jobs": [
                {
                    "id": "nightly_team_refresh",
                    "name": "Nightly Team Data Refresh",
                    "next_run_time": "2025-01-04T04:00:00"
                }
            ]
        }
    """
    try:
        from app.scheduler_config import get_scheduler

        scheduler = get_scheduler()
        jobs_info = []

        for job in scheduler.get_jobs():
            jobs_info.append({
                "id": job.id,
                "name": job.name,
                "next_run_time": str(job.next_run_time) if job.next_run_time else None
            })

        return jsonify({
            "scheduler_running": scheduler.running,
            "jobs": jobs_info
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching scheduler status: {str(e)}")
        return jsonify({"error": str(e)}), 500
