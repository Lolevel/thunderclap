import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

const TimePicker = ({ value, onChange, label, placeholder = "Zeit wählen" }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedHour, setSelectedHour] = useState(value ? parseInt(value.split(':')[0]) : 18);
	const [selectedMinute, setSelectedMinute] = useState(value ? parseInt(value.split(':')[1]) : 0);
	const dropdownRef = useRef(null);

	// Generate hours (0-23)
	const hours = Array.from({ length: 24 }, (_, i) => i);

	// Generate minutes in 15min intervals
	const minutes = [0, 15, 30, 45];

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen]);

	const [hourSelected, setHourSelected] = useState(false);

	const handleSelectHour = (hour) => {
		setSelectedHour(hour);
		setHourSelected(true);
	};

	const handleSelectMinute = (minute) => {
		setSelectedMinute(minute);
		const timeString = `${String(selectedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
		onChange(timeString);
		setIsOpen(false);
		setHourSelected(false);
	};

	const handleQuickSelect = (hour, minute) => {
		setSelectedHour(hour);
		setSelectedMinute(minute);
		const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
		onChange(timeString);
		setIsOpen(false);
		setHourSelected(false);
	};

	const displayValue = value
		? value
		: placeholder;

	return (
		<div className="relative" ref={dropdownRef}>
			{label && (
				<label className="block text-xs text-slate-400 mb-2 font-medium">
					{label}
				</label>
			)}

			{/* Input Display */}
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={`
					w-full px-4 py-3 bg-slate-900/50 border-2 rounded-lg
					text-left font-mono text-lg transition-all
					flex items-center justify-between
					${isOpen
						? 'border-purple-500 bg-slate-900'
						: 'border-slate-700 hover:border-slate-600'
					}
					${value ? 'text-white' : 'text-slate-500'}
				`}
			>
				<div className="flex items-center gap-3">
					<Clock className="w-4 h-4 text-purple-400" />
					<span>{displayValue}</span>
				</div>
				<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
			</button>

			{/* Dropdown */}
			{isOpen && (
				<div className="absolute z-50 mt-2 w-full bg-slate-800 border-2 border-purple-500/30 rounded-lg shadow-xl shadow-black/50 overflow-hidden">
					<div className="grid grid-cols-2 divide-x divide-slate-700">
						{/* Hours Column */}
						<div className="max-h-64 overflow-y-auto custom-scrollbar">
							<div className="sticky top-0 bg-slate-900/90 backdrop-blur px-3 py-2 text-xs font-semibold text-slate-400 border-b border-slate-700">
								Stunde
							</div>
							{hours.map((hour) => (
								<button
									key={hour}
									type="button"
									onClick={() => handleSelectHour(hour)}
									className={`
										w-full px-4 py-2.5 text-left font-mono transition-colors
										${selectedHour === hour
											? 'bg-purple-500/20 text-purple-300 font-semibold'
											: 'text-slate-300 hover:bg-slate-700'
										}
									`}
								>
									{String(hour).padStart(2, '0')}
								</button>
							))}
						</div>

						{/* Minutes Column */}
						<div className="max-h-64 overflow-y-auto">
							<div className="sticky top-0 bg-slate-900/90 backdrop-blur px-3 py-2 text-xs font-semibold text-slate-400 border-b border-slate-700">
								Minute
							</div>
							{minutes.map((minute) => (
								<button
									key={minute}
									type="button"
									onClick={() => handleSelectMinute(minute)}
									className={`
										w-full px-4 py-2.5 text-left font-mono transition-colors
										${selectedMinute === minute
											? 'bg-purple-500/20 text-purple-300 font-semibold'
											: 'text-slate-300 hover:bg-slate-700'
										}
									`}
								>
									{String(minute).padStart(2, '0')}
								</button>
							))}
						</div>
					</div>

					{/* Quick Select Footer */}
					<div className="border-t border-slate-700 bg-slate-900/50 p-2 flex gap-2">
						<button
							type="button"
							onClick={() => handleQuickSelect(18, 0)}
							className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors"
						>
							18:00
						</button>
						<button
							type="button"
							onClick={() => handleQuickSelect(19, 0)}
							className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors"
						>
							19:00
						</button>
						<button
							type="button"
							onClick={() => handleQuickSelect(20, 0)}
							className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors"
						>
							20:00
						</button>
					</div>
				</div>
			)}

			<style jsx>{`
				.custom-scrollbar::-webkit-scrollbar {
					width: 6px;
				}
				.custom-scrollbar::-webkit-scrollbar-track {
					background: rgb(30, 41, 59);
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: rgb(71, 85, 105);
					border-radius: 3px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: rgb(100, 116, 139);
				}
			`}</style>
		</div>
	);
};

export default TimePicker;
