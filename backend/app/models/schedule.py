"""
Team Schedule & Scrim Planning models
"""
from datetime import datetime, time
from app import db
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
import uuid
import json


class AvailabilityWeek(db.Model):
    """Availability week for team planning"""
    __tablename__ = 'availability_weeks'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    year = db.Column(db.Integer, nullable=False)
    week_number = db.Column(db.Integer, nullable=False)  # Calendar week (1-53)
    start_date = db.Column(db.Date, nullable=False)      # Monday
    end_date = db.Column(db.Date, nullable=False)        # Sunday
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    availabilities = db.relationship('PlayerAvailability', back_populates='week', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<AvailabilityWeek {self.year}-W{self.week_number}>'


class PlayerAvailability(db.Model):
    """Player availability per day"""
    __tablename__ = 'player_availability'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    week_id = db.Column(UUID(as_uuid=True), db.ForeignKey('availability_weeks.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    player_name = db.Column(db.String(100), nullable=False)  # Just a name, not linked to players table
    role = db.Column(db.String(20))  # Optional role indicator (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)

    # Availability status
    status = db.Column(db.String(20), nullable=False)  # available, unavailable, tentative, all_day
    time_from = db.Column(db.Time)  # Available from (NULL when unavailable/all_day) - DEPRECATED, use time_ranges
    time_to = db.Column(db.Time)    # Available until (optional) - DEPRECATED, use time_ranges
    time_ranges = db.Column(JSONB)  # Array of {from, to} objects for multiple time slots

    # Metadata
    confidence = db.Column(db.String(20), default='confirmed')  # confirmed, tentative
    notes = db.Column(db.Text)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.String(100))  # Who updated (for Discord bot)

    # Relationships
    week = db.relationship('AvailabilityWeek', back_populates='availabilities')

    def __repr__(self):
        return f'<PlayerAvailability {self.date} {self.player_name} {self.status}>'

    def to_dict(self):
        """Convert to dictionary"""
        # Use time_ranges if available, otherwise fall back to time_from/time_to
        time_ranges = self.time_ranges if self.time_ranges else None

        # Backwards compatibility: if no time_ranges but has time_from, create range
        if not time_ranges and self.time_from:
            time_ranges = [{
                'from': self.time_from.isoformat(),
                'to': self.time_to.isoformat() if self.time_to else None
            }]

        return {
            'id': str(self.id),
            'week_id': str(self.week_id),
            'date': self.date.isoformat(),
            'player_name': self.player_name,
            'role': self.role,
            'status': self.status,
            'time_ranges': time_ranges,
            # Keep for backwards compatibility
            'time_from': self.time_from.isoformat() if self.time_from else None,
            'time_to': self.time_to.isoformat() if self.time_to else None,
            'confidence': self.confidence,
            'notes': self.notes,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'updated_by': self.updated_by
        }


class ScrimBlock(db.Model):
    """Scrim organization and details"""
    __tablename__ = 'scrim_blocks'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Opponent info
    opponent_name = db.Column(db.String(100), nullable=False)
    opponent_opgg_url = db.Column(db.Text)
    opponent_rating = db.Column(db.String(50))  # e.g., "Masters 200 LP" or "⭐⭐⭐⭐"
    contact_method = db.Column(db.String(50))   # Discord, Twitter, Website, Other
    contact_details = db.Column(db.Text)        # Additional contact info

    # Scrim details
    scheduled_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    num_games = db.Column(db.Integer, default=2)
    draft_mode = db.Column(db.String(20), default='normal')  # normal, fearless

    # Training
    training_goal = db.Column(db.Text)  # What to practice
    notes = db.Column(db.Text)          # Additional context

    # Status
    status = db.Column(db.String(20), default='scheduled')  # scheduled, completed, cancelled
    result = db.Column(db.String(50))   # e.g., "2-1" when completed

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    event = db.relationship('TeamEvent', back_populates='scrim_block', uselist=False)
    draft_prep = db.relationship('ScrimDraftPrep', back_populates='scrim_block', uselist=False, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<ScrimBlock vs {self.opponent_name} on {self.scheduled_date}>'

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': str(self.id),
            'opponent_name': self.opponent_name,
            'opponent_opgg_url': self.opponent_opgg_url,
            'opponent_rating': self.opponent_rating,
            'contact_method': self.contact_method,
            'contact_details': self.contact_details,
            'scheduled_date': self.scheduled_date.isoformat(),
            'start_time': self.start_time.isoformat(),
            'num_games': self.num_games,
            'draft_mode': self.draft_mode,
            'training_goal': self.training_goal,
            'notes': self.notes,
            'status': self.status,
            'result': self.result,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'event_id': str(self.event.id) if self.event else None,
            'draft_prep': self.draft_prep.to_dict() if self.draft_prep else None
        }


class TeamEvent(db.Model):
    """Team calendar events (scrims, PL games, custom)"""
    __tablename__ = 'team_events'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic info
    title = db.Column(db.String(200), nullable=False)
    event_type = db.Column(db.String(20), nullable=False)  # scrim, prime_league, custom
    event_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    meeting_time = db.Column(db.Time)  # When team should be ready (default: -15 min)

    # Details
    description = db.Column(db.Text)
    location = db.Column(db.String(200))  # e.g., "Discord Server X"

    # Scrim-specific (NULL for other events)
    scrim_block_id = db.Column(UUID(as_uuid=True), db.ForeignKey('scrim_blocks.id', ondelete='CASCADE'))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    scrim_block = db.relationship('ScrimBlock', back_populates='event')

    def __repr__(self):
        return f'<TeamEvent {self.title} on {self.event_date}>'

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': str(self.id),
            'title': self.title,
            'event_type': self.event_type,
            'event_date': self.event_date.isoformat(),
            'start_time': self.start_time.isoformat(),
            'meeting_time': self.meeting_time.isoformat() if self.meeting_time else None,
            'description': self.description,
            'location': self.location,
            'scrim_block_id': str(self.scrim_block_id) if self.scrim_block_id else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ScrimDraftPrep(db.Model):
    """Scrim draft preparation (mini draft board)"""
    __tablename__ = 'scrim_draft_prep'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scrim_block_id = db.Column(UUID(as_uuid=True), db.ForeignKey('scrim_blocks.id', ondelete='CASCADE'), nullable=False)

    # Blue Side
    blue_bans = db.Column(ARRAY(db.Integer), default=[])   # Champion IDs
    blue_picks = db.Column(ARRAY(db.Integer), default=[])  # Champion IDs

    # Red Side
    red_bans = db.Column(ARRAY(db.Integer), default=[])
    red_picks = db.Column(ARRAY(db.Integer), default=[])

    # Notes
    blue_notes = db.Column(db.Text)
    red_notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    scrim_block = db.relationship('ScrimBlock', back_populates='draft_prep')

    def __repr__(self):
        return f'<ScrimDraftPrep for {self.scrim_block_id}>'

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': str(self.id),
            'scrim_block_id': str(self.scrim_block_id),
            'blue_bans': self.blue_bans or [],
            'blue_picks': self.blue_picks or [],
            'red_bans': self.red_bans or [],
            'red_picks': self.red_picks or [],
            'blue_notes': self.blue_notes,
            'red_notes': self.red_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
