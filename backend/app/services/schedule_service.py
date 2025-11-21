"""
Schedule Service - Handles availability and scrim management logic
"""
from datetime import datetime, date, timedelta, time
from typing import List, Dict, Optional, Tuple
from app import db
from app.models.schedule import (
    AvailabilityWeek,
    PlayerAvailability,
    ScrimBlock,
    TeamEvent,
    ScrimDraftPrep
)
from sqlalchemy import and_, or_


class ScheduleService:
    """Service for managing team schedules and scrims"""

    @staticmethod
    def get_or_create_week(year: int, week_number: int) -> AvailabilityWeek:
        """
        Get or create an availability week

        Args:
            year: Year (e.g., 2025)
            week_number: Calendar week number (1-53)

        Returns:
            AvailabilityWeek instance
        """
        week = AvailabilityWeek.query.filter_by(
            year=year,
            week_number=week_number
        ).first()

        if not week:
            # Calculate Monday and Sunday for this week
            # ISO calendar: Week starts on Monday
            first_day_of_year = date(year, 1, 1)
            # Find the Monday of week 1
            days_to_monday = (7 - first_day_of_year.weekday()) % 7
            if days_to_monday > 3:  # If Jan 1 is Thu-Sun, week 1 starts next Monday
                days_to_monday -= 7
            week_1_monday = first_day_of_year + timedelta(days=days_to_monday)

            # Calculate start date for requested week
            start_date = week_1_monday + timedelta(weeks=week_number - 1)
            end_date = start_date + timedelta(days=6)

            week = AvailabilityWeek(
                year=year,
                week_number=week_number,
                start_date=start_date,
                end_date=end_date
            )
            db.session.add(week)
            db.session.commit()

        return week

    @staticmethod
    def get_week_range(start_date: date, end_date: date) -> List[AvailabilityWeek]:
        """Get all weeks in a date range"""
        return AvailabilityWeek.query.filter(
            and_(
                AvailabilityWeek.start_date <= end_date,
                AvailabilityWeek.end_date >= start_date
            )
        ).order_by(AvailabilityWeek.start_date).all()

    @staticmethod
    def set_availability(
        week_id: str,
        date: date,
        player_name: str,
        status: str,
        role: Optional[str] = None,
        time_ranges: Optional[list] = None,
        time_from: Optional[time] = None,  # Legacy support
        time_to: Optional[time] = None,    # Legacy support
        confidence: str = 'confirmed',
        notes: Optional[str] = None,
        updated_by: Optional[str] = None
    ) -> PlayerAvailability:
        """
        Set or update availability for a player on a specific day

        Args:
            week_id: Week UUID
            date: Date to set availability
            player_name: Player name
            status: Status (available, unavailable, tentative, all_day)
            role: Optional role indicator (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)
            time_ranges: List of {from, to} time range dicts
            time_from: Available from time (DEPRECATED - use time_ranges)
            time_to: Available until time (DEPRECATED - use time_ranges)
            confidence: confirmed or tentative
            notes: Optional notes
            updated_by: Who updated

        Returns:
            PlayerAvailability instance
        """
        # Check if availability exists
        availability = PlayerAvailability.query.filter_by(
            week_id=week_id,
            date=date,
            player_name=player_name
        ).first()

        if availability:
            # Update existing
            availability.status = status
            availability.role = role
            availability.time_ranges = time_ranges
            # Keep legacy fields for backwards compat
            if time_from:
                availability.time_from = time_from
                availability.time_to = time_to
            availability.confidence = confidence
            availability.notes = notes
            availability.updated_by = updated_by
            availability.updated_at = datetime.utcnow()
        else:
            # Create new
            availability = PlayerAvailability(
                week_id=week_id,
                date=date,
                player_name=player_name,
                role=role,
                status=status,
                time_ranges=time_ranges,
                time_from=time_from,  # Legacy
                time_to=time_to,      # Legacy
                confidence=confidence,
                notes=notes,
                updated_by=updated_by
            )
            db.session.add(availability)

        db.session.commit()
        return availability

    @staticmethod
    def get_week_availability(week_id: str) -> List[PlayerAvailability]:
        """Get all availability entries for a week"""
        return PlayerAvailability.query.filter_by(week_id=week_id).order_by(
            PlayerAvailability.date,
            PlayerAvailability.role
        ).all()

    @staticmethod
    def calculate_overlaps(week_id: str) -> List[Dict]:
        """
        Calculate when all 5 main roles are available

        Args:
            week_id: Week UUID

        Returns:
            List of overlap periods with date and time range
        """
        availabilities = ScheduleService.get_week_availability(week_id)

        # Group by date
        by_date = {}
        for avail in availabilities:
            if avail.role == 'COACH':  # Skip coach
                continue
            if avail.date not in by_date:
                by_date[avail.date] = []
            by_date[avail.date].append(avail)

        overlaps = []
        main_roles = {'TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'}

        for date, day_availabilities in by_date.items():
            # Check if all 5 main roles have entries
            roles_present = {a.role for a in day_availabilities}
            if not main_roles.issubset(roles_present):
                continue  # Not all roles have availability set

            # Check if all are available (not unavailable)
            available_roles = [a for a in day_availabilities if a.status != 'unavailable']
            if len(available_roles) < 5:
                continue  # Not all 5 are available

            # Check for all_day
            all_day_count = sum(1 for a in day_availabilities if a.status == 'all_day')
            if all_day_count == 5:
                overlaps.append({
                    'date': date.isoformat(),
                    'time_from': None,
                    'time_to': None,
                    'all_day': True,
                    'all_confirmed': all(a.confidence == 'confirmed' for a in day_availabilities)
                })
                continue

            # Calculate time overlap
            # Find latest start time and earliest end time
            times = []
            for a in day_availabilities:
                if a.status == 'all_day':
                    times.append((time(0, 0), time(23, 59)))
                elif a.time_from:
                    times.append((a.time_from, a.time_to if a.time_to else time(23, 59)))
                else:
                    times = []  # Invalid time data
                    break

            if not times or len(times) < 5:
                continue

            # Find overlap
            latest_start = max(t[0] for t in times)
            earliest_end = min(t[1] for t in times)

            if latest_start < earliest_end:
                overlaps.append({
                    'date': date.isoformat(),
                    'time_from': latest_start.isoformat(),
                    'time_to': earliest_end.isoformat(),
                    'all_day': False,
                    'all_confirmed': all(a.confidence == 'confirmed' for a in day_availabilities)
                })

        return overlaps

    @staticmethod
    def create_scrim(
        opponent_name: str,
        scheduled_date: date,
        start_time: time,
        meeting_time: Optional[time] = None,
        **kwargs
    ) -> Tuple[ScrimBlock, TeamEvent]:
        """
        Create a scrim block and associated event

        Args:
            opponent_name: Opponent team name
            scheduled_date: Date of scrim
            start_time: Start time
            meeting_time: Meeting time (default -15 min)
            **kwargs: Additional scrim details

        Returns:
            Tuple of (ScrimBlock, TeamEvent)
        """
        # Create scrim block
        scrim = ScrimBlock(
            opponent_name=opponent_name,
            scheduled_date=scheduled_date,
            start_time=start_time,
            **{k: v for k, v in kwargs.items() if k in [
                'opponent_opgg_url', 'opponent_rating', 'contact_method',
                'contact_details', 'num_games', 'draft_mode', 'training_goal',
                'notes', 'status', 'result'
            ]}
        )
        db.session.add(scrim)
        db.session.flush()  # Get scrim ID

        # Calculate meeting time if not provided
        if not meeting_time:
            # Default: 15 minutes before start
            dt = datetime.combine(scheduled_date, start_time)
            meeting_dt = dt - timedelta(minutes=15)
            meeting_time = meeting_dt.time()

        # Create event
        event = TeamEvent(
            title=f"Scrim vs {opponent_name}",
            event_type='scrim',
            event_date=scheduled_date,
            start_time=start_time,
            meeting_time=meeting_time,
            description=f"{scrim.num_games} Games - {scrim.draft_mode.capitalize()} Draft",
            scrim_block_id=scrim.id
        )
        db.session.add(event)

        db.session.commit()
        return scrim, event

    @staticmethod
    def update_scrim(scrim_id: str, **kwargs) -> ScrimBlock:
        """Update scrim block and associated event"""
        scrim = ScrimBlock.query.get(scrim_id)
        if not scrim:
            raise ValueError(f"Scrim not found: {scrim_id}")

        # Update scrim
        for key, value in kwargs.items():
            if hasattr(scrim, key):
                setattr(scrim, key, value)

        # Update associated event if exists
        if scrim.event:
            if 'opponent_name' in kwargs:
                scrim.event.title = f"Scrim vs {kwargs['opponent_name']}"
            if 'scheduled_date' in kwargs:
                scrim.event.event_date = kwargs['scheduled_date']
            if 'start_time' in kwargs:
                scrim.event.start_time = kwargs['start_time']
            if 'num_games' in kwargs or 'draft_mode' in kwargs:
                num_games = kwargs.get('num_games', scrim.num_games)
                draft_mode = kwargs.get('draft_mode', scrim.draft_mode)
                scrim.event.description = f"{num_games} Games - {draft_mode.capitalize()} Draft"

        scrim.updated_at = datetime.utcnow()
        db.session.commit()
        return scrim

    @staticmethod
    def delete_scrim(scrim_id: str):
        """Delete scrim block (event will cascade delete)"""
        scrim = ScrimBlock.query.get(scrim_id)
        if not scrim:
            raise ValueError(f"Scrim not found: {scrim_id}")

        db.session.delete(scrim)
        db.session.commit()

    @staticmethod
    def get_scrims(
        status: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> List[ScrimBlock]:
        """Get scrims with filters"""
        query = ScrimBlock.query

        if status:
            query = query.filter_by(status=status)

        if from_date:
            query = query.filter(ScrimBlock.scheduled_date >= from_date)

        if to_date:
            query = query.filter(ScrimBlock.scheduled_date <= to_date)

        return query.order_by(ScrimBlock.scheduled_date, ScrimBlock.start_time).all()

    @staticmethod
    def set_draft_prep(scrim_id: str, **kwargs) -> ScrimDraftPrep:
        """Set or update draft preparation for a scrim"""
        draft_prep = ScrimDraftPrep.query.filter_by(scrim_block_id=scrim_id).first()

        if draft_prep:
            # Update
            for key, value in kwargs.items():
                if hasattr(draft_prep, key):
                    setattr(draft_prep, key, value)
            draft_prep.updated_at = datetime.utcnow()
        else:
            # Create
            draft_prep = ScrimDraftPrep(scrim_block_id=scrim_id, **kwargs)
            db.session.add(draft_prep)

        db.session.commit()
        return draft_prep

    @staticmethod
    def create_event(
        title: str,
        event_type: str,
        event_date: date,
        start_time: time,
        **kwargs
    ) -> TeamEvent:
        """Create a custom team event (non-scrim)"""
        event = TeamEvent(
            title=title,
            event_type=event_type,
            event_date=event_date,
            start_time=start_time,
            **{k: v for k, v in kwargs.items() if k in [
                'meeting_time', 'description', 'location'
            ]}
        )
        db.session.add(event)
        db.session.commit()
        return event

    @staticmethod
    def get_events(
        event_type: Optional[List[str]] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> List[TeamEvent]:
        """Get events with filters"""
        query = TeamEvent.query

        if event_type:
            query = query.filter(TeamEvent.event_type.in_(event_type))

        if from_date:
            query = query.filter(TeamEvent.event_date >= from_date)

        if to_date:
            query = query.filter(TeamEvent.event_date <= to_date)

        return query.order_by(TeamEvent.event_date, TeamEvent.start_time).all()

    @staticmethod
    def delete_event(event_id: str):
        """Delete an event (if it's a scrim event, do not allow - delete scrim instead)"""
        event = TeamEvent.query.get(event_id)
        if not event:
            raise ValueError(f"Event not found: {event_id}")

        if event.scrim_block_id:
            raise ValueError("Cannot delete scrim event directly. Delete the scrim block instead.")

        db.session.delete(event)
        db.session.commit()
