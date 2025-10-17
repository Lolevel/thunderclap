"""
Player-related models
"""
from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import UUID
import uuid


class Player(db.Model):
    """Player model"""
    __tablename__ = 'players'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    summoner_name = db.Column(db.String(100), nullable=False)
    summoner_id = db.Column(db.String(100), unique=True, nullable=True)  # Nullable due to Riot API bug (Issue #1092)
    puuid = db.Column(db.String(100), unique=True, nullable=False)
    summoner_level = db.Column(db.Integer)
    profile_icon_id = db.Column(db.Integer)
    current_rank = db.Column(db.String(20))
    current_lp = db.Column(db.Integer)
    peak_rank = db.Column(db.String(20))
    region = db.Column(db.String(10), default='EUW1')
    last_active = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    team_memberships = db.relationship('TeamRoster', back_populates='player', cascade='all, delete-orphan')
    champions = db.relationship('PlayerChampion', back_populates='player', cascade='all, delete-orphan')
    performance_timeline = db.relationship('PlayerPerformanceTimeline', back_populates='player', cascade='all, delete-orphan')
    match_participations = db.relationship('MatchParticipant', back_populates='player')

    def __repr__(self):
        return f'<Player {self.summoner_name}>'

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'summoner_name': self.summoner_name,
            'summoner_id': self.summoner_id,
            'puuid': self.puuid,
            'summoner_level': self.summoner_level,
            'profile_icon_id': self.profile_icon_id,
            'current_rank': self.current_rank,
            'current_lp': self.current_lp,
            'peak_rank': self.peak_rank,
            'region': self.region,
            'last_active': self.last_active.isoformat() if self.last_active else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class PlayerChampion(db.Model):
    """Player champion statistics"""
    __tablename__ = 'player_champions'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id = db.Column(UUID(as_uuid=True), db.ForeignKey('players.id', ondelete='CASCADE'), nullable=False)
    champion_id = db.Column(db.Integer, nullable=False)
    champion_name = db.Column(db.String(50))
    mastery_level = db.Column(db.Integer)
    mastery_points = db.Column(db.Integer)
    games_played_total = db.Column(db.Integer, default=0)
    games_played_recent = db.Column(db.Integer, default=0)  # last 30 days
    winrate_total = db.Column(db.Numeric(5, 2))
    winrate_recent = db.Column(db.Numeric(5, 2))
    kda_average = db.Column(db.Numeric(4, 2))
    cs_per_min = db.Column(db.Numeric(4, 2))
    last_played = db.Column(db.DateTime)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    player = db.relationship('Player', back_populates='champions')

    __table_args__ = (
        db.UniqueConstraint('player_id', 'champion_id', name='uq_player_champion'),
    )

    def __repr__(self):
        return f'<PlayerChampion {self.player_id} {self.champion_name}>'

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'player_id': str(self.player_id),
            'champion_id': self.champion_id,
            'champion_name': self.champion_name,
            'mastery_level': self.mastery_level,
            'mastery_points': self.mastery_points,
            'games_played_total': self.games_played_total,
            'games_played_recent': self.games_played_recent,
            'winrate_total': float(self.winrate_total) if self.winrate_total else None,
            'winrate_recent': float(self.winrate_recent) if self.winrate_recent else None,
            'kda_average': float(self.kda_average) if self.kda_average else None,
            'cs_per_min': float(self.cs_per_min) if self.cs_per_min else None,
            'last_played': self.last_played.isoformat() if self.last_played else None,
        }


class PlayerPerformanceTimeline(db.Model):
    """Player daily performance timeline"""
    __tablename__ = 'player_performance_timeline'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id = db.Column(UUID(as_uuid=True), db.ForeignKey('players.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    games_played = db.Column(db.Integer, default=0)
    average_kda = db.Column(db.Numeric(4, 2))
    average_cs_per_min = db.Column(db.Numeric(4, 2))
    average_vision_score = db.Column(db.Numeric(5, 2))
    winrate = db.Column(db.Numeric(5, 2))
    main_role = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    player = db.relationship('Player', back_populates='performance_timeline')

    __table_args__ = (
        db.UniqueConstraint('player_id', 'date', name='uq_player_date'),
    )

    def __repr__(self):
        return f'<PlayerPerformanceTimeline {self.player_id} {self.date}>'

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'player_id': str(self.player_id),
            'date': self.date.isoformat(),
            'games_played': self.games_played,
            'average_kda': float(self.average_kda) if self.average_kda else None,
            'average_cs_per_min': float(self.average_cs_per_min) if self.average_cs_per_min else None,
            'average_vision_score': float(self.average_vision_score) if self.average_vision_score else None,
            'winrate': float(self.winrate) if self.winrate else None,
            'main_role': self.main_role,
        }
