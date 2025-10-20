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
    platform_id = db.Column(db.String(10), default='EUW1')

    # Tournament
    is_tournament_game = db.Column(db.Boolean, default=False)
    tournament_name = db.Column(db.String(100))
    tournament_code = db.Column(db.String(100))  # NEW: Riot tournament code

    # Game state
    game_ended_in_surrender = db.Column(db.Boolean, default=False)
    game_ended_in_early_surrender = db.Column(db.Boolean, default=False)

    # Team references
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
            'platform_id': self.platform_id,
            'is_tournament_game': self.is_tournament_game,
            'tournament_name': self.tournament_name,
            'tournament_code': self.tournament_code,
            'game_ended_in_surrender': self.game_ended_in_surrender,
            'game_ended_in_early_surrender': self.game_ended_in_early_surrender,
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

    # Identity - Store for all participants, even untracked
    puuid = db.Column(db.String(100), nullable=False)
    summoner_name = db.Column(db.String(100))
    riot_game_name = db.Column(db.String(50))
    riot_tagline = db.Column(db.String(10))

    # Champion & Position
    champion_id = db.Column(db.Integer, nullable=False)
    champion_name = db.Column(db.String(50))
    team_position = db.Column(db.String(20))  # TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY
    individual_position = db.Column(db.String(20))
    lane = db.Column(db.String(20))
    role = db.Column(db.String(20))

    # Team assignment
    riot_team_id = db.Column(db.Integer, nullable=False)  # 100=Blue, 200=Red
    participant_id = db.Column(db.Integer)  # 1-10

    # Core stats
    kills = db.Column(db.Integer, default=0)
    deaths = db.Column(db.Integer, default=0)
    assists = db.Column(db.Integer, default=0)

    # CS & Gold
    total_minions_killed = db.Column(db.Integer, default=0)
    neutral_minions_killed = db.Column(db.Integer, default=0)
    # cs_total computed column handled by migration
    cs_total = db.Column(db.Integer)  # Will be GENERATED ALWAYS AS after migration
    cs_per_min = db.Column(db.Numeric(5, 2))
    gold_earned = db.Column(db.Integer, default=0)
    gold_spent = db.Column(db.Integer, default=0)

    # Damage
    total_damage_dealt_to_champions = db.Column(db.Integer, default=0)
    physical_damage_dealt_to_champions = db.Column(db.Integer, default=0)
    magic_damage_dealt_to_champions = db.Column(db.Integer, default=0)
    true_damage_dealt_to_champions = db.Column(db.Integer, default=0)
    total_damage_taken = db.Column(db.Integer, default=0)
    damage_self_mitigated = db.Column(db.Integer, default=0)

    # Vision
    vision_score = db.Column(db.Integer, default=0)
    wards_placed = db.Column(db.Integer, default=0)
    wards_killed = db.Column(db.Integer, default=0)
    control_wards_placed = db.Column(db.Integer, default=0)
    vision_score_per_min = db.Column(db.Numeric(5, 2))

    # Combat achievements
    first_blood = db.Column(db.Boolean, default=False)
    first_blood_assist = db.Column(db.Boolean, default=False)
    first_tower = db.Column(db.Boolean, default=False)
    first_tower_assist = db.Column(db.Boolean, default=False)
    double_kills = db.Column(db.Integer, default=0)
    triple_kills = db.Column(db.Integer, default=0)
    quadra_kills = db.Column(db.Integer, default=0)
    penta_kills = db.Column(db.Integer, default=0)
    largest_killing_spree = db.Column(db.Integer, default=0)
    largest_multi_kill = db.Column(db.Integer, default=0)

    # Objectives (individual)
    baron_kills = db.Column(db.Integer, default=0)
    dragon_kills = db.Column(db.Integer, default=0)
    turret_kills = db.Column(db.Integer, default=0)
    inhibitor_kills = db.Column(db.Integer, default=0)

    # Items (final build)
    item0 = db.Column(db.Integer)
    item1 = db.Column(db.Integer)
    item2 = db.Column(db.Integer)
    item3 = db.Column(db.Integer)
    item4 = db.Column(db.Integer)
    item5 = db.Column(db.Integer)
    item6 = db.Column(db.Integer)
    items_purchased = db.Column(db.Integer, default=0)

    # Summoner spells
    summoner1_id = db.Column(db.Integer)
    summoner2_id = db.Column(db.Integer)
    summoner1_casts = db.Column(db.Integer, default=0)
    summoner2_casts = db.Column(db.Integer, default=0)

    # Spell casts
    spell1_casts = db.Column(db.Integer, default=0)
    spell2_casts = db.Column(db.Integer, default=0)
    spell3_casts = db.Column(db.Integer, default=0)
    spell4_casts = db.Column(db.Integer, default=0)

    # Runes
    perks = db.Column(JSONB)

    # Advanced stats from challenges
    kda = db.Column(db.Numeric(5, 2))
    kill_participation = db.Column(db.Numeric(5, 4))
    damage_per_minute = db.Column(db.Numeric(7, 2))
    gold_per_minute = db.Column(db.Numeric(6, 2))
    team_damage_percentage = db.Column(db.Numeric(5, 4))
    solo_kills = db.Column(db.Integer, default=0)
    time_ccing_others = db.Column(db.Integer, default=0)

    # Result
    win = db.Column(db.Boolean, nullable=False)
    team_early_surrendered = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    match = db.relationship('Match', back_populates='participants')
    player = db.relationship('Player', back_populates='match_participations')

    __table_args__ = (
        db.UniqueConstraint('match_id', 'puuid', name='uq_match_participant_puuid'),
    )

    def __repr__(self):
        return f'<MatchParticipant {self.match_id} {self.player_id}>'

    def to_dict(self, include_full_details=False):
        """Convert model to dictionary

        Args:
            include_full_details: If True, include all fields (items, runes, etc)
        """
        # Use stored KDA if available, otherwise calculate
        kda_value = float(self.kda) if self.kda else (
            ((self.kills + self.assists) / self.deaths) if self.deaths > 0 else (self.kills + self.assists)
        )

        base_dict = {
            'id': str(self.id),
            'match_id': str(self.match_id),
            'player_id': str(self.player_id) if self.player_id else None,
            'team_id': str(self.team_id) if self.team_id else None,
            'puuid': self.puuid,
            'summoner_name': self.summoner_name,
            'riot_game_name': self.riot_game_name,
            'riot_tagline': self.riot_tagline,

            # Champion & Position
            'champion_id': self.champion_id,
            'champion_name': self.champion_name,
            'team_position': self.team_position,
            'riot_team_id': self.riot_team_id,

            # Core stats
            'kills': self.kills,
            'deaths': self.deaths,
            'assists': self.assists,
            'kda': round(kda_value, 2),

            # CS & Gold
            'cs_total': self.cs_total,
            'cs_per_min': float(self.cs_per_min) if self.cs_per_min else None,
            'gold_earned': self.gold_earned,
            'gold_spent': self.gold_spent,

            # Damage
            'total_damage_dealt': self.total_damage_dealt_to_champions,
            'total_damage_taken': self.total_damage_taken,

            # Vision
            'vision_score': self.vision_score,
            'control_wards_placed': self.control_wards_placed,
            'vision_score_per_min': float(self.vision_score_per_min) if self.vision_score_per_min else None,

            # Combat
            'double_kills': self.double_kills,
            'triple_kills': self.triple_kills,
            'quadra_kills': self.quadra_kills,
            'penta_kills': self.penta_kills,

            # Advanced stats
            'kill_participation': float(self.kill_participation) if self.kill_participation else None,
            'damage_per_minute': float(self.damage_per_minute) if self.damage_per_minute else None,
            'team_damage_percentage': float(self.team_damage_percentage) if self.team_damage_percentage else None,
            'solo_kills': self.solo_kills,

            # Result
            'win': self.win,
        }

        if include_full_details:
            base_dict.update({
                # All damage types
                'physical_damage_dealt': self.physical_damage_dealt_to_champions,
                'magic_damage_dealt': self.magic_damage_dealt_to_champions,
                'true_damage_dealt': self.true_damage_dealt_to_champions,
                'damage_self_mitigated': self.damage_self_mitigated,

                # Vision details
                'wards_placed': self.wards_placed,
                'wards_killed': self.wards_killed,

                # Combat details
                'first_blood': self.first_blood,
                'first_blood_assist': self.first_blood_assist,
                'first_tower': self.first_tower,
                'first_tower_assist': self.first_tower_assist,
                'largest_killing_spree': self.largest_killing_spree,
                'largest_multi_kill': self.largest_multi_kill,

                # Objectives
                'baron_kills': self.baron_kills,
                'dragon_kills': self.dragon_kills,
                'turret_kills': self.turret_kills,
                'inhibitor_kills': self.inhibitor_kills,

                # Items
                'items': [self.item0, self.item1, self.item2, self.item3,
                         self.item4, self.item5, self.item6],
                'items_purchased': self.items_purchased,

                # Summoners
                'summoner_spells': [self.summoner1_id, self.summoner2_id],
                'summoner_casts': [self.summoner1_casts, self.summoner2_casts],

                # Spell casts
                'spell_casts': [self.spell1_casts, self.spell2_casts,
                               self.spell3_casts, self.spell4_casts],

                # Runes
                'perks': self.perks,

                # Advanced
                'time_ccing_others': self.time_ccing_others,
                'gold_per_minute': float(self.gold_per_minute) if self.gold_per_minute else None,
            })

        return base_dict


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
    win = db.Column(db.Boolean, nullable=False)

    # Objectives (kills count)
    baron_kills = db.Column(db.Integer, default=0)
    dragon_kills = db.Column(db.Integer, default=0)
    herald_kills = db.Column(db.Integer, default=0)
    tower_kills = db.Column(db.Integer, default=0)
    inhibitor_kills = db.Column(db.Integer, default=0)
    atakhan_kills = db.Column(db.Integer, default=0)  # Season 15+ objective
    horde_kills = db.Column(db.Integer, default=0)    # Voidgrubs (Season 14-15)

    # First objective flags
    first_baron = db.Column(db.Boolean, default=False)
    first_dragon = db.Column(db.Boolean, default=False)
    first_herald = db.Column(db.Boolean, default=False)
    first_tower = db.Column(db.Boolean, default=False)
    first_blood = db.Column(db.Boolean, default=False)
    first_inhibitor = db.Column(db.Boolean, default=False)
    first_atakhan = db.Column(db.Boolean, default=False)
    first_horde = db.Column(db.Boolean, default=False)

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
            'side': 'blue' if self.riot_team_id == 100 else 'red',
            'team_id': str(self.team_id) if self.team_id else None,
            'win': self.win,

            # Objectives
            'baron_kills': self.baron_kills,
            'dragon_kills': self.dragon_kills,
            'herald_kills': self.herald_kills,
            'tower_kills': self.tower_kills,
            'inhibitor_kills': self.inhibitor_kills,
            'atakhan_kills': self.atakhan_kills,
            'horde_kills': self.horde_kills,

            # First objectives
            'first_baron': self.first_baron,
            'first_dragon': self.first_dragon,
            'first_herald': self.first_herald,
            'first_tower': self.first_tower,
            'first_blood': self.first_blood,
            'first_inhibitor': self.first_inhibitor,
            'first_atakhan': self.first_atakhan,
            'first_horde': self.first_horde,

            # Bans with phase mapping
            'bans': self.bans,
            'bans_phase1': self.get_bans_by_phase(1),
            'bans_phase2': self.get_bans_by_phase(2),
        }

    def get_bans_by_phase(self, phase):
        """Extract bans for specific phase

        Args:
            phase: 1 for first ban phase, 2 for second ban phase

        Returns:
            List of champion IDs banned in that phase
        """
        if not self.bans:
            return []

        # Blue team (100): Phase 1 = turns 1,3,5 | Phase 2 = turns 8,10
        # Red team (200):  Phase 1 = turns 2,4,6 | Phase 2 = turns 7,9
        if self.riot_team_id == 100:
            phase_turns = [1, 3, 5] if phase == 1 else [8, 10]
        else:  # 200
            phase_turns = [2, 4, 6] if phase == 1 else [7, 9]

        return [
            ban['championId']
            for ban in self.bans
            if ban['pickTurn'] in phase_turns
        ]
