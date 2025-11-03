"""
Game Prep API Routes - Phase-based Draft Preparation
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models.game_prep import GamePrepRoster, DraftScenario, GamePrepComment
from app.middleware.auth import require_auth
import random

bp = Blueprint('game_prep', __name__, url_prefix='/api/game-prep')

# Jungle monster names for random roster/scenario names
JUNGLE_MONSTERS = [
    'Krugs', 'Raptors', 'Wolves', 'Gromp', 'Scuttle',
    'Red Buff', 'Blue Buff', 'Baron', 'Drake', 'Herald',
    'Elder', 'Grubs', 'Murk Wolves', 'Crimson Raptors'
]


def get_random_monster_name(existing_names):
    """Get a random unused monster name"""
    available = [name for name in JUNGLE_MONSTERS if name not in existing_names]
    return random.choice(available) if available else f"Monster {random.randint(1, 999)}"


# ============================================================
# ROSTERS (Phase 1)
# ============================================================

@bp.route('/teams/<team_id>/rosters', methods=['GET'])
def get_rosters(team_id):
    """Get all rosters for a team"""
    rosters = GamePrepRoster.query.filter_by(team_id=team_id).order_by(GamePrepRoster.display_order).all()
    return jsonify({
        'rosters': [r.to_dict() for r in rosters],
        'locked_roster': next((r.to_dict() for r in rosters if r.is_locked), None)
    })


@bp.route('/teams/<team_id>/rosters', methods=['POST'])
def create_roster(team_id):
    """Create a new roster"""
    data = request.json

    # Check if any roster is locked
    locked_roster = GamePrepRoster.query.filter_by(team_id=team_id, is_locked=True).first()
    if locked_roster:
        return jsonify({'error': 'Cannot create roster while another is locked'}), 400

    # Validate roster has 5 players
    roster_data = data.get('roster', [])
    if len(roster_data) != 5:
        return jsonify({'error': 'Roster must have exactly 5 players'}), 400

    # Get existing roster names
    existing = GamePrepRoster.query.filter_by(team_id=team_id).all()
    existing_names = [r.name for r in existing]

    # Create roster
    roster = GamePrepRoster(
        team_id=team_id,
        name=data.get('name') or get_random_monster_name(existing_names),
        roster=roster_data,
        display_order=data.get('display_order', len(existing))
    )

    db.session.add(roster)
    db.session.commit()

    return jsonify(roster.to_dict()), 201


@bp.route('/rosters/<roster_id>', methods=['PUT'])
def update_roster(roster_id):
    """Update a roster"""
    roster = GamePrepRoster.query.get_or_404(roster_id)

    # Cannot update locked roster
    if roster.is_locked:
        return jsonify({'error': 'Cannot update locked roster'}), 400

    data = request.json

    # Update fields
    if 'name' in data:
        roster.name = data['name']
    if 'roster' in data:
        if len(data['roster']) != 5:
            return jsonify({'error': 'Roster must have exactly 5 players'}), 400
        roster.roster = data['roster']
    if 'display_order' in data:
        roster.display_order = data['display_order']

    db.session.commit()
    return jsonify(roster.to_dict())


@bp.route('/rosters/<roster_id>', methods=['DELETE'])
def delete_roster(roster_id):
    """Delete a roster"""
    roster = GamePrepRoster.query.get_or_404(roster_id)

    # Cannot delete locked roster
    if roster.is_locked:
        return jsonify({'error': 'Cannot delete locked roster. Unlock first.'}), 400

    db.session.delete(roster)
    db.session.commit()
    return '', 204


@bp.route('/rosters/<roster_id>/lock', methods=['POST'])
def lock_roster(roster_id):
    """Lock a roster"""
    roster = GamePrepRoster.query.get_or_404(roster_id)

    # Check if another roster is already locked
    locked = GamePrepRoster.query.filter_by(team_id=roster.team_id, is_locked=True).first()
    if locked and str(locked.id) != roster_id:
        return jsonify({'error': f'Roster "{locked.name}" is already locked'}), 400

    username = request.json.get('username', 'System')
    roster.lock(username)
    db.session.commit()

    return jsonify(roster.to_dict())


@bp.route('/rosters/<roster_id>/unlock', methods=['POST'])
def unlock_roster(roster_id):
    """Unlock a roster"""
    roster = GamePrepRoster.query.get_or_404(roster_id)
    roster.unlock()
    db.session.commit()

    return jsonify(roster.to_dict())


# ============================================================
# SCENARIOS (Phase 2)
# ============================================================

@bp.route('/rosters/<roster_id>/scenarios', methods=['GET'])
def get_scenarios(roster_id):
    """Get all scenarios for a roster"""
    scenarios = DraftScenario.query.filter_by(roster_id=roster_id).order_by(DraftScenario.display_order).all()
    return jsonify([s.to_dict() for s in scenarios])


@bp.route('/rosters/<roster_id>/scenarios', methods=['POST'])
def create_scenario(roster_id):
    """Create a new scenario"""
    roster = GamePrepRoster.query.get_or_404(roster_id)
    data = request.json

    # Get existing scenario names for this roster
    existing = DraftScenario.query.filter_by(roster_id=roster_id).all()
    existing_names = [s.name for s in existing]

    scenario = DraftScenario(
        team_id=roster.team_id,
        roster_id=roster_id,
        name=data.get('name') or get_random_monster_name(existing_names),
        side=data.get('side', 'blue'),
        blue_bans=data.get('blue_bans', []),
        red_bans=data.get('red_bans', []),
        blue_picks=data.get('blue_picks', []),
        red_picks=data.get('red_picks', []),
        display_order=data.get('display_order', len(existing))
    )

    db.session.add(scenario)
    db.session.commit()

    return jsonify(scenario.to_dict()), 201


@bp.route('/scenarios/<scenario_id>', methods=['PUT'])
def update_scenario(scenario_id):
    """Update a scenario"""
    scenario = DraftScenario.query.get_or_404(scenario_id)
    data = request.json

    # Update fields
    if 'name' in data:
        scenario.name = data['name']
    if 'side' in data:
        scenario.side = data['side']
    if 'blue_bans' in data:
        scenario.blue_bans = data['blue_bans']
    if 'red_bans' in data:
        scenario.red_bans = data['red_bans']
    if 'blue_picks' in data:
        scenario.blue_picks = data['blue_picks']
    if 'red_picks' in data:
        scenario.red_picks = data['red_picks']
    if 'display_order' in data:
        scenario.display_order = data['display_order']

    db.session.commit()
    return jsonify(scenario.to_dict())


@bp.route('/scenarios/<scenario_id>', methods=['DELETE'])
def delete_scenario(scenario_id):
    """Delete a scenario"""
    scenario = DraftScenario.query.get_or_404(scenario_id)
    db.session.delete(scenario)
    db.session.commit()
    return '', 204


# ============================================================
# COMMENTS (3 Levels)
# ============================================================

@bp.route('/teams/<team_id>/comments', methods=['GET'])
def get_comments(team_id):
    """Get all comments for a team (optionally filtered by level/roster/scenario)"""
    level = request.args.get('level')
    roster_id = request.args.get('roster_id')
    scenario_id = request.args.get('scenario_id')

    query = GamePrepComment.query.filter_by(team_id=team_id)

    if level:
        query = query.filter_by(level=level)
    if roster_id:
        query = query.filter_by(roster_id=roster_id)
    if scenario_id:
        query = query.filter_by(scenario_id=scenario_id)

    comments = query.order_by(GamePrepComment.created_at.desc()).all()
    return jsonify([c.to_dict() for c in comments])


@bp.route('/teams/<team_id>/comments', methods=['POST'])
def create_comment(team_id):
    """Create a new comment"""
    data = request.json

    level = data.get('level')
    if level not in ['global', 'roster', 'scenario']:
        return jsonify({'error': 'Invalid comment level'}), 400

    # Validate references based on level
    roster_id = data.get('roster_id')
    scenario_id = data.get('scenario_id')

    if level == 'global' and (roster_id or scenario_id):
        return jsonify({'error': 'Global comments cannot have roster/scenario references'}), 400
    if level == 'roster' and not roster_id:
        return jsonify({'error': 'Roster comments must have roster_id'}), 400
    if level == 'scenario' and not scenario_id:
        return jsonify({'error': 'Scenario comments must have scenario_id'}), 400

    comment = GamePrepComment(
        team_id=team_id,
        level=level,
        roster_id=roster_id,
        scenario_id=scenario_id,
        content=data.get('content', ''),
        author=data.get('author', 'Anonymous')
    )

    db.session.add(comment)
    db.session.commit()

    return jsonify(comment.to_dict()), 201


@bp.route('/comments/<comment_id>', methods=['PUT'])
def update_comment(comment_id):
    """Update a comment"""
    comment = GamePrepComment.query.get_or_404(comment_id)
    data = request.json

    if 'content' in data:
        comment.content = data['content']

    db.session.commit()
    return jsonify(comment.to_dict())


@bp.route('/comments/<comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    """Delete a comment"""
    comment = GamePrepComment.query.get_or_404(comment_id)
    db.session.delete(comment)
    db.session.commit()
    return '', 204
