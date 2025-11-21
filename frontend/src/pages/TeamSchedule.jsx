import { useState } from 'react';
import { Calendar, Users, Swords } from 'lucide-react';
import AvailabilityTab from '../components/schedule/AvailabilityTab';

// TODO: Import remaining components when created
// import CalendarTab from '../components/schedule/CalendarTab';
// import ScrimManagementTab from '../components/schedule/ScrimManagementTab';

const TeamSchedule = () => {
	const [activeTab, setActiveTab] = useState('availability');

	const tabs = [
		{ id: 'availability', label: 'Calendar', icon: Calendar },
		{ id: 'scrims', label: 'Scrim Management', icon: Swords },
	];

	return (
		<div className="min-h-screen bg-background p-4 md:p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-6">
					<h1 className="text-3xl font-bold text-white mb-2">Schedule</h1>
					<p className="text-slate-400">Manage team availability, events, and scrim planning</p>
				</div>

				{/* Tabs */}
				<div className="border-b border-slate-700/50 mb-6">
					<nav className="flex gap-4">
						{tabs.map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`
										flex items-center gap-2 px-4 py-3 border-b-2 transition-colors duration-200
										${
											activeTab === tab.id
												? 'border-purple-400 text-purple-400'
												: 'border-transparent text-slate-400 hover:text-white'
										}
									`}>
									<Icon className="w-5 h-5" />
									<span className="font-medium">{tab.label}</span>
								</button>
							);
						})}
					</nav>
				</div>

				{/* Tab Content */}
				<div className="bg-slate-800/30 rounded-lg p-6">
					{activeTab === 'availability' && <AvailabilityTab />}

					{activeTab === 'scrims' && (
						<div className="text-white">
							<h2 className="text-xl font-bold mb-4">Scrim Management</h2>
							<p className="text-slate-400">Coming soon: Scrim organization and planning</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default TeamSchedule;
