"""
Schedule routes - Availability, Events, and Scrim Management
"""

from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.schedule import (
    AvailabilityWeek,
    PlayerAvailability,
    ScrimBlock,
    TeamEvent,
    ScrimDraftPrep
)
from app.services.schedule_service import ScheduleService
from app.services.websocket_events import (
    broadcast_availability_updated,
    broadcast_availability_deleted,
    broadcast_event_created,
    broadcast_event_updated,
    broadcast_event_deleted,
    broadcast_scrim_created,
    broadcast_scrim_updated,
    broadcast_scrim_deleted,
)
from app.middleware.auth import require_auth
from datetime import datetime, date, time
from typing import List, Optional

bp = Blueprint("schedule", __name__, url_prefix="/api/schedule")

# TODO: Re-enable authentication after development
# @bp.before_request
# @require_auth
# def before_request():
#     pass


# ============================================================
# AVAILABILITY ENDPOINTS
# ============================================================

@bp.route("/availability/weeks", methods=["GET"])
def get_availability_weeks():
    """
    Get all availability weeks

    Query params:
        - active_only: bool (default: true)
    """
    active_only = request.args.get("active_only", "true").lower() == "true"

    query = AvailabilityWeek.query
    if active_only:
        query = query.filter_by(is_active=True)

    weeks = query.order_by(AvailabilityWeek.year, AvailabilityWeek.week_number).all()

    return jsonify([{
        "id": str(w.id),
        "year": w.year,
        "week_number": w.week_number,
        "start_date": w.start_date.isoformat(),
        "end_date": w.end_date.isoformat(),
        "is_active": w.is_active
    } for w in weeks])


@bp.route("/availability/week", methods=["POST"])
def create_week():
    """
    Create or get availability week

    Request body:
        {
            "year": 2025,
            "week_number": 47
        }
    """
    data = request.get_json()

    if "year" not in data or "week_number" not in data:
        return jsonify({"error": "year and week_number are required"}), 400

    week = ScheduleService.get_or_create_week(
        year=data["year"],
        week_number=data["week_number"]
    )

    return jsonify({
        "id": str(week.id),
        "year": week.year,
        "week_number": week.week_number,
        "start_date": week.start_date.isoformat(),
        "end_date": week.end_date.isoformat()
    }), 201


@bp.route("/availability", methods=["GET"])
def get_availability():
    """
    Get availability for a week

    Query params:
        - week_id: UUID (required)
    """
    week_id = request.args.get("week_id")
    if not week_id:
        return jsonify({"error": "week_id is required"}), 400

    week = AvailabilityWeek.query.get(week_id)
    if not week:
        return jsonify({"error": "Week not found"}), 404

    availabilities = ScheduleService.get_week_availability(week_id)
    overlaps = ScheduleService.calculate_overlaps(week_id)

    return jsonify({
        "week": {
            "id": str(week.id),
            "year": week.year,
            "week_number": week.week_number,
            "start_date": week.start_date.isoformat(),
            "end_date": week.end_date.isoformat()
        },
        "availability": [a.to_dict() for a in availabilities],
        "overlaps": overlaps
    })


@bp.route("/availability", methods=["POST"])
def set_availability():
    """
    Set or update availability for a player on a specific day

    Request body:
        {
            "week_id": "uuid",
            "date": "2025-11-20",
            "player_name": "PlayerName",
            "role": "TOP" (optional),
            "status": "available",
            "time_ranges": [{"from": "18:00", "to": "20:00"}, {"from": "21:00", "to": null}],
            "confidence": "confirmed",
            "notes": "..." (optional)
        }
    """
    data = request.get_json()

    required_fields = ["week_id", "date", "player_name", "status"]
    if not all(f in data for f in required_fields):
        return jsonify({"error": f"Missing required fields: {required_fields}"}), 400

    # Validate week exists
    week = AvailabilityWeek.query.get(data["week_id"])
    if not week:
        return jsonify({"error": "Week not found"}), 404

    # Parse date
    try:
        avail_date = datetime.fromisoformat(data["date"]).date()
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid date format: {str(e)}"}), 400

    # Handle time_ranges (new format) or time_from/time_to (legacy)
    time_ranges = data.get("time_ranges")
    if not time_ranges and data.get("time_from"):
        # Legacy format - convert to time_ranges
        time_ranges = [{
            "from": data["time_from"],
            "to": data.get("time_to")
        }]

    availability = ScheduleService.set_availability(
        week_id=data["week_id"],
        date=avail_date,
        player_name=data["player_name"],
        status=data["status"],
        role=data.get("role"),
        time_ranges=time_ranges,
        confidence=data.get("confidence", "confirmed"),
        notes=data.get("notes"),
        updated_by=data.get("updated_by")
    )

    # Broadcast WebSocket event
    broadcast_availability_updated(None, data["week_id"], availability.to_dict())

    return jsonify(availability.to_dict()), 201


