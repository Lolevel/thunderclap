"""
Statistics routes
Best Practice: Separate routes for different concerns
"""
from flask import Blueprint, request, jsonify, current_app
from app.models import Team, TeamStats
from app.services import StatsCalculator

bp = Blueprint('stats', __name__, url_prefix='/api/stats')


@bp.route('/team/<team_id>/calculate', methods=['POST'])
def calculate_team_stats(team_id):
    """
    Calculate statistics for a team

    Request body:
        {
            "stat_type": "tournament" (optional, default: both),
            "days": 30 (optional, for recent stats)
        }

    Returns:
        {
            "team_id": "uuid",
            "stats_calculated": [...],
            "champions_updated": 42,
            "players_processed": 7
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    data = request.get_json() or {}
    stat_type = data.get('stat_type', 'both')
    days = data.get('days', 30)

    try:
        calculator = StatsCalculator()

        if stat_type == 'both' or not stat_type:
            # Calculate all stats
            result = calculator.calculate_all_stats_for_team(team, days)
        elif stat_type in ['tournament', 'all']:
            # Calculate specific stat type
            team_stats = calculator.calculate_team_stats(team, stat_type)
            result = {
                'team_id': str(team_id),
                'team_name': team.name,
                'stats_calculated': [f'{stat_type}_stats'],
                'stats': team_stats.to_dict() if team_stats else None
            }
        else:
            return jsonify({'error': 'Invalid stat_type. Use "tournament", "all", or "both"'}), 400

        return jsonify(result), 200

    except Exception as e:
        current_app.logger.error(f'Error calculating stats for team {team_id}: {e}')
        return jsonify({'error': 'Failed to calculate stats', 'details': str(e)}), 500


@bp.route('/team/<team_id>', methods=['GET'])
def get_team_stats(team_id):
    """
    Get team statistics

    Query parameters:
        - stat_type: 'tournament' or 'all' (default: tournament)

    Returns:
        {
            "team_id": "uuid",
            "stats": {...}
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    stat_type = request.args.get('stat_type', 'tournament')

    team_stats = TeamStats.query.filter_by(
        team_id=team_id,
        stat_type=stat_type
    ).first()

    if not team_stats:
        return jsonify({
            'error': f'No {stat_type} stats found for this team',
            'hint': f'Run POST /api/stats/team/{team_id}/calculate first'
        }), 404

    return jsonify({
        'team_id': str(team_id),
        'team_name': team.name,
        'stat_type': stat_type,
        'stats': team_stats.to_dict()
    }), 200
