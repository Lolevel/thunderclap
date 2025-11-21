import { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, Check, Plus, Calendar, Trash2 } from 'lucide-react';
import TimePicker from './TimePicker';

// Store last entered time for quick entry
let lastEnteredTime = '18:00';

const AvailabilityModal = ({ isOpen, onClose, playerName, date, existingAvailability, onSave }) => {
	const [status, setStatus] = useState('available');
	const [isAllDay, setIsAllDay] = useState(false);
	const [timeRanges, setTimeRanges] = useState([{ from: lastEnteredTime, to: '' }]);
	const [confidence, setConfidence] = useState('confirmed');

	// Initialize with existing data
	useEffect(() => {
		if (existingAvailability) {
			const existingStatus = existingAvailability.status || 'available';
			setStatus(existingStatus === 'all_day' ? 'available' : existingStatus);
			setIsAllDay(existingStatus === 'all_day');
			setConfidence(existingAvailability.confidence || 'confirmed');

			// Load time_ranges or convert legacy format (only if not all_day)
			if (existingStatus !== 'all_day') {
				if (existingAvailability.time_ranges && existingAvailability.time_ranges.length > 0) {
					setTimeRanges(existingAvailability.time_ranges.map(range => ({
						from: range.from?.substring(0, 5) || '18:00',
						to: range.to?.substring(0, 5) || ''
					})));
				} else if (existingAvailability.time_from) {
					setTimeRanges([{
						from: existingAvailability.time_from.substring(0, 5),
						to: existingAvailability.time_to?.substring(0, 5) || ''
					}]);
				} else {
					setTimeRanges([{ from: lastEnteredTime, to: '' }]);
				}
			} else {
				setTimeRanges([{ from: lastEnteredTime, to: '' }]);
			}
		} else {
			// Reset to defaults when opening for new entry (use last entered time)
			setStatus('available');
			setIsAllDay(false);
			setTimeRanges([{ from: lastEnteredTime, to: '' }]);
			setConfidence('confirmed');
		}
	}, [existingAvailability, isOpen]);

	const handleSave = () => {
		// If all_day, send status='all_day' with no time_ranges
		if (status === 'available' && isAllDay) {
			onSave({
				status: 'all_day',
				time_ranges: null,
				confidence
			});
			onClose();
			return;
		}

		if (status === 'available' && !isAllDay) {
			// Validate all time ranges
			for (let i = 0; i < timeRanges.length; i++) {
				const range = timeRanges[i];

				// Check if from time is set
				if (!range.from) {
					alert(`Bitte eine Start-Zeit für Zeitraum ${i + 1} angeben!`);
					return;
				}

				// If both from and to are set, validate order
				if (range.to) {
					const fromTime = range.from.split(':').map(Number);
					const toTime = range.to.split(':').map(Number);
					const fromMinutes = fromTime[0] * 60 + fromTime[1];
					const toMinutes = toTime[0] * 60 + toTime[1];

					if (toMinutes <= fromMinutes) {
						alert(`Die End-Zeit muss nach der Start-Zeit liegen (Zeitraum ${i + 1})!`);
						return;
					}
				}
			}

			// Check for overlapping ranges
			for (let i = 0; i < timeRanges.length; i++) {
				for (let j = i + 1; j < timeRanges.length; j++) {
					const range1 = timeRanges[i];
					const range2 = timeRanges[j];

					// Skip if either range has no end time (open-ended)
					if (!range1.to || !range2.to) continue;

					const r1Start = range1.from.split(':').map(Number);
					const r1End = range1.to.split(':').map(Number);
					const r2Start = range2.from.split(':').map(Number);
					const r2End = range2.to.split(':').map(Number);

					const r1StartMin = r1Start[0] * 60 + r1Start[1];
					const r1EndMin = r1End[0] * 60 + r1End[1];
					const r2StartMin = r2Start[0] * 60 + r2Start[1];
					const r2EndMin = r2End[0] * 60 + r2End[1];

					// Check for overlap
					if (r1StartMin < r2EndMin && r2StartMin < r1EndMin) {
						alert(`Zeiträume ${i + 1} und ${j + 1} überschneiden sich!`);
						return;
					}
				}
			}

			// Remember the first time for next entry
			if (timeRanges.length > 0 && timeRanges[0].from) {
				lastEnteredTime = timeRanges[0].from;
			}
		}

		// Build time_ranges array for backend
		const timeRangesForBackend = status === 'available' && !isAllDay
			? timeRanges.map(range => ({
				from: range.from,
				to: range.to || null
			}))
			: null;

		onSave({
			status,
			time_ranges: timeRangesForBackend,
			confidence
		});
		onClose();
	};

	const addTimeRange = () => {
		setTimeRanges([...timeRanges, { from: '18:00', to: '' }]);
	};

	const removeTimeRange = (index) => {
		if (timeRanges.length > 1) {
			setTimeRanges(timeRanges.filter((_, i) => i !== index));
		}
	};

	const updateTimeRange = (index, field, value) => {
		const newRanges = [...timeRanges];
		newRanges[index][field] = value;
		setTimeRanges(newRanges);
	};

	const handleDelete = () => {
		onSave(null); // null means delete
		onClose();
	};

	if (!isOpen) return null;

	const formatDate = (dateStr) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString('de-DE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-slate-700">
					<div>
						<h3 className="text-xl font-semibold text-white">{playerName}</h3>
						<p className="text-sm text-slate-400">{formatDate(date)}</p>
					</div>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-white transition-colors"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6 space-y-6">
					{/* Status Selection */}
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-3">
							Verfügbarkeit
						</label>
						<div className="grid grid-cols-2 gap-3">
							<button
								onClick={() => setStatus('available')}
								className={`
									px-4 py-3 rounded-lg border-2 transition-all
									${status === 'available'
										? 'bg-purple-500/20 border-purple-500 text-purple-300'
										: 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
									}
								`}
							>
								<Check className="w-5 h-5 mx-auto mb-1" />
								<span className="text-xs">Verfügbar</span>
							</button>
							<button
								onClick={() => setStatus('unavailable')}
								className={`
									px-4 py-3 rounded-lg border-2 transition-all
									${status === 'unavailable'
										? 'bg-red-500/20 border-red-500 text-red-400'
										: 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
									}
								`}
							>
								<X className="w-5 h-5 mx-auto mb-1" />
								<span className="text-xs">Nicht verfügbar</span>
							</button>
						</div>
					</div>

					{/* Time Selection (only when available) */}
					{status === 'available' && (
						<div className="space-y-4">
							{/* Ganzer Tag Checkbox */}
							<div className="flex items-center gap-3 p-3 bg-slate-900/30 rounded-lg border border-slate-700/50">
								<input
									type="checkbox"
									id="all-day-checkbox"
									checked={isAllDay}
									onChange={(e) => setIsAllDay(e.target.checked)}
									className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
								/>
								<label
									htmlFor="all-day-checkbox"
									className="text-sm text-slate-300 font-medium cursor-pointer flex items-center gap-2"
								>
									<Calendar className="w-4 h-4 text-purple-400" />
									<span>Ganzer Tag verfügbar (00:00 - 24:00)</span>
								</label>
							</div>

							{/* Time Ranges (only when NOT all_day) */}
							{!isAllDay && (
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
											<Clock className="w-4 h-4 text-purple-400" />
											<span>Zeiträume</span>
										</div>
										{timeRanges.length < 5 && (
											<button
												onClick={addTimeRange}
												className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
											>
												<Plus className="w-3 h-3" />
												Weiterer Zeitraum
											</button>
										)}
									</div>

							{/* Multiple Time Ranges */}
							{timeRanges.map((range, index) => (
								<div key={index} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-3">
									<div className="flex items-center justify-between">
										<span className="text-xs text-slate-400 font-medium">
											Zeitraum {index + 1}
										</span>
										{timeRanges.length > 1 && (
											<button
												onClick={() => removeTimeRange(index)}
												className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
											>
												<Trash2 className="w-3 h-3" />
												Entfernen
											</button>
										)}
									</div>

									{/* Time From */}
									<TimePicker
										value={range.from}
										onChange={(value) => updateTimeRange(index, 'from', value)}
										label="Von"
										placeholder="Start-Zeit"
									/>

									{/* Time To (Optional) */}
									{range.to !== '' ? (
										<div>
											<div className="flex items-center justify-between mb-2">
												<span className="text-xs text-slate-400 font-medium">
													Bis (optional)
												</span>
												<button
													onClick={() => updateTimeRange(index, 'to', '')}
													className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
												>
													Entfernen
												</button>
											</div>
											<TimePicker
												value={range.to}
												onChange={(value) => updateTimeRange(index, 'to', value)}
												placeholder="End-Zeit"
											/>
										</div>
									) : (
										<button
											onClick={() => updateTimeRange(index, 'to', '19:00')}
											className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-400 hover:text-slate-300 transition-colors flex items-center justify-center gap-2 text-xs"
										>
											<Plus className="w-3 h-3" />
											End-Zeit hinzufügen
										</button>
									)}
								</div>
							))}
								</div>
							)}
						</div>
					)}

					{/* Confidence Selection */}
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-3">
							Wie sicher bist du?
						</label>
						<div className="grid grid-cols-2 gap-3">
							<button
								onClick={() => setConfidence('confirmed')}
								className={`
									px-4 py-3 rounded-lg border-2 transition-all
									${confidence === 'confirmed'
										? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/20'
										: 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
									}
								`}
							>
								<Check className="w-5 h-5 mx-auto mb-1" />
								<span className="text-sm font-medium">Sicher</span>
							</button>
							<button
								onClick={() => setConfidence('tentative')}
								className={`
									px-4 py-3 rounded-lg border-2 border-dashed transition-all
									${confidence === 'tentative'
										? 'bg-purple-500/10 border-purple-500/60 text-purple-400'
										: 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
									}
								`}
							>
								<AlertCircle className="w-5 h-5 mx-auto mb-1" />
								<span className="text-sm font-medium">Unsicher</span>
							</button>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between p-6 border-t border-slate-700">
					{existingAvailability ? (
						<button
							onClick={handleDelete}
							className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
						>
							Löschen
						</button>
					) : (
						<div></div>
					)}
					<div className="flex gap-3">
						<button
							onClick={onClose}
							className="px-5 py-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
						>
							Abbrechen
						</button>
						<button
							onClick={handleSave}
							className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-lg shadow-purple-600/20 font-medium"
						>
							Speichern
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AvailabilityModal;
