import MatchHistory from './MatchHistory';

const MatchHistoryTab = ({ teamId }) => {
  return <MatchHistory entityId={teamId} entityType="team" />;
};

export default MatchHistoryTab;
