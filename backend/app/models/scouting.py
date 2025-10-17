"""
Scouting-related models
"""
from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import uuid


class ScoutingReport(db.Model):
    """Scouting reports"""
    __tablename__ = 'scouting_reports'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    opponent_team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    match_date = db.Column(db.Date)
    report_data = db.Column(JSONB)  # comprehensive report as JSON
    key_threats = db.Column(ARRAY(db.Text))
    suggested_bans = db.Column(ARRAY(db.String(50)))
    win_conditions = db.Column(ARRAY(db.Text))
    created_by = db.Column(UUID(as_uuid=True), db.ForeignKey('players.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<ScoutingReport {self.team_id} vs {self.opponent_team_id}>'

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'team_id': str(self.team_id),
            'opponent_team_id': str(self.opponent_team_id),
            'match_date': self.match_date.isoformat() if self.match_date else None,
            'report_data': self.report_data,
            'key_threats': self.key_threats,
            'suggested_bans': self.suggested_bans,
            'win_conditions': self.win_conditions,
            'created_by': str(self.created_by) if self.created_by else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
