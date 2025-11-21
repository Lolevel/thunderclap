import { useEffect } from 'react';
import { mutate } from 'swr';
import { useWebSocket } from '../contexts/WebSocketContext';
import { scheduleKeys } from './api/useSchedule';

/**
 * Hook for listening to schedule WebSocket events
 * Provides live updates across all users for availability, events, and scrims
 */
export const useScheduleSocket = (callbacks = {}) => {
	const { socket } = useWebSocket();

	useEffect(() => {
		if (!socket || !socket.connected) {
			console.log('[ScheduleSocket] WebSocket not available or not connected, skipping listeners');
			return;
		}

		console.log('[ScheduleSocket] Setting up listeners');

		// ============================================================
		// AVAILABILITY EVENTS
		// ============================================================

		const handleAvailabilityUpdated = (data) => {
			console.log('[ScheduleSocket] Availability updated:', data);

			// Call custom callback if provided
			if (callbacks.onAvailabilityUpdated) {
				callbacks.onAvailabilityUpdated(data);
			}
		};

		const handleAvailabilityDeleted = (data) => {
			console.log('[ScheduleSocket] Availability deleted:', data);

			// Call custom callback if provided
			if (callbacks.onAvailabilityDeleted) {
				callbacks.onAvailabilityDeleted(data);
			}
		};

		// ============================================================
		// EVENT EVENTS
		// ============================================================

		const handleEventCreated = (data) => {
			console.log('[ScheduleSocket] Event created:', data);

			// Invalidate events cache
			mutate((key) => typeof key === 'string' && key.startsWith('/schedule/events'));

			if (callbacks.onEventCreated) {
				callbacks.onEventCreated(data);
			}
		};

		const handleEventUpdated = (data) => {
			console.log('[ScheduleSocket] Event updated:', data);

			// Invalidate events cache
			mutate((key) => typeof key === 'string' && key.startsWith('/schedule/events'));

			if (callbacks.onEventUpdated) {
				callbacks.onEventUpdated(data);
			}
		};

		const handleEventDeleted = (data) => {
			console.log('[ScheduleSocket] Event deleted:', data);

			// Invalidate events cache
			mutate((key) => typeof key === 'string' && key.startsWith('/schedule/events'));

			if (callbacks.onEventDeleted) {
				callbacks.onEventDeleted(data);
			}
		};

		// ============================================================
		// SCRIM EVENTS
		// ============================================================

		const handleScrimCreated = (data) => {
			console.log('[ScheduleSocket] Scrim created:', data);

			// Invalidate scrims and events cache (scrim creates an event)
			mutate((key) => typeof key === 'string' && key.startsWith('/schedule/scrims'));
			mutate((key) => typeof key === 'string' && key.startsWith('/schedule/events'));

			if (callbacks.onScrimCreated) {
				callbacks.onScrimCreated(data);
			}
		};

		const handleScrimUpdated = (data) => {
			console.log('[ScheduleSocket] Scrim updated:', data);

			// Invalidate scrims and events cache
			mutate((key) => typeof key === 'string' && key.startsWith('/schedule/scrims'));
			mutate((key) => typeof key === 'string' && key.startsWith('/schedule/events'));

			if (callbacks.onScrimUpdated) {
				callbacks.onScrimUpdated(data);
			}
		};

		const handleScrimDeleted = (data) => {
			console.log('[ScheduleSocket] Scrim deleted:', data);

			// Invalidate scrims and events cache
			mutate((key) => typeof key === 'string' && key.startsWith('/schedule/scrims'));
			mutate((key) => typeof key === 'string' && key.startsWith('/schedule/events'));

			if (callbacks.onScrimDeleted) {
				callbacks.onScrimDeleted(data);
			}
		};

		// ============================================================
		// REGISTER LISTENERS
		// ============================================================

		socket.on('availability_updated', handleAvailabilityUpdated);
		socket.on('availability_deleted', handleAvailabilityDeleted);
		socket.on('event_created', handleEventCreated);
		socket.on('event_updated', handleEventUpdated);
		socket.on('event_deleted', handleEventDeleted);
		socket.on('scrim_created', handleScrimCreated);
		socket.on('scrim_updated', handleScrimUpdated);
		socket.on('scrim_deleted', handleScrimDeleted);

		console.log('[ScheduleSocket] Listeners registered');

		// ============================================================
		// CLEANUP
		// ============================================================

		return () => {
			console.log('[ScheduleSocket] Cleaning up listeners');
			socket.off('availability_updated', handleAvailabilityUpdated);
			socket.off('availability_deleted', handleAvailabilityDeleted);
			socket.off('event_created', handleEventCreated);
			socket.off('event_updated', handleEventUpdated);
			socket.off('event_deleted', handleEventDeleted);
			socket.off('scrim_created', handleScrimCreated);
			socket.off('scrim_updated', handleScrimUpdated);
			socket.off('scrim_deleted', handleScrimDeleted);
		};
	}, [socket, callbacks]);

	return null;
};
