"""
Flask application factory
"""
import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_socketio import SocketIO
from config import config

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
socketio = SocketIO(cors_allowed_origins="*")  # Will be configured properly in create_app


def create_app(config_name='development'):
    """
    Application factory pattern

    Args:
        config_name: Configuration to use (development, production, testing)

    Returns:
        Flask application instance
    """
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(config[config_name])

    # Disable strict slashes to prevent 308 redirects that lose headers
    app.url_map.strict_slashes = False

    # Configure CORS - read origins from environment variable
    # CORS_ORIGINS should be a comma-separated list of allowed origins
    cors_origins_str = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5174')
    cors_origins = [origin.strip() for origin in cors_origins_str.split(',')]

    print(f"[CORS] Configured origins: {cors_origins}")

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Initialize SocketIO with proper CORS
    socketio.init_app(app,
                     cors_allowed_origins=cors_origins,
                     async_mode='threading',
                     logger=False,
                     engineio_logger=False)

    CORS(app,
         origins=cors_origins,
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization"],
         supports_credentials=False,
         send_wildcard=False,
         automatic_options=True)

    # Register blueprints
    from app.routes import teams, players, scouting, matches, stats, analytics, champions, auth, game_prep
    app.register_blueprint(teams.bp)
    app.register_blueprint(players.bp)
    app.register_blueprint(scouting.bp)
    app.register_blueprint(matches.bp)
    app.register_blueprint(stats.bp)
    app.register_blueprint(analytics.bp)  # NEW: Analytics endpoints
    app.register_blueprint(champions.champions_bp)  # NEW: Champions endpoints
    app.register_blueprint(auth.bp)  # NEW: Authentication endpoints
    app.register_blueprint(game_prep.bp)  # NEW: Game Prep (Phase-based draft system)

    # Register WebSocket event handlers
    from app.routes import websocket  # Import to register event handlers

    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'ok', 'service': 'Prime League Scout API'}

    # Ensure database sessions are properly cleaned up after each request
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        """Remove database sessions at the end of the request"""
        db.session.remove()

    # Cleanup stuck refresh statuses on startup
    with app.app_context():
        cleanup_stuck_refreshes()

    return app


def cleanup_stuck_refreshes():
    """
    Reset all 'running' refresh statuses that are stuck from previous server instances.
    Called automatically on application startup.
    """
    try:
        from app.models import TeamRefreshStatus
        from datetime import datetime, timedelta

        # Reset any refresh that has been 'running' for more than 5 minutes
        # (likely stuck from a server restart)
        cutoff_time = datetime.utcnow() - timedelta(minutes=5)

        stuck_refreshes = TeamRefreshStatus.query.filter(
            TeamRefreshStatus.status == 'running',
            TeamRefreshStatus.updated_at < cutoff_time
        ).all()

        if stuck_refreshes:
            for refresh in stuck_refreshes:
                refresh.status = 'idle'
                refresh.phase = 'idle'
                refresh.progress_percent = 0
                refresh.error_message = 'Reset due to server restart'

            db.session.commit()
            print(f"[STARTUP] Reset {len(stuck_refreshes)} stuck refresh status(es)")
        else:
            print("[STARTUP] No stuck refreshes found")

    except Exception as e:
        print(f"[STARTUP] Failed to cleanup stuck refreshes: {e}")
        # Don't crash the app if cleanup fails
        db.session.rollback()
