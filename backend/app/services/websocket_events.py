"""
WebSocket Events Service
Handles real-time broadcasts for team imports and refreshes
"""
from app import socketio
from flask import current_app
import threading
import time


def _emit_with_context(event, data, namespace='/'):
    """
    Helper to emit Socket.IO events from background threads.
    Flask-SocketIO requires special handling for background thread emissions.
    """
    try:
        current_app.logger.info(f"[WebSocket] Emitting {event} to namespace {namespace}: {data}")
        socketio.emit(event, data, namespace=namespace)
        # Small sleep to ensure the event is processed
        time.sleep(0.01)
        current_app.logger.info(f"[WebSocket] Successfully emitted {event}")
        return True
    except Exception as e:
        try:
            current_app.logger.error(f"[WebSocket] Failed to emit {event}: {e}")
        except:
            print(f"[WebSocket] Failed to emit {event}: {e}")
        return False


def broadcast_team_import_started(team_id, team_name):
    """Broadcast that a team import has started"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting team_import_started for {team_id}")
        socketio.emit('team_import_started', {
            'team_id': str(team_id),
            'team_name': team_name,
            'message': f'Team "{team_name}" wird importiert...'
        }, namespace='/teams')
        current_app.logger.info(f"[WebSocket] Broadcast sent successfully")
    except Exception as e:
        print(f"[WebSocket] Failed to broadcast: {e}")


def broadcast_team_import_progress(team_id, progress, message, phase=None):
    """Broadcast team import progress"""
    try:
        socketio.emit('team_import_progress', {
            'team_id': str(team_id),
            'progress': progress,
            'phase': phase,
            'message': message
        }, namespace='/teams')
    except Exception as e:
        print(f"[WebSocket] Failed to broadcast progress: {e}")


def broadcast_team_import_completed(team_id, team_name):
    """Broadcast that a team import has completed"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting team_import_completed for {team_id}")
        socketio.emit('team_import_completed', {
            'team_id': str(team_id),
            'team_name': team_name,
            'message': f'Team "{team_name}" erfolgreich importiert!'
        }, namespace='/teams')
        current_app.logger.info(f"[WebSocket] Broadcast completed successfully")
    except Exception as e:
        print(f"[WebSocket] Failed to broadcast completion: {e}")


def broadcast_team_import_failed(team_id, team_name, error):
    """Broadcast that a team import has failed"""
    try:
        current_app.logger.error(f"[WebSocket] Broadcasting team_import_failed for {team_id}: {error}")
        socketio.emit('team_import_failed', {
            'team_id': str(team_id),
            'team_name': team_name,
            'error': str(error),
            'message': f'Import von "{team_name}" fehlgeschlagen'
        }, namespace='/teams')
    except Exception as e:
        print(f"[WebSocket] Failed to broadcast failure: {e}")


def broadcast_team_refresh_started(team_id):
    """Broadcast that a team refresh has started"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting team_refresh_started for {team_id}")
        _emit_with_context('team_refresh_started', {
            'team_id': str(team_id),
            'message': 'Daten werden aktualisiert...'
        }, namespace='/teams')
        current_app.logger.info(f"[WebSocket] team_refresh_started broadcast sent")
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast refresh start: {e}")


def broadcast_team_refresh_progress(team_id, status, phase, progress_percent, is_rate_limited=False):
    """Broadcast team refresh progress"""
    try:
        _emit_with_context('team_refresh_progress', {
            'team_id': str(team_id),
            'status': status,
            'phase': phase,
            'progress_percent': progress_percent,
            'is_rate_limited': is_rate_limited
        }, namespace='/teams')
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast refresh progress: {e}")


def broadcast_team_refresh_completed(team_id):
    """Broadcast that a team refresh has completed"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting team_refresh_completed for {team_id}")
        _emit_with_context('team_refresh_completed', {
            'team_id': str(team_id),
            'message': 'Daten erfolgreich aktualisiert!'
        }, namespace='/teams')
        current_app.logger.info(f"[WebSocket] team_refresh_completed broadcast sent")
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast refresh completion: {e}")


def broadcast_team_refresh_failed(team_id, error):
    """Broadcast that a team refresh has failed"""
    try:
        current_app.logger.error(f"[WebSocket] Broadcasting team_refresh_failed for {team_id}: {error}")
        _emit_with_context('team_refresh_failed', {
            'team_id': str(team_id),
            'error': str(error),
            'message': 'Aktualisierung fehlgeschlagen'
        }, namespace='/teams')
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast refresh failure: {e}")


# ============================================================
# SCHEDULE WEBSOCKET EVENTS
# ============================================================

def broadcast_availability_updated(team_id, week_id, availability_data):
    """Broadcast when availability is updated"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting availability_updated for team {team_id}, week {week_id}")
        _emit_with_context('availability_updated', {
            'team_id': str(team_id),
            'week_id': str(week_id),
            'availability': availability_data
        })
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast availability update: {e}")


def broadcast_availability_deleted(team_id, week_id, availability_id):
    """Broadcast when availability is deleted"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting availability_deleted for {availability_id}")
        _emit_with_context('availability_deleted', {
            'team_id': str(team_id),
            'week_id': str(week_id),
            'availability_id': str(availability_id)
        })
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast availability deletion: {e}")


def broadcast_event_created(team_id, event_data):
    """Broadcast when an event is created"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting event_created for team {team_id}")
        _emit_with_context('event_created', {
            'team_id': str(team_id),
            'event': event_data
        })
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast event creation: {e}")


def broadcast_event_updated(team_id, event_data):
    """Broadcast when an event is updated"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting event_updated for team {team_id}")
        _emit_with_context('event_updated', {
            'team_id': str(team_id),
            'event': event_data
        })
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast event update: {e}")


def broadcast_event_deleted(team_id, event_id):
    """Broadcast when an event is deleted"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting event_deleted for {event_id}")
        _emit_with_context('event_deleted', {
            'team_id': str(team_id),
            'event_id': str(event_id)
        })
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast event deletion: {e}")


def broadcast_scrim_created(team_id, scrim_data):
    """Broadcast when a scrim is created"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting scrim_created for team {team_id}")
        _emit_with_context('scrim_created', {
            'team_id': str(team_id),
            'scrim': scrim_data
        })
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast scrim creation: {e}")


def broadcast_scrim_updated(team_id, scrim_data):
    """Broadcast when a scrim is updated"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting scrim_updated for team {team_id}")
        _emit_with_context('scrim_updated', {
            'team_id': str(team_id),
            'scrim': scrim_data
        })
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast scrim update: {e}")


def broadcast_scrim_deleted(team_id, scrim_id):
    """Broadcast when a scrim is deleted"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting scrim_deleted for {scrim_id}")
        _emit_with_context('scrim_deleted', {
            'team_id': str(team_id),
            'scrim_id': str(scrim_id)
        })
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast scrim deletion: {e}")
