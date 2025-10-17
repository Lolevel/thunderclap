"""
Scouting routes (predictions, reports)
"""
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from app.models import Team, TeamStats
from app.services import LineupPredictor, DraftAnalyzer, StatsCalculator

bp = Blueprint('scouting', __name__, url_prefix='/api/scout')


@bp.route('/predict-lineup', methods=['POST'])
def predict_lineup():
    """
    Predict lineup for a team

    Request body:
        {
            "team_id": "uuid",
            "match_date": "2024-10-16" (optional),
            "save": true (optional, save to database)
        }

    Returns:
        {
            "team_id": "uuid",
            "predicted_lineup": {
                "TOP": {"player_id": "...", "player_name": "...", "confidence": 85.5},
                ...
            },
            "overall_confidence": 82.3,
            "prediction_factors": {...}
        }
    """
    data = request.get_json()

    if not data or 'team_id' not in data:
        return jsonify({'error': 'team_id is required'}), 400

    team_id = data['team_id']
    match_date_str = data.get('match_date')
    save = data.get('save', False)

    team = Team.query.get(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    # Parse match date
    match_date = None
    if match_date_str:
        try:
            match_date = datetime.fromisoformat(match_date_str)
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DD)'}), 400

    try:
        predictor = LineupPredictor()
        prediction = predictor.predict_lineup(team, match_date)

        if not prediction:
            return jsonify({'error': 'Could not predict lineup for this team'}), 404

        # Optionally save prediction
        if save:
            saved_prediction = predictor.save_prediction(team, prediction)
            prediction['prediction_id'] = str(saved_prediction.id)

        return jsonify(prediction), 200

    except Exception as e:
        current_app.logger.error(f'Error predicting lineup for team {team_id}: {e}')
        return jsonify({'error': 'Failed to predict lineup', 'details': str(e)}), 500


@bp.route('/report/<team_id>', methods=['GET'])
def generate_report(team_id):
    """
    Generate comprehensive scouting report for a team

    Returns:
        {
            "team_id": "uuid",
            "report": {
                "predicted_lineup": {...},
                "team_stats": {...},
                "draft_patterns": {...},
                "suggested_bans": [...],
                "key_threats": [...]
            }
        }
    """
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    try:
        # Generate comprehensive report
        predictor = LineupPredictor()
        analyzer = DraftAnalyzer()

        lineup_prediction = predictor.predict_lineup(team)
        draft_patterns = analyzer.analyze_team_draft_patterns(team)
        suggested_bans = analyzer.suggest_bans_against_team(team)

        # Get team stats
        team_stats = TeamStats.query.filter_by(
            team_id=team_id,
            stat_type='tournament'
        ).first()

        report = {
            'team_id': str(team_id),
            'team_name': team.name,
            'generated_at': datetime.utcnow().isoformat(),
            'predicted_lineup': lineup_prediction,
            'team_stats': team_stats.to_dict() if team_stats else None,
            'draft_patterns': draft_patterns,
            'suggested_bans': suggested_bans,
            'key_threats': []  # TODO: Implement threat analysis
        }

        return jsonify(report), 200

    except Exception as e:
        current_app.logger.error(f'Error generating report for team {team_id}: {e}')
        return jsonify({'error': 'Failed to generate report', 'details': str(e)}), 500


@bp.route('/draft-helper', methods=['POST'])
def draft_helper():
    """
    Get draft suggestions

    Request body:
        {
            "opponent_team_id": "uuid",
            "current_bans": ["Ksante", "Viego"],
            "current_picks": [],
            "our_side": "blue"
        }

    Returns:
        {
            "suggested_bans": [...],
            "draft_analysis": {...}
        }
    """
    data = request.get_json()

    if not data or 'opponent_team_id' not in data:
        return jsonify({'error': 'opponent_team_id is required'}), 400

    opponent_team_id = data['opponent_team_id']
    opponent_team = Team.query.get(opponent_team_id)

    if not opponent_team:
        return jsonify({'error': 'Opponent team not found'}), 404

    try:
        analyzer = DraftAnalyzer()
        suggested_bans = analyzer.suggest_bans_against_team(opponent_team)
        draft_analysis = analyzer.analyze_team_draft_patterns(opponent_team)

        return jsonify({
            'opponent_team_id': str(opponent_team_id),
            'opponent_team_name': opponent_team.name,
            'suggested_bans': suggested_bans,
            'draft_analysis': draft_analysis
        }), 200

    except Exception as e:
        current_app.logger.error(f'Error in draft helper: {e}')
        return jsonify({'error': 'Failed to analyze draft', 'details': str(e)}), 500
