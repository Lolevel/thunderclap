import { useState, useEffect, useMemo } from 'react';
import { useAvailabilityWeeks, useAvailability } from '../../hooks/api/useSchedule';
import { useScheduleSocket } from '../../hooks/useScheduleSocket';
import { Calendar, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import AvailabilityModal from './AvailabilityModal';

// Default player names - can be made configurable later
const DEFAULT_PLAYERS = [
	'Player 1',
	'Player 2',
	'Player 3',
	'Player 4',
	'Player 5',
];

const STATUS_COLORS = {
	available: {
		confirmed: 'bg-purple-500/20 border-2 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/20',
		tentative: 'bg-purple-500/5 border-2 border-purple-500/40 text-purple-400/60 border-dashed',
	},
	unavailable: {
		confirmed: 'bg-slate-700/50 border-2 border-slate-600 text-slate-500',
		tentative: 'bg-slate-700/20 border-2 border-slate-600/40 text-slate-500/50 border-dashed',
	},
	none: {
		confirmed: 'bg-slate-800/50 border-2 border-slate-700/50 text-slate-600',
		tentative: 'bg-slate-800/30 border-2 border-slate-700/30 text-slate-600/50 border-dashed',
	},
};

// Helper to get ISO week number
function getWeekNumber(date) {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const AvailabilityTab = () => {
	// Modal state
	const [modalOpen, setModalOpen] = useState(false);
	const [selectedCell, setSelectedCell] = useState(null);

	// Week navigation
	const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week, 2 = week after

	// Get current week info
	const today = new Date();
	const currentYear = today.getFullYear();
	const currentWeekNumber = getWeekNumber(today);

	// Calculate target week based on offset
	const targetDate = useMemo(() => {
		const date = new Date(today);
		date.setDate(date.getDate() + (weekOffset * 7));
		return date;
	}, [weekOffset]);

	const targetYear = targetDate.getFullYear();
	const targetWeekNumber = getWeekNumber(targetDate);

	// Fetch weeks
	const { weeks, createWeek, isLoading: weeksLoading } = useAvailabilityWeeks();

	// Ensure target week exists
	useEffect(() => {
		if (!weeksLoading && weeks) {
			const weekExists = weeks.find(
				(w) => w.year === targetYear && w.week_number === targetWeekNumber
			);
			if (!weekExists) {
				createWeek(targetYear, targetWeekNumber);
			}
		}
	}, [weeksLoading, weeks, targetYear, targetWeekNumber, createWeek]);

	// Select target week based on offset
	const selectedWeek = useMemo(() => {
		if (!weeks || weeks.length === 0) return null;

		// Find target week
		const targetWeek = weeks.find(
			(w) => w.year === targetYear && w.week_number === targetWeekNumber
		);

		return targetWeek || weeks[0];
	}, [weeks, targetYear, targetWeekNumber]);

	// Fetch availability for selected week
	const {
		availability,
		overlaps,
		setAvailability,
		deleteAvailability,
		isLoading: availabilityLoading,
		refresh,
	} = useAvailability(selectedWeek?.id);

	// Set up WebSocket for live updates
	useScheduleSocket({
		onAvailabilityUpdated: (data) => {
			console.log('🔴 Availability updated via WebSocket:', data);

			// Optimistically update with WebSocket data instead of refetching
			const newAvailability = data.availability;

			// Update SWR cache directly without refetching
			refresh((current) => {
				if (!current) return current;

				const currentData = current.availability || [];

				// Find and update or add the availability entry
				const existingIndex = currentData.findIndex(
					a => a.week_id === newAvailability.week_id &&
						a.date === newAvailability.date &&
						a.player_name === newAvailability.player_name
				);

				let updatedAvailability;
				if (existingIndex >= 0) {
					// Update existing
					updatedAvailability = [...currentData];
					updatedAvailability[existingIndex] = newAvailability;
				} else {
					// Add new
					updatedAvailability = [...currentData, newAvailability];
				}

				return {
					...current,
					availability: updatedAvailability
				};
			}, { revalidate: false });
		},
		onAvailabilityDeleted: (data) => {
			console.log('🔴 Availability deleted via WebSocket:', data);

			// Remove from local cache
			refresh((current) => {
				if (!current) return current;

				const updatedAvailability = (current.availability || []).filter(
					a => a.id !== data.availability_id
				);

				return {
					...current,
					availability: updatedAvailability
				};
			}, { revalidate: false });
		},
	});

	// Generate days for the week
	const weekDays = useMemo(() => {
		if (!selectedWeek) return [];

		const days = [];
		const start = new Date(selectedWeek.start_date);

		for (let i = 0; i < 7; i++) {
			const day = new Date(start);
			day.setDate(start.getDate() + i);
			days.push({
				date: day.toISOString().split('T')[0],
				dayName: day.toLocaleDateString('de-DE', { weekday: 'short' }),
				dayNumber: day.getDate(),
			});
		}

		return days;
	}, [selectedWeek]);

	// Get availability for a specific player and date
	const getPlayerAvailability = (playerName, date) => {
		return availability.find(
			(a) => a.player_name === playerName && a.date === date
		);
	};

	// Calculate team overlap for each day (all 5 players available)
	const getTeamOverlap = (date) => {
		const playerAvailabilities = DEFAULT_PLAYERS.map(player =>
			getPlayerAvailability(player, date)
		).filter(a => a && (a.status === 'available' || a.status === 'all_day'));

		// Need all 5 players to be available
		if (playerAvailabilities.length !== 5) {
			return null;
		}

		// Get time ranges for each player
		const times = playerAvailabilities.map(a => {
			// If status is all_day, return full day range
			if (a.status === 'all_day') {
				return { from: '00:00', to: '24:00' };
			}

			// Get time ranges (new format) or fallback to old format
			const ranges = a.time_ranges || (a.time_from ? [{from: a.time_from, to: a.time_to}] : null);
			if (!ranges || ranges.length === 0) return null;

			// For now, just use first range for overlap calculation
			// If 'to' is null, treat as 24:00 (until midnight)
			return {
				from: ranges[0].from ? ranges[0].from.substring(0, 5) : null,
				to: ranges[0].to ? ranges[0].to.substring(0, 5) : '24:00'
			};
		});

		// If any player doesn't have valid times, can't calculate overlap
		if (times.some(t => !t || !t.from || !t.to)) {
			return { hasOverlap: true, timeRange: null };
		}

		// Calculate latest start time and earliest end time
		const latestStart = times.reduce((max, t) => t.from > max ? t.from : max, times[0].from);
		const earliestEnd = times.reduce((min, t) => t.to < min ? t.to : min, times[0].to);

		// Check if there's actually an overlap
		if (latestStart >= earliestEnd) {
			return null; // No overlap
		}

		// If the overlap is the full day, show "Ganzer Tag"
		if (latestStart === '00:00' && earliestEnd === '24:00') {
			return { hasOverlap: true, timeRange: 'Ganzer Tag' };
		}

		return { hasOverlap: true, timeRange: `${latestStart} - ${earliestEnd}` };
	};

	// Handle cell click - open modal
	const handleCellClick = (playerName, date) => {
		const existing = getPlayerAvailability(playerName, date);
		setSelectedCell({ playerName, date, existing });
		setModalOpen(true);
	};

	// Handle save from modal
	const handleSaveAvailability = (data) => {
		if (!selectedCell) return;

		// If data is null, delete the availability
		if (data === null) {
			if (selectedCell.existing?.id) {
				deleteAvailability(selectedCell.existing.id);
			}
			return;
		}

		setAvailability({
			week_id: selectedWeek.id,
			date: selectedCell.date,
			player_name: selectedCell.playerName,
			...data
		});
	};

	if (weeksLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
			</div>
		);
	}

	if (!selectedWeek) {
		return (
			<div className="text-center py-12">
				<Calendar className="w-16 h-16 mx-auto text-slate-600 mb-4" />
				<h3 className="text-xl font-semibold text-white mb-2">No Week Available</h3>
				<p className="text-slate-400">Creating current week...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header with Week Navigation */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-white">
						Week {selectedWeek.week_number}, {selectedWeek.year}
					</h2>
					<p className="text-slate-400 text-sm">
						{new Date(selectedWeek.start_date).toLocaleDateString('de-DE')} - {new Date(selectedWeek.end_date).toLocaleDateString('de-DE')}
					</p>
				</div>

				{/* Week Navigation */}
				<div className="flex items-center gap-2">
					<button
						onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
						disabled={weekOffset === 0}
						className={`
							p-2 rounded-lg transition-colors
							${weekOffset === 0
								? 'text-slate-600 cursor-not-allowed'
								: 'text-slate-400 hover:text-white hover:bg-slate-700'
							}
						`}
					>
						<ChevronLeft className="w-5 h-5" />
					</button>
					<span className="text-sm text-slate-400 min-w-[100px] text-center">
						{weekOffset === 0 ? 'Diese Woche' : weekOffset === 1 ? 'Nächste Woche' : `+${weekOffset} Wochen`}
					</span>
					<button
						onClick={() => setWeekOffset(Math.min(2, weekOffset + 1))}
						disabled={weekOffset === 2}
						className={`
							p-2 rounded-lg transition-colors
							${weekOffset === 2
								? 'text-slate-600 cursor-not-allowed'
								: 'text-slate-400 hover:text-white hover:bg-slate-700'
							}
						`}
					>
						<ChevronRight className="w-5 h-5" />
					</button>
				</div>
			</div>

			{/* Availability Grid */}
			<div className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
				<table className="w-full table-fixed">
					<thead>
						<tr className="bg-slate-900/50 border-b border-slate-700">
							<th className="w-32 px-4 py-3 text-left text-sm font-semibold text-slate-300">
								Player
							</th>
							{weekDays.map((day) => (
								<th key={day.date} className="px-2 py-3 text-center text-sm font-semibold text-slate-300">
									<div>{day.dayName}</div>
									<div className="text-xs text-slate-500">{day.dayNumber}</div>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{/* Events Row with subtle team availability */}
						<tr className="bg-slate-900/50 border-b-2 border-slate-700/50">
							<td className="px-4 py-3 text-sm font-semibold text-slate-300">
								📅 Events
							</td>
							{weekDays.map((day) => {
								const overlap = getTeamOverlap(day.date);
								return (
									<td key={day.date} className="px-2 py-3">
										<div className={`
											w-full h-16 rounded-lg flex items-center justify-center relative
											bg-slate-800/50 border-2 border-slate-700/50 text-slate-600
											${overlap ? 'ring-1 ring-purple-500/20' : ''}
										`}>
											{/* Subtle team availability indicator in background */}
											{overlap?.timeRange && (
												<div className="absolute inset-0 flex items-end justify-center pb-1">
													<div className="text-[10px] font-mono text-purple-400/40">
														{overlap.timeRange}
													</div>
												</div>
											)}
											{/* Events will be displayed here (TODO) */}
											<div className="text-xs text-slate-600">
												{/* No events yet */}
											</div>
										</div>
									</td>
								);
							})}
						</tr>

						{/* Player Rows */}
						{DEFAULT_PLAYERS.map((playerName) => (
							<tr key={playerName} className="border-b border-slate-700/50 hover:bg-slate-800/30">
								<td className="px-4 py-3 text-sm font-medium text-white">
									{playerName}
								</td>
								{weekDays.map((day) => {
									const avail = getPlayerAvailability(playerName, day.date);
									const status = avail ? avail.status : 'none';
									const confidence = avail?.confidence || 'confirmed';
									// Treat all_day the same as available for colors
									const statusForColor = status === 'all_day' ? 'available' : status;
									const colorClass = STATUS_COLORS[statusForColor]?.[confidence] || STATUS_COLORS.none.confirmed;

									// Get time ranges (new format) or fallback to old format
									const timeRanges = avail?.time_ranges || (avail?.time_from ? [{from: avail.time_from, to: avail.time_to}] : null);

									return (
										<td key={day.date} className="px-2 py-3">
											<button
												onClick={() => handleCellClick(playerName, day.date)}
												className={`
													w-full h-16 rounded-lg transition-all duration-200
													${colorClass}
													hover:scale-105 hover:brightness-110
													flex flex-col items-center justify-center
												`}
											>
												{status === 'available' || status === 'all_day' ? (
													<div className="flex flex-col items-center gap-0.5">
														{status === 'all_day' ? (
															<div className="text-xs font-semibold">Ganzer Tag</div>
														) : timeRanges && timeRanges.length > 0 ? (
															timeRanges.map((range, idx) => (
																<div key={idx} className="text-xs font-mono">
																	{range.from && (
																		<>
																			<span className="font-semibold">ab {range.from.substring(0, 5)}</span>
																			{range.to && (
																				<span className="opacity-70 text-[10px]"> bis {range.to.substring(0, 5)}</span>
																			)}
																		</>
																	)}
																</div>
															))
														) : null}
													</div>
												) : null}
											</button>
										</td>
									);
								})}
							</tr>
						))}

						{/* Coach Row */}
						<tr className="bg-slate-800/30 border-t-2 border-slate-700">
							<td className="px-4 py-3 text-sm font-medium text-slate-400">
								👤 Coach
							</td>
							{weekDays.map((day) => {
								const avail = getPlayerAvailability('Coach', day.date);
								const status = avail ? avail.status : 'none';
								const confidence = avail?.confidence || 'confirmed';
								// Treat all_day the same as available for colors
								const statusForColor = status === 'all_day' ? 'available' : status;
								const colorClass = STATUS_COLORS[statusForColor]?.[confidence] || STATUS_COLORS.none.confirmed;

								// Get time ranges (new format) or fallback to old format
								const timeRanges = avail?.time_ranges || (avail?.time_from ? [{from: avail.time_from, to: avail.time_to}] : null);

								return (
									<td key={day.date} className="px-2 py-3">
										<button
											onClick={() => handleCellClick('Coach', day.date)}
											className={`
												w-full h-16 rounded-lg transition-all duration-200
												${colorClass}
												hover:scale-105 hover:brightness-110
												flex flex-col items-center justify-center
											`}
										>
											{status === 'available' && (
												<div className="flex flex-col items-center gap-0.5">
													{status === 'all_day' ? (
														<div className="text-xs font-semibold">Ganzer Tag</div>
													) : timeRanges && timeRanges.length > 0 ? (
														timeRanges.map((range, idx) => (
															<div key={idx} className="text-xs font-mono">
																{range.from && (
																	<>
																		<span className="font-semibold">ab {range.from.substring(0, 5)}</span>
																		{range.to && (
																			<span className="opacity-70 text-[10px]"> bis {range.to.substring(0, 5)}</span>
																		)}
																	</>
																)}
															</div>
														))
													) : null}
												</div>
											)}
										</button>
									</td>
								);
							})}
						</tr>
					</tbody>
				</table>
			</div>

			{/* Modal */}
			<AvailabilityModal
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
				playerName={selectedCell?.playerName}
				date={selectedCell?.date}
				existingAvailability={selectedCell?.existing}
				onSave={handleSaveAvailability}
			/>

			{/* Instructions */}
			<div className="bg-slate-800/30 rounded-lg p-4 text-sm text-slate-400">
				<p className="mb-3">
					<span className="font-semibold text-white">Klick</span> auf eine Zelle um Verfügbarkeit zu setzen
				</p>
				<div className="grid grid-cols-2 md:grid-cols-5 gap-3">
					<div className="flex items-center gap-2">
						<div className="w-5 h-5 rounded bg-purple-500/20 border-2 border-purple-500"></div>
						<span className="text-xs">Verfügbar (sicher)</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-5 h-5 rounded bg-purple-500/5 border-2 border-purple-500/40 border-dashed"></div>
						<span className="text-xs">Verfügbar (unsicher)</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-5 h-5 rounded bg-slate-700/50 border-2 border-slate-600"></div>
						<span className="text-xs">Nicht verfügbar</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-5 h-5 rounded bg-slate-700/20 border-2 border-slate-600/40 border-dashed"></div>
						<span className="text-xs">Unsicher nicht verfügbar</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-5 h-5 rounded bg-slate-800/50 border-2 border-slate-700/50"></div>
						<span className="text-xs">Keine Angabe</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AvailabilityTab;
