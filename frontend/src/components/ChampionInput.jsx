import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import api from '../lib/api';

const ChampionInput = ({ value, onChange, placeholder, teamId }) => {
	const [inputValue, setInputValue] = useState(value || '');
	const [suggestions, setSuggestions] = useState([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const [loading, setLoading] = useState(false);
	const [championIcon, setChampionIcon] = useState(null);
	const [isComplete, setIsComplete] = useState(false); // Track if a champion is fully selected
	const inputRef = useRef(null);
	const suggestionsRef = useRef(null);

	useEffect(() => {
		setInputValue(value || '');
		// Fetch icon if value is a complete champion name
		if (value && value.length > 0) {
			fetchChampionIcon(value);
		} else {
			setChampionIcon(null);
			setIsComplete(false);
		}
	}, [value]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				suggestionsRef.current &&
				!suggestionsRef.current.contains(event.target) &&
				!inputRef.current.contains(event.target)
			) {
				setShowSuggestions(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Fetch champion icon for complete champion name
	const fetchChampionIcon = async (championName) => {
		try {
			const response = await api.get(`/teams/${teamId}/champions/autocomplete?q=${encodeURIComponent(championName)}&limit=1`);
			if (response.data.length > 0 && response.data[0].name === championName) {
				setChampionIcon(response.data[0].icon);
				setIsComplete(true);
			} else {
				setChampionIcon(null);
				setIsComplete(false);
			}
		} catch (error) {
			setChampionIcon(null);
			setIsComplete(false);
		}
	};

	useEffect(() => {
		const fetchSuggestions = async () => {
			if (inputValue.length < 2 || isComplete) {
				setSuggestions([]);
				setShowSuggestions(false);
				return;
			}

			setLoading(true);
			try {
				const response = await api.get(`/teams/${teamId}/champions/autocomplete?q=${encodeURIComponent(inputValue)}&limit=8`);
				setSuggestions(response.data);
				setShowSuggestions(response.data.length > 0 && !isComplete);
			} catch (error) {
				console.error('Failed to fetch champion suggestions:', error);
				setSuggestions([]);
			} finally {
				setLoading(false);
			}
		};

		const timer = setTimeout(fetchSuggestions, 100); // Faster: 100ms instead of 200ms
		return () => clearTimeout(timer);
	}, [inputValue, teamId, isComplete]);

	const handleInputChange = (e) => {
		const newValue = e.target.value;
		setInputValue(newValue);
		onChange(newValue);
		setSelectedIndex(-1);
		setIsComplete(false);
		setChampionIcon(null);
	};

	const handleSelectChampion = (champion) => {
		setInputValue(champion.name);
		onChange(champion.name);
		setShowSuggestions(false);
		setSelectedIndex(-1);
		setChampionIcon(champion.icon);
		setIsComplete(true);
	};

	const handleClear = () => {
		setInputValue('');
		onChange('');
		setSuggestions([]);
		setShowSuggestions(false);
		setChampionIcon(null);
		setIsComplete(false);
		inputRef.current?.focus();
	};

	const handleKeyDown = (e) => {
		if (!showSuggestions || suggestions.length === 0) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
					handleSelectChampion(suggestions[selectedIndex]);
				}
				break;
			case 'Escape':
				setShowSuggestions(false);
				setSelectedIndex(-1);
				break;
		}
	};

	return (
		<div className="relative">
			<div className="relative">
				{championIcon && (
					<div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded overflow-hidden flex-shrink-0 bg-slate-900 pointer-events-none">
						<img
							src={championIcon}
							alt={inputValue}
							className="w-full h-full object-cover"
							onError={(e) => {
								e.target.style.display = 'none';
							}}
						/>
					</div>
				)}
				<input
					ref={inputRef}
					type="text"
					value={inputValue}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					onFocus={() => !isComplete && inputValue.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
					placeholder={placeholder}
					className={`w-full py-2 pr-8 bg-surface border border-border/50 rounded-lg text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition-colors ${
						championIcon ? 'pl-10' : 'px-3'
					}`}
				/>
				{inputValue && (
					<button
						onClick={handleClear}
						className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>

			{showSuggestions && suggestions.length > 0 && (
				<div
					ref={suggestionsRef}
					className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto"
				>
					{suggestions.map((champion, index) => (
						<button
							key={champion.id}
							onClick={() => handleSelectChampion(champion)}
							className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700 transition-colors text-left ${
								index === selectedIndex ? 'bg-slate-700' : ''
							}`}
						>
							<div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-slate-900">
								<img
									src={champion.icon}
									alt={champion.name}
									className="w-full h-full object-cover"
									onError={(e) => {
										e.target.style.display = 'none';
									}}
								/>
							</div>
							<span className="font-medium text-text-primary">
								{champion.name}
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default ChampionInput;
