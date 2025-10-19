"""
Match-related models
"""
from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid


class Match(db.Model):
    """Match model"""
    __tablename__ = 'matches'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = db.Column(db.String(50), unique=True, nullable=False)
    game_creation = db.Column(db.BigInteger)
    game_duration = db.Column(db.Integer)
    game_version = db.Column(db.String(20))
    map_id = db.Column(db.Integer)
    queue_id = db.Column(db.Integer)  # 0 for custom, 420 for ranked solo
    is_tournament_game = db.Column(db.Boolean, default=False)
    tournament_name = db.Column(db.String(100))
    winning_team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id'))
    losing_team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    participants = db.relationship('MatchParticipant', back_populates='match', cascade='all, delete-orphan')
    timeline_data = db.relationship('MatchTimelineData', back_populates='match', uselist=False, cascade='all, delete-orphan')
    winning_team = db.relationship('Team', foreign_keys=[winning_team_id], back_populates='won_matches')
    losing_team = db.relationship('Team', foreign_keys=[losing_team_id], back_populates='lost_matches')

    def __repr__(self):
        return f'<Match {self.match_id}>'

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'match_id': self.match_id,
            'game_creation': self.game_creation,
            'game_duration': self.game_duration,
            'game_version': self.game_version,
            'queue_id': self.queue_id,
            'is_tournament_game': self.is_tournament_game,
            'tournament_name': self.tournament_name,
            'winning_team_id': str(self.winning_team_id) if self.winning_team_id else None,
            'losing_team_id': str(self.losing_team_id) if self.losing_team_id else None,
        }


class MatchParticipant(db.Model):
    """Match participant (individual player performance in a match)"""
    __tablename__ = 'match_participants'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = db.Column(UUID(as_uuid=True), db.ForeignKey('matches.id', ondelete='CASCADE'), nullable=False)
    player_id = db.Column(UUID(as_uuid=True), db.ForeignKey('players.id'))
    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id'))
    champion_id = db.Column(db.Integer, nullable=False)
    champion_name = db.Column(db.String(50))
    role = db.Column(db.String(20))
    lane = db.Column(db.String(20))
    team_position = db.Column(db.String(20))  # Riot's detected position
    kills = db.Column(db.Integer)
    deaths = db.Column(db.Integer)
    assists = db.Column(db.Integer)
    cs_total = db.Column(db.Integer)
    cs_per_min = db.Column(db.Numeric(4, 2))
    gold_earned = db.Column(db.Integer)
    damage_dealt = db.Column(db.Integer)
    damage_taken = db.Column(db.Integer)
    vision_score = db.Column(db.Integer)
    wards_placed = db.Column(db.Integer)
    control_wards_placed = db.Column(db.Integer)  # NEW: Pink wards placed
    wards_destroyed = db.Column(db.Integer)
    first_blood = db.Column(db.Boolean)
    first_tower = db.Column(db.Boolean)
    win = db.Column(db.Boolean)
    riot_team_id = db.Column(db.Integer)  # Riot's teamId (100=Blue, 200=Red)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    match = db.relationship('Match', back_populates='participants')
    player = db.relationship('Player', back_populates='match_participations')

    __table_args__ = (
        db.UniqueConstraint('match_id', 'player_id', name='uq_match_player'),
    )

    def __repr__(self):
        return f'<MatchParticipant {self.match_id} {self.player_id}>'

    def to_dict(self):
        """Convert model to dictionary"""
        kda = ((self.kills + self.assists) / self.deaths) if self.deaths > 0 else (self.kills + self.assists)
        return {
            'id': str(self.id),
            'match_id': str(self.match_id),
            'player_id': str(self.player_id) if self.player_id else None,
            'team_id': str(self.team_id) if self.team_id else None,
            'champion_id': self.champion_id,
            'champion_name': self.champion_name,
            'role': self.role,
            'team_position': self.team_position,
            'kills': self.kills,
            'deaths': self.deaths,
            'assists': self.assists,
            'kda': round(kda, 2),
            'cs_total': self.cs_total,
            'cs_per_min': float(self.cs_per_min) if self.cs_per_min else None,
            'gold_earned': self.gold_earned,
            'damage_dealt': self.damage_dealt,
            'vision_score': self.vision_score,
            'control_wards_placed': self.control_wards_placed,
            'win': self.win,
            'riot_team_id': self.riot_team_id,
        }


