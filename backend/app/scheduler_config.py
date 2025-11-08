"""
APScheduler Configuration
Sets up scheduled jobs for automatic data refreshes
"""
import os
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.refresh_scheduler import RefreshScheduler

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def init_scheduler(app):
    """
    Initialize and start the APScheduler.
    Should be called after Flask app is created.
    """
    project_env = os.getenv('PROJECT_ENV', 'development')

    # Only schedule nightly refreshes in production
    if project_env == 'production':
        logger.info("🕐 Initializing scheduled jobs (production mode)")

        # Schedule nightly refresh at 4:00 AM
        scheduler.add_job(
            func=lambda: RefreshScheduler.refresh_all_teams(app),
            trigger='cron',
            hour=4,
            minute=0,
            id='nightly_team_refresh',
            name='Nightly Team Data Refresh',
            replace_existing=True
        )
        logger.info("  ✓ Scheduled: Nightly team refresh at 4:00 AM")
    else:
        logger.info("🕐 Scheduler initialized (development mode - no scheduled jobs)")

    # Start scheduler
    if not scheduler.running:
        scheduler.start()
        logger.info("  ✓ Scheduler started")

        # Register shutdown handler
        import atexit
        atexit.register(lambda: scheduler.shutdown())


def get_scheduler():
    """Get the scheduler instance"""
    return scheduler
