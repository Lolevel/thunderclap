"""
Team-related models
"""
from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import UUID, ARRAY
import uuid


class Team(db.Model):
    """Team model"""
    __tablename__ = 'teams'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), nullable=False)
    tag = db.Column(db.String(10))
    prime_league_id = db.Column(db.String(50), unique=True)
    opgg_url = db.Column(db.Text)
    division = db.Column(db.String(50))
    current_split = db.Column(db.String(20))
    logo_url = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    rosters = db.relationship('TeamRoster', back_populates='team', cascade='all, delete-orphan')
    stats = db.relationship('TeamStats', back_populates='team', cascade='all, delete-orphan')
    won_matches = db.relationship('Match', foreign_keys='Match.winning_team_id', back_populates='winning_team')
    lost_matches = db.relationship('Match', foreign_keys='Match.losing_team_id', back_populates='losing_team')

    def __repr__(self):
        return f'<Team {self.name}>'

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'name': self.name,
            'tag': self.tag,
            'prime_league_id': self.prime_league_id,
            'opgg_url': self.opgg_url,
            'division': self.division,
            'current_split': self.current_split,
            'logo_url': self.logo_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class TeamRoster(db.Model):
    """Team roster (many-to-many team-player with role)"""
    __tablename__ = 'team_rosters'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    player_id = db.Column(UUID(as_uuid=True), db.ForeignKey('players.id', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.String(20))  # TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY
    is_main_roster = db.Column(db.Boolean, default=True)
    join_date = db.Column(db.Date)
    leave_date = db.Column(db.Date)
    games_played = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    team = db.relationship('Team', back_populates='rosters')
    player = db.relationship('Player', back_populates='team_memberships')

    __table_args__ = (
        db.UniqueConstraint('team_id', 'player_id', 'join_date', name='uq_team_player_join'),
    )

    def __repr__(self):
        return f'<TeamRoster {self.team_id}-{self.player_id} {self.role}>'

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'team_id': str(self.team_id),
            'player_id': str(self.player_id),
            'role': self.role,
            'is_main_roster': self.is_main_roster,
            'join_date': self.join_date.isoformat() if self.join_date else None,
            'leave_date': self.leave_date.isoformat() if self.leave_date else None,
            'games_played': self.games_played,
        }


class TeamStats(db.Model):
    """Team statistics (aggregated)"""
    __tablename__ = 'team_stats'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    stat_type = db.Column(db.String(50), nullable=False)  # 'tournament', 'all'
    games_played = db.Column(db.Integer, default=0)
    wins = db.Column(db.Integer, default=0)
    losses = db.Column(db.Integer, default=0)
    first_blood_rate = db.Column(db.Numeric(5, 2))
    first_tower_rate = db.Column(db.Numeric(5, 2))
    first_dragon_rate = db.Column(db.Numeric(5, 2))
    dragon_control_rate = db.Column(db.Numeric(5, 2))
    baron_control_rate = db.Column(db.Numeric(5, 2))
    average_game_duration = db.Column(db.Integer)
    average_gold_diff_at_10 = db.Column(db.Integer)
    average_gold_diff_at_15 = db.Column(db.Integer)
    comeback_win_rate = db.Column(db.Numeric(5, 2))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    team = db.relationship('Team', back_populates='stats')

    __table_args__ = (
        db.UniqueConstraint('team_id', 'stat_type', name='uq_team_stat_type'),
    )

    def __repr__(self):
        return f'<TeamStats {self.team_id} {self.stat_type}>'

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'team_id': str(self.team_id),
            'stat_type': self.stat_type,
            'games_played': self.games_played,
            'wins': self.wins,
            'losses': self.losses,
            'winrate': round(self.wins / self.games_played * 100, 2) if self.games_played > 0 else 0,
            'first_blood_rate': float(self.first_blood_rate) if self.first_blood_rate else None,
            'first_tower_rate': float(self.first_tower_rate) if self.first_tower_rate else None,
            'first_dragon_rate': float(self.first_dragon_rate) if self.first_dragon_rate else None,
            'dragon_control_rate': float(self.dragon_control_rate) if self.dragon_control_rate else None,
            'baron_control_rate': float(self.baron_control_rate) if self.baron_control_rate else None,
            'average_game_duration': self.average_game_duration,
            'average_gold_diff_at_10': self.average_gold_diff_at_10,
            'average_gold_diff_at_15': self.average_gold_diff_at_15,
            'comeback_win_rate': float(self.comeback_win_rate) if self.comeback_win_rate else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