@bp.route("/availability/<availability_id>", methods=["PUT"])
def update_availability(availability_id: str):
    """Update existing availability"""
    availability = PlayerAvailability.query.get(availability_id)
    if not availability:
        return jsonify({"error": "Availability not found"}), 404

    data = request.get_json()

    # Update fields
    if "status" in data:
        availability.status = data["status"]
    if "role" in data:
        availability.role = data["role"]
    if "time_from" in data:
        availability.time_from = datetime.fromisoformat(f"2000-01-01T{data['time_from']}").time() if data["time_from"] else None
    if "time_to" in data:
        availability.time_to = datetime.fromisoformat(f"2000-01-01T{data['time_to']}").time() if data["time_to"] else None
    if "confidence" in data:
        availability.confidence = data["confidence"]
    if "notes" in data:
        availability.notes = data["notes"]

    availability.updated_at = datetime.utcnow()
    db.session.commit()

    # Broadcast WebSocket event
    broadcast_availability_updated(None, str(availability.week_id), availability.to_dict())

    return jsonify(availability.to_dict())


@bp.route("/availability/<availability_id>", methods=["DELETE"])
def delete_availability(availability_id: str):
    """Delete availability (reset to not set)"""
    availability = PlayerAvailability.query.get(availability_id)
    if not availability:
        return jsonify({"error": "Availability not found"}), 404

    week_id = str(availability.week_id)

    db.session.delete(availability)
    db.session.commit()

    # Broadcast WebSocket event
    broadcast_availability_deleted(None, week_id, availability_id)

    return jsonify({"message": "Availability deleted"}), 200


# ============================================================
# EVENT ENDPOINTS
# ============================================================

@bp.route("/events", methods=["GET"])
def get_events():
    """
    Get events

    Query params:
        - start_date: ISO date (optional)
        - end_date: ISO date (optional)
        - type: comma-separated types (optional): scrim,prime_league,custom
    """
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    event_types = request.args.get("type")

    # Parse dates
    from_date = datetime.fromisoformat(start_date).date() if start_date else None
    to_date = datetime.fromisoformat(end_date).date() if end_date else None

    # Parse types
    types = event_types.split(",") if event_types else None

    events = ScheduleService.get_events(
        event_type=types,
        from_date=from_date,
        to_date=to_date
    )

    return jsonify([e.to_dict() for e in events])


@bp.route("/events/<event_id>", methods=["GET"])
def get_event(event_id: str):
    """Get single event details"""
    event = TeamEvent.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    result = event.to_dict()

    # Include scrim details if scrim event
    if event.scrim_block:
        result["scrim_details"] = event.scrim_block.to_dict()

    return jsonify(result)


