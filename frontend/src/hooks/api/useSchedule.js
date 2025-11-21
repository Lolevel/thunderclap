import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import {
	getAvailabilityWeeks,
	getAvailability,
	createWeek,
	setAvailability as apiSetAvailability,
	updateAvailability as apiUpdateAvailability,
	deleteAvailability as apiDeleteAvailability,
	getEvents,
	getEvent,
	createEvent as apiCreateEvent,
	updateEvent as apiUpdateEvent,
	deleteEvent as apiDeleteEvent,
	getScrims,
	getScrim,
	createScrim as apiCreateScrim,
	updateScrim as apiUpdateScrim,
	deleteScrim as apiDeleteScrim,
	completeScrim as apiCompleteScrim,
} from '../../lib/api';

// Cache keys (no teamId - schedule is global for own team)
export const scheduleKeys = {
	weeks: () => '/schedule/availability/weeks',
	availability: (weekId) => `/schedule/availability?week_id=${weekId}`,
	events: (params) => {
		const query = new URLSearchParams(params).toString();
		return `/schedule/events${query ? `?${query}` : ''}`;
	},
	event: (eventId) => `/schedule/events/${eventId}`,
	scrims: (params) => {
		const query = new URLSearchParams(params).toString();
		return `/schedule/scrims${query ? `?${query}` : ''}`;
	},
	scrim: (scrimId) => `/schedule/scrims/${scrimId}`,
};

// ============================================================
// AVAILABILITY HOOKS
// ============================================================

export const useAvailabilityWeeks = (activeOnly = true) => {
	const { data, error, isLoading, mutate: mutateWeeks } = useSWR(
		scheduleKeys.weeks(),
		() => getAvailabilityWeeks(activeOnly).then(res => res.data),
		{
			revalidateOnFocus: false,
			dedupingInterval: 5000,
		}
	);

	const createNewWeek = useCallback(async (year, weekNumber) => {
		try {
			const response = await createWeek(year, weekNumber);
			mutateWeeks(); // Revalidate weeks list
			return response.data;
		} catch (error) {
			console.error('Failed to create week:', error);
			throw error;
		}
	}, [mutateWeeks]);

	return {
		weeks: data,
		error,
		isLoading,
		createWeek: createNewWeek,
		refresh: mutateWeeks,
	};
};

export const useAvailability = (weekId) => {
	const key = weekId ? scheduleKeys.availability(weekId) : null;

	const { data, error, isLoading, mutate: mutateAvailability } = useSWR(
		key,
		() => getAvailability(weekId).then(res => res.data),
		{
			revalidateOnFocus: true,
			refreshInterval: 0, // Manual refresh only - WebSocket will trigger
			dedupingInterval: 2000,
		}
	);

	const setPlayerAvailability = useCallback(async (availabilityData) => {
		try {
			const response = await apiSetAvailability(availabilityData);

			// Optimistically update local data
			mutateAvailability((current) => {
				if (!current) return current;

				const newAvailability = response.data;
				const existing = current.availability.findIndex(
					a => a.week_id === newAvailability.week_id &&
						a.date === newAvailability.date &&
						a.player_name === newAvailability.player_name
				);

				if (existing >= 0) {
					// Update existing
					const updated = [...current.availability];
					updated[existing] = newAvailability;
					return { ...current, availability: updated };
				} else {
					// Add new
					return {
						...current,
						availability: [...current.availability, newAvailability]
					};
				}
			}, { revalidate: false }); // Don't revalidate immediately - wait for WebSocket

			return response.data;
		} catch (error) {
			console.error('Failed to set availability:', error);
			throw error;
		}
	}, [mutateAvailability]);

	const updatePlayerAvailability = useCallback(async (availabilityId, updates) => {
		try {
			const response = await apiUpdateAvailability(availabilityId, updates);

			// Optimistically update
			mutateAvailability((current) => {
				if (!current) return current;

				const updated = current.availability.map(a =>
					a.id === availabilityId ? response.data : a
				);

				return { ...current, availability: updated };
			}, { revalidate: false });

			return response.data;
		} catch (error) {
			console.error('Failed to update availability:', error);
			throw error;
		}
	}, [mutateAvailability]);

	const removeAvailability = useCallback(async (availabilityId) => {
		try {
			await apiDeleteAvailability(availabilityId);

			// Optimistically remove
			mutateAvailability((current) => {
				if (!current) return current;

				const filtered = current.availability.filter(a => a.id !== availabilityId);
				return { ...current, availability: filtered };
			}, { revalidate: false });
		} catch (error) {
			console.error('Failed to delete availability:', error);
			throw error;
		}
	}, [mutateAvailability]);

	return {
		week: data?.week,
		availability: data?.availability || [],
		overlaps: data?.overlaps || [],
		error,
		isLoading,
		setAvailability: setPlayerAvailability,
		updateAvailability: updatePlayerAvailability,
		deleteAvailability: removeAvailability,
		refresh: mutateAvailability,
	};
};

// ============================================================
// EVENT HOOKS
// ============================================================

