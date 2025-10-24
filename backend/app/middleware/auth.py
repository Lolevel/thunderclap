"""
Authentication middleware for token-based access control
"""
from functools import wraps
from flask import request, jsonify, current_app
from app.models import AccessToken


def require_auth(f):
    """
    Decorator to require valid access token for route access

    Usage:
        @bp.route('/protected')
        @require_auth
        def protected_route():
            return jsonify({'message': 'You have access!'})

    Token should be provided in:
        - Header: Authorization: Bearer <token>
        - Query param: ?token=<token>
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip auth for OPTIONS requests (CORS preflight)
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)

        token_string = None

        # Try to get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token_string = auth_header.split(' ')[1]

        # Try to get token from query parameter
        if not token_string:
            token_string = request.args.get('token')

        if not token_string:
            return jsonify({'error': 'No access token provided'}), 401

        # Validate token
        token = AccessToken.query.filter_by(token=token_string).first()

        if not token:
            current_app.logger.warning(f"Invalid token attempted: {token_string[:8]}...")
            return jsonify({'error': 'Invalid access token'}), 401

        if not token.is_valid():
            current_app.logger.warning(f"Expired/inactive token attempted: {token.name or token_string[:8]}")
            return jsonify({'error': 'Access token expired or inactive'}), 401

        # Record token usage
        token.record_use()

        # Execute the route function
        return f(*args, **kwargs)

    return decorated_function


def optional_auth(f):
    """
    Decorator that checks for auth but doesn't require it
    Useful for routes that want to know if user is authenticated but don't require it
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token_string = None

        # Try to get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token_string = auth_header.split(' ')[1]

        # Try to get token from query parameter
        if not token_string:
            token_string = request.args.get('token')

        is_authenticated = False
        if token_string:
            token = AccessToken.query.filter_by(token=token_string).first()
            if token and token.is_valid():
                token.record_use()
                is_authenticated = True

        # Add auth status to kwargs
        kwargs['is_authenticated'] = is_authenticated
        return f(*args, **kwargs)

    return decorated_function
