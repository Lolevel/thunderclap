"""
Player routes
"""
from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models import Player, PlayerChampion
from app.services import RiotAPIClient, MatchFetcher, StatsCalculator
from app.utils import parse_opgg_url
from app.middleware.auth import require_auth

bp = Blueprint('players', __name__, url_prefix='/api/players')

# TODO: Authentication temporarily disabled for development
# Apply authentication to all routes
# @bp.before_request
# @require_auth
# def before_request():
#     pass


@bp.route('/<player_id>', methods=['GET'])
def get_player(player_id):
    """
    Get player details

    Returns:
        {
            "id": "uuid",
            "summoner_name": "PlayerName",
            "current_rank": "DIAMOND I",
            ...
        }
    """
    player = Player.query.get(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    return jsonify(player.to_dict()), 200


@bp.route('/<player_id>/champions', methods=['GET'])
def get_player_champions(player_id):
    """
    Get player champion pool

    Query parameters:
        - min_games: Minimum games played (default: 0)
        - limit: Max champions to return (default: 20)

    Returns:
        {
            "player_id": "uuid",
            "champions": [
                {
                    "champion_name": "Azir",
                    "games_played_recent": 12,
                    "winrate_recent": 66.67,
                    ...
                }
            ]
        }
    """
    player = Player.query.get(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    min_games = request.args.get('min_games', 0, type=int)
    limit = request.args.get('limit', 20, type=int)
    game_type = request.args.get('game_type', 'tournament', type=str)  # 'tournament' or 'soloqueue'

    query = PlayerChampion.query.filter_by(player_id=player_id, game_type=game_type)

    if min_games > 0:
        query = query.filter(PlayerChampion.games_played >= min_games)

    champions = query.order_by(
        PlayerChampion.games_played.desc()
    ).limit(limit).all()

    return jsonify({
        'player_id': str(player_id),
        'summoner_name': player.summoner_name,
        'champions': [champ.to_dict() for champ in champions]
    }), 200


@bp.route('/', methods=['GET'])
def list_players():
    """
    List all players

    Query parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20)

    Returns:
        {
            "players": [...],
            "total": 42,
            "page": 1,
            "per_page": 20
        }
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config['ITEMS_PER_PAGE'], type=int)

    pagination = Player.query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'players': [player.to_dict() for player in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    }), 200


@bp.route('/import', methods=['POST'])
def import_player():
    """
    Import a single player via OP.GG URL or summoner name

    Request body:
        {
            "opgg_url": "https://op.gg/summoners/euw/Faker-KR1"
            OR
            "summoner_name": "Faker#KR1"
        }

    Returns:
        {
            "player": {...},
            "matches_fetched": 50,
            "stats_calculated": true
        }
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    summoner_names = []

    # Parse from OP.GG URL if provided
    if 'opgg_url' in data:
        opgg_url = data['opgg_url']
        summoner_names = parse_opgg_url(opgg_url)

        if not summoner_names:
            return jsonify({'error': 'Invalid OP.GG URL'}), 400

    # Or use summoner name directly
    elif 'summoner_name' in data:
        summoner_names = [data['summoner_name']]
    else:
        return jsonify({'error': 'Either opgg_url or summoner_name required'}), 400

    # Only process first summoner (for single player import)
    summoner_name = summoner_names[0]

    try:
        # Initialize Riot API client
        riot_client = RiotAPIClient()

        # Check if player already exists
        existing_player = Player.query.filter_by(summoner_name=summoner_name).first()

        if existing_player:
            return jsonify({
                'error': 'Player already exists',
                'player': existing_player.to_dict()
            }), 409

        # Fetch player data from Riot API
        current_app.logger.info(f"Fetching player data for: {summoner_name}")

        # Parse Riot ID (gameName#tagLine)
        if '#' in summoner_name:
            game_name, tag_line = summoner_name.split('#', 1)
        else:
            # Fallback: assume EUW tagline if not provided
            game_name = summoner_name
            tag_line = 'EUW'
            current_app.logger.warning(f'No tagline found for {summoner_name}, assuming #{tag_line}')

        # Get PUUID from Riot ID using ACCOUNT-V1
        account_data = riot_client.get_account_by_riot_id(game_name, tag_line)
        if not account_data:
            return jsonify({'error': f'Could not find summoner: {summoner_name}'}), 404

        puuid = account_data.get('puuid')
        if not puuid:
            return jsonify({'error': f'No PUUID in account data for: {summoner_name}'}), 500

        # Get summoner data from PUUID using SUMMONER-V4
        summoner_data = riot_client.get_summoner_by_puuid(puuid)
        if not summoner_data:
            return jsonify({'error': f'Could not fetch summoner data for: {summoner_name}'}), 404

        # Extract display name
        display_name = f"{account_data.get('gameName')}#{account_data.get('tagLine')}"

        # Get ranked data (if summoner_id available)
        summoner_id = summoner_data.get('id')
        if not summoner_id:
            current_app.logger.warning(f'Summoner ID missing for {display_name} (Riot API bug)')

        ranked_data = None
        if summoner_id:
            ranked_data = riot_client.get_league_entries(summoner_id)

        # Determine current rank
        current_rank = None
        if ranked_data:
            for entry in ranked_data:
                if entry.get('queueType') == 'RANKED_SOLO_5x5':
                    tier = entry.get('tier', '')
                    rank = entry.get('rank', '')
                    current_rank = f"{tier} {rank}"
                    break

        # Create player
        player = Player(
            puuid=puuid,
            summoner_name=display_name,
            summoner_id=summoner_id,
            profile_icon_id=summoner_data.get('profileIconId'),
            current_rank=current_rank,
            region=current_app.config['RIOT_PLATFORM']
        )

        db.session.add(player)
        db.session.commit()

        current_app.logger.info(f"Player created: {player.summoner_name} (ID: {player.id})")

        # Fetch tournament games for this player
        from app.services.player_match_service import PlayerMatchService
        player_match_service = PlayerMatchService(riot_client)
        match_result = player_match_service.fetch_all_player_tournament_games(player)

        matches_fetched = match_result.get('new_games', 0)
        current_app.logger.info(f"Fetched {matches_fetched} new tournament games for {player.summoner_name}")

        # Calculate stats for this player
        stats_calculator = StatsCalculator()
        stats_calculator.calculate_player_champion_stats(player)

        # Detect and assign main role
        main_role = stats_calculator.detect_player_main_role(player)
        if main_role:
            player.main_role = main_role
            db.session.commit()

        return jsonify({
            'player': player.to_dict(),
            'matches_fetched': matches_fetched,
            'stats_calculated': True,
            'main_role': main_role
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to import player: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to import player: {str(e)}'}), 500


@bp.route('/<player_id>', methods=['DELETE'])
def delete_player(player_id):
    """
    Delete a player from the database
    This will remove all associated data (roster entries, match participants, champion stats)

    Returns:
        {
            "message": "Player deleted successfully"
        }
    """
    player = Player.query.get(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    try:
        # Delete will cascade to roster entries, match participants, and champion stats
        # due to foreign key constraints with CASCADE
        db.session.delete(player)
        db.session.commit()

        current_app.logger.info(f"Player deleted: {player.summoner_name} (ID: {player_id})")

        return jsonify({
            'message': 'Player deleted successfully',
            'player_name': player.summoner_name
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to delete player: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to delete player: {str(e)}'}), 500


@bp.route('/<player_id>/tournament-games/fetch', methods=['POST'])
def fetch_player_tournament_games(player_id):
    """
    Fetch ALL tournament games for a specific player
    This is separate from team-based game tracking

    POST /api/players/<player_id>/tournament-games/fetch

    Query parameters:
        - max_games: Maximum games to fetch (default: 100)
        - force_refresh: Re-fetch existing games (default: false)

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
    player = Player.query.get(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    max_games = request.args.get('max_games', 100, type=int)
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'

    try:
        from app.services.player_match_service import PlayerMatchService
        from app.services import RiotAPIClient

        riot_api = RiotAPIClient()
        service = PlayerMatchService(riot_api)

        stats = service.fetch_all_player_tournament_games(
            player=player,
            max_games=max_games,
            force_refresh=force_refresh
        )

        return jsonify(stats), 200

    except Exception as e:
        current_app.logger.error(f"Failed to fetch tournament games for player {player_id}: {str(e)}")
        return jsonify({'error': f'Failed to fetch tournament games: {str(e)}'}), 500


@bp.route('/<player_id>/tournament-stats', methods=['GET'])
def get_player_tournament_stats(player_id):
    """
    Get comprehensive tournament statistics for a player
    Includes ALL tournament games, not just team games

    GET /api/players/<player_id>/tournament-stats

    Query parameters:
        - days: Days to analyze (default: 365)

    Returns:
        {
            'total_games': int,
            'wins': int,
            'losses': int,
            'winrate': float,
            'kda': float,
            'champion_pool': List[Dict]
        }
    """
    player = Player.query.get(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    days = request.args.get('days', 365, type=int)

    try:
        from app.services.player_match_service import PlayerMatchService
        from app.services import RiotAPIClient

        riot_api = RiotAPIClient()
        service = PlayerMatchService(riot_api)

        stats = service.get_player_tournament_statistics(player, days=days)

        return jsonify(stats), 200

    except Exception as e:
        current_app.logger.error(f"Failed to get tournament stats for player {player_id}: {str(e)}")
        return jsonify({'error': f'Failed to get tournament stats: {str(e)}'}), 500
