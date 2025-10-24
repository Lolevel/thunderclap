"""
Authentication and token management routes
"""
from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models import AccessToken

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@bp.route('/validate', methods=['POST'])
def validate_token():
    """
    Validate an access token

    Request body:
        {
            "token": "string"
        }

    Returns:
        {
            "valid": true/false,
            "message": "string",
            "expires_at": "ISO datetime" or null
        }
    """
    data = request.get_json()
    token_string = data.get('token')

    if not token_string:
        return jsonify({'valid': False, 'message': 'No token provided'}), 400

    token = AccessToken.query.filter_by(token=token_string).first()

    if not token:
        return jsonify({'valid': False, 'message': 'Invalid token'}), 401

    if not token.is_valid():
        return jsonify({
            'valid': False,
            'message': 'Token expired or inactive',
            'expires_at': token.expires_at.isoformat() if token.expires_at else None
        }), 401

    # Record usage
    token.record_use()

    return jsonify({
        'valid': True,
        'message': 'Token is valid',
        'name': token.name,
        'expires_at': token.expires_at.isoformat() if token.expires_at else None
    }), 200


@bp.route('/tokens', methods=['GET'])
def list_tokens():
    """
    List all access tokens (admin endpoint - should be protected in production)

    Returns:
        {
            "tokens": [...]
        }
    """
    tokens = AccessToken.query.order_by(AccessToken.created_at.desc()).all()
    return jsonify({
        'tokens': [token.to_dict() for token in tokens]
    }), 200


@bp.route('/tokens', methods=['POST'])
def create_token():
    """
    Create a new access token (admin endpoint)

    Request body:
        {
            "name": "Optional token name",
            "expires_in_days": 30  // or null for never expires
        }

    Returns:
        {
            "token": {...}
        }
    """
    data = request.get_json() or {}
    name = data.get('name')
    expires_in_days = data.get('expires_in_days')

    try:
        token = AccessToken.create_token(
            name=name,
            expires_in_days=expires_in_days
        )

        current_app.logger.info(f"Created new access token: {name or token.token[:8]}")

        return jsonify({
            'token': token.to_dict(),
            'message': 'Token created successfully'
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error creating token: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create token', 'details': str(e)}), 500


@bp.route('/tokens/<token_id>', methods=['DELETE'])
def delete_token(token_id):
    """
    Delete (deactivate) an access token

    Returns:
        {
            "message": "Token deleted"
        }
    """
    token = AccessToken.query.get(token_id)

    if not token:
        return jsonify({'error': 'Token not found'}), 404

    try:
        # Instead of deleting, deactivate
        token.is_active = False
        db.session.commit()

        current_app.logger.info(f"Deactivated token: {token.name or token.token[:8]}")

        return jsonify({'message': 'Token deactivated successfully'}), 200

    except Exception as e:
        current_app.logger.error(f"Error deactivating token: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to deactivate token', 'details': str(e)}), 500


@bp.route('/tokens/<token_id>/activate', methods=['POST'])
def activate_token(token_id):
    """
    Reactivate a deactivated token

    Returns:
        {
            "message": "Token activated"
        }
    """
    token = AccessToken.query.get(token_id)

    if not token:
        return jsonify({'error': 'Token not found'}), 404

    try:
        token.is_active = True
        db.session.commit()

        current_app.logger.info(f"Activated token: {token.name or token.token[:8]}")

        return jsonify({'message': 'Token activated successfully'}), 200

    except Exception as e:
        current_app.logger.error(f"Error activating token: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to activate token', 'details': str(e)}), 500
