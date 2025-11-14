from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import UUID

class TeamRefreshStatus(db.Model):
    __tablename__ = 'team_refresh_status'

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id'), nullable=False, unique=True)
    status = db.Column(db.String(20), nullable=False, default='idle')  # idle, running, completed, failed
    phase = db.Column(db.String(50), nullable=True)  # collecting_matches, filtering_matches, etc.
    progress_percent = db.Column(db.Integer, nullable=False, default=0)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=True, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=True, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    team = db.relationship('Team', backref=db.backref('refresh_status', uselist=False, lazy=True))

    def to_dict(self):
        return {
            'team_id': self.team_id,
            'status': self.status,
            'phase': self.phase,
            'progress_percent': self.progress_percent,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'error_message': self.error_message
        }

    @staticmethod
    def update_status(team_id, status=None, phase=None, progress_percent=None, error_message=None):
        """Update or create refresh status for a team"""
        refresh_status = TeamRefreshStatus.query.filter_by(team_id=team_id).first()

        if not refresh_status:
            refresh_status = TeamRefreshStatus(team_id=team_id)
            db.session.add(refresh_status)

        if status is not None:
            refresh_status.status = status
            if status == 'running' and not refresh_status.started_at:
                refresh_status.started_at = datetime.utcnow()
                refresh_status.completed_at = None
                refresh_status.error_message = None
            elif status in ['completed', 'failed']:
                refresh_status.completed_at = datetime.utcnow()

        if phase is not None:
            refresh_status.phase = phase

        if progress_percent is not None:
            refresh_status.progress_percent = progress_percent

        if error_message is not None:
            refresh_status.error_message = error_message

        # Explicit commit with error handling for thread safety
        try:
            db.session.commit()
            db.session.expire_all()  # Expire all instances to force fresh reads
        except Exception as e:
            db.session.rollback()
            raise e

        return refresh_status

    @staticmethod
    def get_status(team_id):
        """Get refresh status for a team"""
        refresh_status = TeamRefreshStatus.query.filter_by(team_id=team_id).first()
        if not refresh_status:
            # Create idle status if not exists
            refresh_status = TeamRefreshStatus(team_id=team_id, status='idle', progress_percent=0)
            db.session.add(refresh_status)
            db.session.commit()
        return refresh_status