class MatchTimelineData(db.Model):
    """Match timeline data (cached from Riot API)"""
    __tablename__ = 'match_timeline_data'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = db.Column(UUID(as_uuid=True), db.ForeignKey('matches.id', ondelete='CASCADE'), unique=True, nullable=False)
    gold_diff_at_10 = db.Column(db.Integer)
    gold_diff_at_15 = db.Column(db.Integer)
    xp_diff_at_10 = db.Column(db.Integer)
    xp_diff_at_15 = db.Column(db.Integer)
    first_blood_time = db.Column(db.Integer)  # seconds into game
    first_tower_time = db.Column(db.Integer)
    first_dragon_time = db.Column(db.Integer)
    first_herald_time = db.Column(db.Integer)
    timeline_data = db.Column(JSONB)  # full timeline for advanced analysis
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    match = db.relationship('Match', back_populates='timeline_data')

    def __repr__(self):
        return f'<MatchTimelineData {self.match_id}>'

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'match_id': str(self.match_id),
            'gold_diff_at_10': self.gold_diff_at_10,
            'gold_diff_at_15': self.gold_diff_at_15,
            'xp_diff_at_10': self.xp_diff_at_10,
            'xp_diff_at_15': self.xp_diff_at_15,
            'first_blood_time': self.first_blood_time,
            'first_tower_time': self.first_tower_time,
            'first_dragon_time': self.first_dragon_time,
            'first_herald_time': self.first_herald_time,
        }


class MatchTeamStats(db.Model):
    """Team statistics for a specific match (objectives, bans)"""
    __tablename__ = 'match_team_stats'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = db.Column(UUID(as_uuid=True), db.ForeignKey('matches.id', ondelete='CASCADE'), nullable=False)
    riot_team_id = db.Column(db.Integer, nullable=False)  # 100=Blue, 200=Red
    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey('teams.id'))  # Our team (if participating)
    win = db.Column(db.Boolean)

    # Objectives
    baron_kills = db.Column(db.Integer, default=0)
    dragon_kills = db.Column(db.Integer, default=0)
    herald_kills = db.Column(db.Integer, default=0)
    tower_kills = db.Column(db.Integer, default=0)
    inhibitor_kills = db.Column(db.Integer, default=0)
    first_baron = db.Column(db.Boolean, default=False)
    first_dragon = db.Column(db.Boolean, default=False)
    first_herald = db.Column(db.Boolean, default=False)
    first_tower = db.Column(db.Boolean, default=False)

    # Bans (stored as JSONB array)
    bans = db.Column(JSONB)  # [{championId, pickTurn}, ...]

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    match = db.relationship('Match', backref='team_stats')

    __table_args__ = (
        db.UniqueConstraint('match_id', 'riot_team_id', name='uq_match_team'),
    )

    def __repr__(self):
        return f'<MatchTeamStats {self.match_id} Team{self.riot_team_id}>'

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': str(self.id),
            'match_id': str(self.match_id),
            'riot_team_id': self.riot_team_id,
            'team_id': str(self.team_id) if self.team_id else None,
            'win': self.win,
            'baron_kills': self.baron_kills,
            'dragon_kills': self.dragon_kills,
            'herald_kills': self.herald_kills,
            'tower_kills': self.tower_kills,
            'inhibitor_kills': self.inhibitor_kills,
            'first_baron': self.first_baron,
            'first_dragon': self.first_dragon,
            'first_herald': self.first_herald,
            'first_tower': self.first_tower,
            'bans': self.bans,
        }