@bp.route("/events", methods=["POST"])
def create_event():
    """
    Create a custom event (non-scrim)

    Request body:
        {
            "title": "Team Meeting",
            "event_type": "custom",
            "event_date": "2025-11-20",
            "start_time": "18:00",
            "meeting_time": "18:00" (optional),
            "description": "..." (optional),
            "location": "Discord" (optional)
        }
    """
    data = request.get_json()

    required_fields = ["title", "event_type", "event_date", "start_time"]
    if not all(f in data for f in required_fields):
        return jsonify({"error": f"Missing required fields: {required_fields}"}), 400

    if data["event_type"] == "scrim":
        return jsonify({"error": "Use /scrims endpoint to create scrim events"}), 400

    # Parse dates
    try:
        event_date = datetime.fromisoformat(data["event_date"]).date()
        start_time = datetime.fromisoformat(f"2000-01-01T{data['start_time']}").time()
        meeting_time = datetime.fromisoformat(f"2000-01-01T{data['meeting_time']}").time() if data.get("meeting_time") else None
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid date/time format: {str(e)}"}), 400

    event = ScheduleService.create_event(
        title=data["title"],
        event_type=data["event_type"],
        event_date=event_date,
        start_time=start_time,
        meeting_time=meeting_time,
        description=data.get("description"),
        location=data.get("location")
    )

    # Broadcast WebSocket event
    broadcast_event_created(None, event.to_dict())

    return jsonify(event.to_dict()), 201


@bp.route("/events/<event_id>", methods=["PUT"])
def update_event(event_id: str):
    """Update event (non-scrim events only)"""
    event = TeamEvent.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    if event.scrim_block_id:
        return jsonify({"error": "Use /scrims endpoint to update scrim events"}), 400

    data = request.get_json()

    # Update fields
    if "title" in data:
        event.title = data["title"]
    if "event_date" in data:
        event.event_date = datetime.fromisoformat(data["event_date"]).date()
    if "start_time" in data:
        event.start_time = datetime.fromisoformat(f"2000-01-01T{data['start_time']}").time()
    if "meeting_time" in data:
        event.meeting_time = datetime.fromisoformat(f"2000-01-01T{data['meeting_time']}").time() if data["meeting_time"] else None
    if "description" in data:
        event.description = data["description"]
    if "location" in data:
        event.location = data["location"]

    event.updated_at = datetime.utcnow()
    db.session.commit()

    # Broadcast WebSocket event
    broadcast_event_updated(None, event.to_dict())

    return jsonify(event.to_dict())


