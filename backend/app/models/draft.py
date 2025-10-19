"""
Draft-related models
"""

from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import UUID
import uuid


class DraftPattern(db.Model):
    """Draft patterns (ban/pick tendencies)"""

    __tablename__ = "draft_patterns"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
    )
    player_id = db.Column(UUID(as_uuid=True), db.ForeignKey("players.id"))  # NEW: Track which player picked
    champion_id = db.Column(db.Integer, nullable=False)
    champion_name = db.Column(db.String(50))  # NEW: Champion name for easier display
    action_type = db.Column(db.String(20), nullable=False)  # 'ban', 'pick'
    ban_rotation = db.Column(db.Integer)  # NEW: 1, 2, 3 for ban rotations
    is_first_pick = db.Column(db.Boolean, default=False)  # NEW: TRUE if picked on first pick
    pick_order = db.Column(db.Integer)  # 1-5 for picks
    side = db.Column(db.String(10))  # 'blue', 'red', 'both'
    frequency = db.Column(db.Integer, default=1)
    winrate = db.Column(db.Numeric(5, 2))
    last_used = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<DraftPattern {self.team_id} {self.action_type} {self.champion_id}>"

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": str(self.id),
            "team_id": str(self.team_id),
            "player_id": str(self.player_id) if self.player_id else None,
            "champion_id": self.champion_id,
            "champion_name": self.champion_name,
            "action_type": self.action_type,
            "ban_rotation": self.ban_rotation,
            "is_first_pick": self.is_first_pick,
            "pick_order": self.pick_order,
            "side": self.side,
            "frequency": self.frequency,
            "winrate": float(self.winrate) if self.winrate else None,
            "last_used": self.last_used.isoformat() if self.last_used else None,
        }