export const useEvents = (params = {}) => {
	const { data, error, isLoading, mutate: mutateEvents } = useSWR(
		scheduleKeys.events(params),
		() => getEvents(params).then(res => res.data),
		{
			revalidateOnFocus: false,
			dedupingInterval: 5000,
		}
	);

	const addEvent = useCallback(async (eventData) => {
		try {
			const response = await apiCreateEvent(eventData);

			// Optimistically add
			mutateEvents((current) => {
				if (!current) return [response.data];
				return [...current, response.data];
			}, { revalidate: false });

			return response.data;
		} catch (error) {
			console.error('Failed to create event:', error);
			throw error;
		}
	}, [mutateEvents]);

	const modifyEvent = useCallback(async (eventId, updates) => {
		try {
			const response = await apiUpdateEvent(eventId, updates);

			// Optimistically update
			mutateEvents((current) => {
				if (!current) return current;
				return current.map(e => e.id === eventId ? response.data : e);
			}, { revalidate: false });

			return response.data;
		} catch (error) {
			console.error('Failed to update event:', error);
			throw error;
		}
	}, [mutateEvents]);

	const removeEvent = useCallback(async (eventId) => {
		try {
			await apiDeleteEvent(eventId);

			// Optimistically remove
			mutateEvents((current) => {
				if (!current) return current;
				return current.filter(e => e.id !== eventId);
			}, { revalidate: false });
		} catch (error) {
			console.error('Failed to delete event:', error);
			throw error;
		}
	}, [mutateEvents]);

	return {
		events: data || [],
		error,
		isLoading,
		createEvent: addEvent,
		updateEvent: modifyEvent,
		deleteEvent: removeEvent,
		refresh: mutateEvents,
	};
};

export const useEvent = (eventId) => {
	const key = eventId ? scheduleKeys.event(eventId) : null;

	const { data, error, isLoading } = useSWR(
		key,
		() => getEvent(eventId).then(res => res.data),
		{
			revalidateOnFocus: false,
		}
	);

	return {
		event: data,
		error,
		isLoading,
	};
};

// ============================================================
// SCRIM HOOKS
// ============================================================

export const useScrims = (params = {}) => {
	const { data, error, isLoading, mutate: mutateScrims } = useSWR(
		scheduleKeys.scrims(params),
		() => getScrims(params).then(res => res.data),
		{
			revalidateOnFocus: false,
			dedupingInterval: 5000,
		}
	);

	const addScrim = useCallback(async (scrimData) => {
		try {
			const response = await apiCreateScrim(scrimData);

			// Optimistically add
			mutateScrims((current) => {
				if (!current) return current;
				// Note: response contains { scrim_id, event_id }, need to fetch full scrim
				return current; // Just revalidate
			}, { revalidate: true });

			// Also invalidate events cache since scrim creates an event
			mutate(scheduleKeys.events({}));

			return response.data;
		} catch (error) {
			console.error('Failed to create scrim:', error);
			throw error;
		}
	}, [mutateScrims]);

	const modifyScrim = useCallback(async (scrimId, updates) => {
		try {
			const response = await apiUpdateScrim(scrimId, updates);

			// Optimistically update
			mutateScrims((current) => {
				if (!current) return current;
				return current.map(s => s.id === scrimId ? response.data : s);
			}, { revalidate: false });

			// Also invalidate events cache
			mutate(scheduleKeys.events({}));

			return response.data;
		} catch (error) {
			console.error('Failed to update scrim:', error);
			throw error;
		}
	}, [mutateScrims]);

	const removeScrim = useCallback(async (scrimId) => {
		try {
			await apiDeleteScrim(scrimId);

			// Optimistically remove
			mutateScrims((current) => {
				if (!current) return current;
				return current.filter(s => s.id !== scrimId);
			}, { revalidate: false });

			// Also invalidate events cache
			mutate(scheduleKeys.events({}));
		} catch (error) {
			console.error('Failed to delete scrim:', error);
			throw error;
		}
	}, [mutateScrims]);

	const markComplete = useCallback(async (scrimId, resultData) => {
		try {
			const response = await apiCompleteScrim(scrimId, resultData);

			// Optimistically update status
			mutateScrims((current) => {
				if (!current) return current;
				return current.map(s => s.id === scrimId ? response.data : s);
			}, { revalidate: false });

			return response.data;
		} catch (error) {
			console.error('Failed to complete scrim:', error);
			throw error;
		}
	}, [mutateScrims]);

	return {
		scrims: data || [],
		error,
		isLoading,
		createScrim: addScrim,
		updateScrim: modifyScrim,
		deleteScrim: removeScrim,
		completeScrim: markComplete,
		refresh: mutateScrims,
	};
};

export const useScrim = (scrimId) => {
	const key = scrimId ? scheduleKeys.scrim(scrimId) : null;

	const { data, error, isLoading } = useSWR(
		key,
		() => getScrim(scrimId).then(res => res.data),
		{
			revalidateOnFocus: false,
		}
	);

	return {
		scrim: data,
		error,
		isLoading,
	};
};
