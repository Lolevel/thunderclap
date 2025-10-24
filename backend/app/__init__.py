"""
Flask application factory
"""
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from config import config

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()


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

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)

    # Register blueprints
    from app.routes import teams, players, scouting, matches, stats, analytics, champions, auth
    app.register_blueprint(teams.bp)
    app.register_blueprint(players.bp)
    app.register_blueprint(scouting.bp)
    app.register_blueprint(matches.bp)
    app.register_blueprint(stats.bp)
    app.register_blueprint(analytics.bp)  # NEW: Analytics endpoints
    app.register_blueprint(champions.champions_bp)  # NEW: Champions endpoints
    app.register_blueprint(auth.bp)  # NEW: Authentication endpoints

    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'ok', 'service': 'Prime League Scout API'}

    return app
