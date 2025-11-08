"""
Refresh Scheduler Service
Handles automatic scheduled refreshes of team data (e.g., nightly at 4 AM)
"""
import logging
from datetime import datetime
from threading import Thread
from app import db
from app.models import Team, TeamRefreshStatus
from app.services.team_refresh_service import TeamRefreshService

logger = logging.getLogger(__name__)


class RefreshScheduler:
    """Handles scheduled automatic team data refreshes"""

    @staticmethod
    def refresh_all_teams(app):
        """
        Refresh data for all teams in the database.
        This is designed to be called by APScheduler at 4:00 AM daily.

        Args:
            app: Flask application instance
        """
        logger.info("Starting scheduled refresh for all teams...")

        teams = Team.query.all()
        total_teams = len(teams)

        if total_teams == 0:
            logger.info("No teams found in database. Skipping scheduled refresh.")
            return

        logger.info(f"Found {total_teams} teams to refresh.")

        success_count = 0
        failed_count = 0

        for idx, team in enumerate(teams, 1):
            try:
                logger.info(f"[{idx}/{total_teams}] Refreshing team: {team.name} ({team.id})")

                # Check if team already has a running refresh
                refresh_status = TeamRefreshStatus.get_status(team.id)
                if refresh_status.status == 'running':
                    logger.warning(f"Team {team.name} already has a running refresh. Skipping.")
                    continue

                # Start refresh in separate thread to avoid blocking
                refresh_thread = Thread(
                    target=RefreshScheduler._refresh_team_wrapper,
                    args=(team.id, app),
                    daemon=True
                )
                refresh_thread.start()

                success_count += 1

            except Exception as e:
                logger.error(f"Error scheduling refresh for team {team.name}: {str(e)}")
                failed_count += 1

        logger.info(
            f"Scheduled refresh completed. Success: {success_count}, Failed: {failed_count}"
        )

    @staticmethod
    def _refresh_team_wrapper(team_id, app):
        """
        Wrapper to refresh a single team. Runs in separate thread.
        Catches exceptions to prevent one team's failure from stopping others.
        Requires Flask app context for database access.
        """
        with app.app_context():
            try:
                # Load team in this context
                team = Team.query.get(team_id)
                if not team:
                    logger.error(f"Team with ID {team_id} not found in thread")
                    return

                logger.info(f"Starting refresh for team: {team.name}")
                TeamRefreshService.refresh_team_data(team_id)
                logger.info(f"Completed refresh for team: {team.name}")
            except Exception as e:
                logger.error(f"Failed to refresh team {team_id}: {str(e)}")
                # Update status to failed
                try:
                    TeamRefreshStatus.update_status(
                        team_id=team_id,
                        status='failed',
                        error_message=str(e)
                    )
                except Exception as status_error:
                    logger.error(f"Failed to update status for team {team_id}: {str(status_error)}")

    @staticmethod
    def refresh_single_team(team_id, app):
        """
        Refresh data for a single team (triggered manually via API).
        Returns immediately after starting the refresh in background.

        Args:
            team_id: Team UUID
            app: Flask application instance (needed for app context in thread)
        """
        team = Team.query.get(team_id)
        if not team:
            raise ValueError(f"Team with ID {team_id} not found")

        # Check if team already has a running refresh
        refresh_status = TeamRefreshStatus.get_status(team_id)
        if refresh_status.status == 'running':
            logger.warning(f"Team {team.name} already has a running refresh.")
            return {'message': 'Refresh already in progress', 'status': 'running'}

        # Start refresh in background thread
        refresh_thread = Thread(
            target=RefreshScheduler._refresh_team_wrapper,
            args=(team.id, app),
            daemon=True
        )
        refresh_thread.start()

        logger.info(f"Started background refresh for team: {team.name}")
        return {'message': 'Refresh started', 'status': 'running'}