@bp.route("/events/<event_id>", methods=["DELETE"])
def delete_event(event_id: str):
    """Delete event (non-scrim events only)"""
    event = TeamEvent.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    if event.scrim_block_id:
        return jsonify({"error": "Use /scrims endpoint to delete scrim events"}), 400

    try:
        ScheduleService.delete_event(event_id)

        # Broadcast WebSocket event
        broadcast_event_deleted(None, event_id)

        return jsonify({"message": "Event deleted"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ============================================================
# SCRIM ENDPOINTS
# ============================================================

@bp.route("/scrims", methods=["GET"])
def get_scrims():
    """
    Get scrims

    Query params:
        - status: scheduled, completed, cancelled (optional)
        - from_date: ISO date (optional)
        - to_date: ISO date (optional)
    """
    status = request.args.get("status")
    from_date_str = request.args.get("from_date")
    to_date_str = request.args.get("to_date")

    from_date = datetime.fromisoformat(from_date_str).date() if from_date_str else None
    to_date = datetime.fromisoformat(to_date_str).date() if to_date_str else None

    scrims = ScheduleService.get_scrims(
        status=status,
        from_date=from_date,
        to_date=to_date
    )

    return jsonify([s.to_dict() for s in scrims])


@bp.route("/scrims/<scrim_id>", methods=["GET"])
def get_scrim(scrim_id: str):
    """Get single scrim details"""
    scrim = ScrimBlock.query.get(scrim_id)
    if not scrim:
        return jsonify({"error": "Scrim not found"}), 404

    return jsonify(scrim.to_dict())


@bp.route("/scrims", methods=["POST"])
def create_scrim():
    """
    Create new scrim block

    Request body:
        {
            "opponent_name": "Team X",
            "opponent_opgg_url": "https://..." (optional),
            "opponent_rating": "Masters 200 LP" (optional),
            "contact_method": "Discord" (optional),
            "contact_details": "..." (optional),
            "scheduled_date": "2025-11-20",
            "start_time": "19:00",
            "meeting_time": "18:45" (optional, default -15min),
            "num_games": 2 (optional),
            "draft_mode": "normal" (optional),
            "training_goal": "..." (optional),
            "notes": "..." (optional),
            "draft_prep": {
                "blue_bans": [157, 234, ...],
                "blue_picks": [...],
                ...
            } (optional)
        }
    """
    data = request.get_json()

    required_fields = ["opponent_name", "scheduled_date", "start_time"]
    if not all(f in data for f in required_fields):
        return jsonify({"error": f"Missing required fields: {required_fields}"}), 400

    # Parse dates
    try:
        scheduled_date = datetime.fromisoformat(data["scheduled_date"]).date()
        start_time = datetime.fromisoformat(f"2000-01-01T{data['start_time']}").time()
        meeting_time = datetime.fromisoformat(f"2000-01-01T{data['meeting_time']}").time() if data.get("meeting_time") else None
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid date/time format: {str(e)}"}), 400

    # Create scrim
    scrim, event = ScheduleService.create_scrim(
        opponent_name=data["opponent_name"],
        scheduled_date=scheduled_date,
        start_time=start_time,
        meeting_time=meeting_time,
        opponent_opgg_url=data.get("opponent_opgg_url"),
        opponent_rating=data.get("opponent_rating"),
        contact_method=data.get("contact_method"),
        contact_details=data.get("contact_details"),
        num_games=data.get("num_games", 2),
        draft_mode=data.get("draft_mode", "normal"),
        training_goal=data.get("training_goal"),
        notes=data.get("notes")
    )

    # Add draft prep if provided
    if "draft_prep" in data:
        ScheduleService.set_draft_prep(
            scrim_id=str(scrim.id),
            **data["draft_prep"]
        )

    # Broadcast WebSocket event
    broadcast_scrim_created(None, scrim.to_dict())

    return jsonify({
        "scrim_id": str(scrim.id),
        "event_id": str(event.id)
    }), 201


@bp.route("/scrims/<scrim_id>", methods=["PUT"])
def update_scrim(scrim_id: str):
    """Update scrim block"""
    scrim = ScrimBlock.query.get(scrim_id)
    if not scrim:
        return jsonify({"error": "Scrim not found"}), 404

    data = request.get_json()

    # Parse dates if present
    if "scheduled_date" in data:
        data["scheduled_date"] = datetime.fromisoformat(data["scheduled_date"]).date()
    if "start_time" in data:
        data["start_time"] = datetime.fromisoformat(f"2000-01-01T{data['start_time']}").time()

    # Update draft prep separately if provided
    if "draft_prep" in data:
        draft_prep_data = data.pop("draft_prep")
        ScheduleService.set_draft_prep(scrim_id, **draft_prep_data)

    # Update scrim
    scrim = ScheduleService.update_scrim(scrim_id, **data)

    # Broadcast WebSocket event
    broadcast_scrim_updated(None, scrim.to_dict())

    return jsonify(scrim.to_dict())


@bp.route("/scrims/<scrim_id>", methods=["DELETE"])
def delete_scrim(scrim_id: str):
    """Delete scrim block (and associated event)"""
    scrim = ScrimBlock.query.get(scrim_id)
    if not scrim:
        return jsonify({"error": "Scrim not found"}), 404

    ScheduleService.delete_scrim(scrim_id)

    # Broadcast WebSocket event
    broadcast_scrim_deleted(None, scrim_id)

    return jsonify({"message": "Scrim deleted"}), 200


@bp.route("/scrims/<scrim_id>/complete", methods=["POST"])
def complete_scrim(scrim_id: str):
    """Mark scrim as completed"""
    scrim = ScrimBlock.query.get(scrim_id)
    if not scrim:
        return jsonify({"error": "Scrim not found"}), 404

    data = request.get_json() or {}

    scrim = ScheduleService.update_scrim(
        scrim_id,
        status="completed",
        result=data.get("result"),
        notes=data.get("notes", scrim.notes)
    )

    return jsonify(scrim.to_dict())
