"""
Champions API Routes
Endpoints for champion data management
"""

from flask import Blueprint, jsonify, request
from app.utils.community_dragon import sync_champions_from_community_dragon, get_champion_by_id
from app.models.champion import Champion
from app.utils.patch_tracker import get_current_patch
from app.middleware.auth import require_auth
import logging

logger = logging.getLogger(__name__)

champions_bp = Blueprint('champions', __name__, url_prefix='/api/champions')

# TODO: Authentication temporarily disabled for development
# Apply authentication to all routes
# @champions_bp.before_request
# @require_auth
# def before_request():
#     pass


@champions_bp.route('/sync', methods=['POST'])
def sync_champions():
    """
    Sync all champions from Community Dragon API to database

    POST /api/champions/sync

    Returns:
        {
            'success': bool,
            'stats': {
                'total': int,
                'created': int,
                'updated': int,
                'errors': List[str]
            }
        }
    """
    logger.info("Starting champion sync from Community Dragon")

    try:
        stats = sync_champions_from_community_dragon()

        return jsonify({
            'success': len(stats['errors']) == 0,
            'stats': stats
        }), 200

    except Exception as e:
        logger.error(f"Champion sync failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@champions_bp.route('/', methods=['GET'])
def get_all_champions():
    """
    Get all champions from database

    GET /api/champions

    Query params:
        - search: Filter by name (optional)
        - limit: Max results (default: 200)

    Returns:
        {
            'total': int,
            'champions': List[Champion]
        }
    """
    search = request.args.get('search', '').strip()
    limit = int(request.args.get('limit', 200))

    query = Champion.query

    if search:
        query = query.filter(Champion.name.ilike(f'%{search}%'))

    champions = query.order_by(Champion.name).limit(limit).all()

    return jsonify({
        'total': len(champions),
        'champions': [c.to_dict() for c in champions]
    }), 200


@champions_bp.route('/<int:champion_id>', methods=['GET'])
def get_champion(champion_id: int):
    """
    Get champion by ID

    GET /api/champions/<champion_id>

    Returns:
        Champion data with image URLs
    """
    champion = get_champion_by_id(champion_id)

    if not champion:
        return jsonify({
            'error': 'Champion not found'
        }), 404

    return jsonify(champion.to_dict()), 200


@champions_bp.route('/patch', methods=['GET'])
def get_patch_version():
    """
    Get current League of Legends patch version

    GET /api/champions/patch

    Returns:
        {
            'patch': str  # e.g., "14.24" or "latest"
        }
    """
    patch = get_current_patch()

    return jsonify({
        'patch': patch
    }), 200
