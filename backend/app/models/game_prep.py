"""
Draft Scenario model
"""
from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid


class DraftScenario(db.Model):
    """Draft Scenario model - stores draft preparation scenarios"""
    __tablename__ = 'draft_scenarios'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Scenario details
    scenario_name = db.Column(db.String(255), default='Scenario 1')
    side = db.Column(db.String(10), nullable=False)  # 'blue' or 'red'

    # Roster for this scenario
    # Array of 5 player objects: [{"player_id": "uuid", "summoner_name": "Name", "role": "TOP"}, ...]
    roster = db.Column(JSONB)

    # Draft data (in draft order)
    bans = db.Column(JSONB)  # Array of 5 champion names
    picks = db.Column(JSONB)  # Array of 5 champion names in draft order

    # Notes
    notes = db.Column(db.Text)

    # Metadata
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)

    # Relationships
    team = db.relationship('Team', backref=db.backref('draft_scenarios', lazy=True))

    def __repr__(self):
        return f'<DraftScenario {self.scenario_name} ({self.side}) for Team {self.team_id}>'

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': str(self.id),
            'team_id': str(self.team_id),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'scenario_name': self.scenario_name,
            'side': self.side,
            'roster': self.roster or [],
            'bans': self.bans or ['', '', '', '', ''],
            'picks': self.picks or ['', '', '', '', ''],
            'notes': self.notes or '',
            'is_active': self.is_active,
            'display_order': self.display_order
        }
