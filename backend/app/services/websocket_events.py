"""
WebSocket Events Service
Handles real-time broadcasts for team imports and refreshes
"""
from app import socketio
from flask import current_app
import threading
import time


def _emit_with_context(event, data, namespace='/teams'):
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
        })
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
        })
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast refresh progress: {e}")


def broadcast_team_refresh_completed(team_id):
    """Broadcast that a team refresh has completed"""
    try:
        current_app.logger.info(f"[WebSocket] Broadcasting team_refresh_completed for {team_id}")
        _emit_with_context('team_refresh_completed', {
            'team_id': str(team_id),
            'message': 'Daten erfolgreich aktualisiert!'
        })
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
        })
    except Exception as e:
        current_app.logger.error(f"[WebSocket] Failed to broadcast refresh failure: {e}")
