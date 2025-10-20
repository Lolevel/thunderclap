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
    # summoner_level removed - no longer needed
    profile_icon_id = db.Column(db.Integer)
    current_rank = db.Column(db.String(20))  # Deprecated - use soloq_tier
    current_lp = db.Column(db.Integer)  # Deprecated - use soloq_lp
    peak_rank = db.Column(db.String(20))

    # Solo/Duo Queue rank
    soloq_tier = db.Column(db.String(20))  # IRON, BRONZE, SILVER, etc.
    soloq_division = db.Column(db.String(5))  # IV, III, II, I
    soloq_lp = db.Column(db.Integer, default=0)
    soloq_wins = db.Column(db.Integer, default=0)
    soloq_losses = db.Column(db.Integer, default=0)

    # Flex Queue rank
    flexq_tier = db.Column(db.String(20))
    flexq_division = db.Column(db.String(5))
    flexq_lp = db.Column(db.Integer, default=0)
    flexq_wins = db.Column(db.Integer, default=0)
    flexq_losses = db.Column(db.Integer, default=0)

    rank_last_updated = db.Column(db.DateTime)

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
        from app.utils.rank_calculator import get_rank_icon_url, rank_to_points

        # Calculate rank display for Solo/Duo Queue
        soloq_display = None
        soloq_icon = None
        soloq_points = 0
        if self.soloq_tier:
            if self.soloq_tier in ['MASTER', 'GRANDMASTER', 'CHALLENGER']:
                soloq_display = self.soloq_tier.capitalize()
            else:
                soloq_display = f"{self.soloq_tier.capitalize()} {self.soloq_division}" if self.soloq_division else self.soloq_tier.capitalize()
            soloq_icon = get_rank_icon_url(self.soloq_tier, self.soloq_division)
            soloq_points = rank_to_points(self.soloq_tier, self.soloq_division, self.soloq_lp or 0)

        # Calculate rank display for Flex Queue
        flexq_display = None
        flexq_icon = None
        flexq_points = 0
        if self.flexq_tier:
            if self.flexq_tier in ['MASTER', 'GRANDMASTER', 'CHALLENGER']:
                flexq_display = self.flexq_tier.capitalize()
            else:
                flexq_display = f"{self.flexq_tier.capitalize()} {self.flexq_division}" if self.flexq_division else self.flexq_tier.capitalize()
            flexq_icon = get_rank_icon_url(self.flexq_tier, self.flexq_division)
            flexq_points = rank_to_points(self.flexq_tier, self.flexq_division, self.flexq_lp or 0)

        return {
            'id': str(self.id),
            'summoner_name': self.summoner_name,
            'summoner_id': self.summoner_id,
            'puuid': self.puuid,
            'profile_icon_id': self.profile_icon_id,
            'current_rank': self.current_rank,  # Deprecated
            'current_lp': self.current_lp,  # Deprecated
            'peak_rank': self.peak_rank,
            'soloq': {
                'tier': self.soloq_tier,
                'division': self.soloq_division,
                'lp': self.soloq_lp,
                'wins': self.soloq_wins,
                'losses': self.soloq_losses,
                'display': soloq_display,
                'icon_url': soloq_icon,
                'points': soloq_points
            } if self.soloq_tier else None,
            'flexq': {
                'tier': self.flexq_tier,
                'division': self.flexq_division,
                'lp': self.flexq_lp,
                'wins': self.flexq_wins,
                'losses': self.flexq_losses,
                'display': flexq_display,
                'icon_url': flexq_icon,
                'points': flexq_points
            } if self.flexq_tier else None,
            'region': self.region,
            'rank_last_updated': self.rank_last_updated.isoformat() if self.rank_last_updated else None,
            'last_active': self.last_active.isoformat() if self.last_active else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class PlayerChampion(db.Model):
    """Player champion statistics - separate entries for tournament and soloqueue"""
    __tablename__ = 'player_champions'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id = db.Column(UUID(as_uuid=True), db.ForeignKey('players.id', ondelete='CASCADE'), nullable=False)
    champion_id = db.Column(db.Integer, nullable=False)
    champion_name = db.Column(db.String(50))
    game_type = db.Column(db.String(20), nullable=False)  # 'tournament' or 'soloqueue'
    mastery_level = db.Column(db.Integer)
    mastery_points = db.Column(db.Integer)
    games_played = db.Column(db.Integer, default=0)
    wins = db.Column(db.Integer, default=0)
    losses = db.Column(db.Integer, default=0)
    winrate = db.Column(db.Numeric(5, 2))
    kda_average = db.Column(db.Numeric(4, 2))
    cs_per_min = db.Column(db.Numeric(4, 2))
    pink_wards_per_game = db.Column(db.Numeric(4, 2))  # NEW: Control wards per game
    last_played = db.Column(db.DateTime)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    player = db.relationship('Player', back_populates='champions')

    __table_args__ = (
        db.UniqueConstraint('player_id', 'champion_id', 'game_type', name='uq_player_champion_type'),
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
            'game_type': self.game_type,
            'mastery_level': self.mastery_level,
            'mastery_points': self.mastery_points,
            'games_played': self.games_played,
            'wins': self.wins,
            'losses': self.losses,
            'winrate': float(self.winrate) if self.winrate else None,
            'kda_average': float(self.kda_average) if self.kda_average else None,
            'cs_per_min': float(self.cs_per_min) if self.cs_per_min else None,
            'pink_wards_per_game': float(self.pink_wards_per_game) if self.pink_wards_per_game else None,
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
