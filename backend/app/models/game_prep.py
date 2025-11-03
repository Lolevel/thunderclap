"""
Game Prep Models - Phase-based Draft Preparation System (NEW VERSION)
Replaces old draft_scenarios system
"""
from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid


class GamePrepRoster(db.Model):
    """
    Phase 1: Roster Selection
    - Multiple rosters possible until one is locked
    - Contains 5 players with roles
    """
    __tablename__ = 'game_prep_rosters'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)

    name = db.Column(db.String(100), nullable=False)  # e.g., "Krugs", "Raptors"
    roster = db.Column(JSONB, nullable=False)  # [{"player_id": "...", "role": "TOP", ...}]

    # Lock status
    is_locked = db.Column(db.Boolean, default=False)
    locked_at = db.Column(db.DateTime)
    locked_by = db.Column(db.String(100))

    # Metadata
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    team = db.relationship('Team', foreign_keys=[team_id])
    scenarios = db.relationship('DraftScenario', back_populates='roster', cascade='all, delete-orphan')
    comments = db.relationship('GamePrepComment', foreign_keys='GamePrepComment.roster_id', back_populates='roster', cascade='all, delete-orphan')

    def to_dict(self):
        # Enrich roster with player rank data
        enriched_roster = []
        if self.roster:
            from app.models import Player
            for player_data in self.roster:
                player_id = player_data.get('player_id')
                if player_id:
                    player = Player.query.get(player_id)
                    if player:
                        # Add rank data to player_data
                        enriched_player = {
                            **player_data,
                            'soloq_tier': player.soloq_tier,
                            'soloq_division': player.soloq_division,
                            'soloq_lp': player.soloq_lp
                        }
                        enriched_roster.append(enriched_player)
                    else:
                        enriched_roster.append(player_data)
                else:
                    enriched_roster.append(player_data)

        return {
            'id': str(self.id),
            'team_id': str(self.team_id),
            'name': self.name,
            'roster': enriched_roster,
            'is_locked': self.is_locked,
            'locked_at': self.locked_at.isoformat() if self.locked_at else None,
            'locked_by': self.locked_by,
            'display_order': self.display_order,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'scenario_count': len(self.scenarios) if self.scenarios else 0
        }

    def lock(self, username='System'):
        """Lock this roster"""
        self.is_locked = True
        self.locked_at = datetime.utcnow()
        self.locked_by = username

    def unlock(self):
        """Unlock this roster"""
        self.is_locked = False
        self.locked_at = None
        self.locked_by = None


class DraftScenario(db.Model):
    """
    Phase 2: Draft Scenarios
    - Belongs to a roster
    - Contains bans + picks for both teams
    - Visual: Draft-style UI
    """
    __tablename__ = 'draft_scenarios'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    roster_id = db.Column(UUID(as_uuid=True), db.ForeignKey('game_prep_rosters.id', ondelete='CASCADE'), nullable=False)

    name = db.Column(db.String(100), nullable=False)  # e.g., "Baron", "Drake"
    side = db.Column(db.String(10), nullable=False)  # 'blue' or 'red'

    # Bans (horizontal)
    blue_bans = db.Column(JSONB, default=list)  # [{"champion_id": 1, "order": 1}, ...]
    red_bans = db.Column(JSONB, default=list)

    # Picks (vertical)
    blue_picks = db.Column(JSONB, default=list)  # [{"champion_id": 1, "role": "TOP", "player_id": "..."}, ...]
    red_picks = db.Column(JSONB, default=list)

    # Metadata
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    team = db.relationship('Team', foreign_keys=[team_id])
    roster = db.relationship('GamePrepRoster', back_populates='scenarios')
    comments = db.relationship('GamePrepComment', foreign_keys='GamePrepComment.scenario_id', back_populates='scenario', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': str(self.id),
            'team_id': str(self.team_id),
            'roster_id': str(self.roster_id),
            'name': self.name,
            'side': self.side,
            'blue_bans': self.blue_bans or [],
            'red_bans': self.red_bans or [],
            'blue_picks': self.blue_picks or [],
            'red_picks': self.red_picks or [],
            'display_order': self.display_order,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class GamePrepComment(db.Model):
    """
    3-Level Comment System:
    - Global: Team-wide comments
    - Roster: Roster-specific comments
    - Scenario: Scenario-specific comments
    """
    __tablename__ = 'game_prep_comments'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)

    # Comment level
    level = db.Column(db.String(20), nullable=False)  # 'global', 'roster', 'scenario'

    # References (NULL for global)
    roster_id = db.Column(UUID(as_uuid=True), db.ForeignKey('game_prep_rosters.id', ondelete='CASCADE'))
    scenario_id = db.Column(UUID(as_uuid=True), db.ForeignKey('draft_scenarios.id', ondelete='CASCADE'))

    # Content
    content = db.Column(db.Text, nullable=False)
    author = db.Column(db.String(100))

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    team = db.relationship('Team', foreign_keys=[team_id])
    roster = db.relationship('GamePrepRoster', foreign_keys=[roster_id], back_populates='comments')
    scenario = db.relationship('DraftScenario', foreign_keys=[scenario_id], back_populates='comments')

    def to_dict(self):
        return {
            'id': str(self.id),
            'team_id': str(self.team_id),
            'level': self.level,
            'roster_id': str(self.roster_id) if self.roster_id else None,
            'scenario_id': str(self.scenario_id) if self.scenario_id else None,
            'content': self.content,
            'author': self.author,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
