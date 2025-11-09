import MatchHistory from './MatchHistory';

const MatchHistoryTab = ({ teamId, preloadedData }) => {
  return <MatchHistory entityId={teamId} entityType="team" preloadedData={preloadedData} />;
};

export default MatchHistoryTab;
