"""
WebSocket event handlers
"""
from flask import request
from flask_socketio import emit, join_room, leave_room
from app import socketio
import logging

logger = logging.getLogger(__name__)


@socketio.on('connect', namespace='/teams')
def handle_connect():
    """Handle client connection"""
    logger.info(f"[WebSocket] Client connected: {request.sid}")
    emit('connected', {'message': 'Successfully connected to teams namespace'})


@socketio.on('disconnect', namespace='/teams')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f"[WebSocket] Client disconnected: {request.sid}")


@socketio.on('join_team', namespace='/teams')
def handle_join_team(data):
    """Handle client joining a team room"""
    team_id = data.get('team_id')
    if team_id:
        join_room(f"team_{team_id}")
        logger.info(f"[WebSocket] Client {request.sid} joined team room: {team_id}")
        emit('joined_team', {'team_id': team_id, 'message': f'Joined team {team_id}'})


@socketio.on('leave_team', namespace='/teams')
def handle_leave_team(data):
    """Handle client leaving a team room"""
    team_id = data.get('team_id')
    if team_id:
        leave_room(f"team_{team_id}")
        logger.info(f"[WebSocket] Client {request.sid} left team room: {team_id}")
        emit('left_team', {'team_id': team_id, 'message': f'Left team {team_id}'})
