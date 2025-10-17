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

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)

    # Register blueprints
    from app.routes import teams, players, scouting, matches, stats
    app.register_blueprint(teams.bp)
    app.register_blueprint(players.bp)
    app.register_blueprint(scouting.bp)
    app.register_blueprint(matches.bp)
    app.register_blueprint(stats.bp)

    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'ok', 'service': 'Prime League Scout API'}

    return app
