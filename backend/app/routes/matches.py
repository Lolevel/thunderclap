"""
Match routes
Best Practice: Separate routes for different resources
"""
from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models import Team, Match
from app.services import MatchFetcher
from app.middleware.auth import require_auth

bp = Blueprint('matches', __name__, url_prefix='/api/matches')

# Apply authentication to all routes
@bp.before_request
@require_auth
def before_request():
    pass


@bp.route('/fetch/team/<team_id>', methods=['POST'])
def fetch_team_matches(team_id):
    """
    Fetch matches for a team

    Request body:
        {
            "count_per_player": 50 (optional, default: 50),
            "tournament_only": false (optional, default: false),
            "fetch_timelines": false (optional, default: false)
        }

    Returns:
        {
            "team_id": "uuid",
            "matches_fetched": 42,
            "timelines_fetched": 10 (if fetch_timelines=true),
            "message": "Matches fetched successfully"
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    data = request.get_json() or {}
    count_per_player = data.get('count_per_player', 50)
    tournament_only = data.get('tournament_only', False)
    fetch_timelines = data.get('fetch_timelines', False)

    try:
        fetcher = MatchFetcher()

        # Fetch matches
        if tournament_only:
            matches_fetched = fetcher.fetch_tournament_games_only(team, count_per_player)
        else:
            matches_fetched = fetcher.fetch_team_matches(team, count_per_player)

        result = {
            'team_id': str(team_id),
            'team_name': team.name,
            'matches_fetched': matches_fetched,
            'message': f'Fetched {matches_fetched} matches for {team.name}'
        }

        # Optionally fetch timelines for recent tournament games
        if fetch_timelines and matches_fetched > 0:
            timelines_fetched = fetcher.fetch_timeline_for_recent_tournament_games(team, limit=10)
            result['timelines_fetched'] = timelines_fetched
            result['message'] += f' and {timelines_fetched} timelines'

        return jsonify(result), 200

    except Exception as e:
        current_app.logger.error(f'Error fetching matches for team {team_id}: {e}')
        return jsonify({'error': 'Failed to fetch matches', 'details': str(e)}), 500


@bp.route('/tournament/<team_id>', methods=['GET'])
def get_tournament_matches(team_id):
    """
    Get tournament matches for a team

    Query parameters:
        - limit: Max matches to return (default: 20)

    Returns:
        {
            "team_id": "uuid",
            "tournament_matches": [...]
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    limit = request.args.get('limit', 20, type=int)

    # Get tournament matches where team participated
    tournament_matches = Match.query.filter(
        Match.is_tournament_game == True,
        db.or_(
            Match.winning_team_id == team.id,
            Match.losing_team_id == team.id
        )
    ).order_by(Match.game_creation.desc()).limit(limit).all()

    return jsonify({
        'team_id': str(team_id),
        'team_name': team.name,
        'tournament_matches': [match.to_dict() for match in tournament_matches],
        'count': len(tournament_matches)
    }), 200


@bp.route('/<match_id>', methods=['GET'])
def get_match(match_id):
    """
    Get match details with participants

    Returns:
        {
            "match": {...},
            "participants": [...],
            "timeline": {...} (if available)
        }
    """
    # Try UUID first, then match_id string
    match = Match.query.filter(
        db.or_(
            Match.id == match_id,
            Match.match_id == match_id
        )
    ).first()

    if not match:
        return jsonify({'error': 'Match not found'}), 404

    result = {
        'match': match.to_dict(),
        'participants': [p.to_dict() for p in match.participants]
    }

    if match.timeline_data:
        result['timeline'] = match.timeline_data.to_dict()

    return jsonify(result), 200
