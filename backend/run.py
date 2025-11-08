"""
Application entry point
"""
import os
from app import create_app, db
from app.scheduler_config import init_scheduler

# Get configuration from environment
config_name = os.environ.get('FLASK_ENV', 'development')

# Create application
app = create_app(config_name)

# Initialize scheduler
with app.app_context():
    init_scheduler(app)

@app.shell_context_processor
def make_shell_context():
    """
    Create shell context for flask shell command
    Makes db and models available in shell
    """
    from app import models
    return {
        'db': db,
        'Team': models.Team,
        'Player': models.Player,
        'Match': models.Match,
        'TeamRoster': models.TeamRoster,
        'PlayerChampion': models.PlayerChampion,
        'MatchParticipant': models.MatchParticipant,
        'TeamStats': models.TeamStats,
        'DraftPattern': models.DraftPattern,
        'LineupPrediction': models.LineupPrediction,
    }


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=app.config['DEBUG']
    )
