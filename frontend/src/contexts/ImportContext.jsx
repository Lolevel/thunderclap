import { createContext, useContext, useRef } from 'react';

const ImportContext = createContext();

export function ImportProvider({ children }) {
  // Track which team/player is currently being imported by THIS client
  const importingRef = useRef({
    teamId: null,
    playerId: null,
  });

  const setImportingTeam = (teamId) => {
    console.log('[ImportContext] Setting importing team:', teamId);
    importingRef.current.teamId = teamId;
  };

  const clearImportingTeam = () => {
    console.log('[ImportContext] Clearing importing team');
    importingRef.current.teamId = null;
  };

  const isImportingTeam = (teamId) => {
    return importingRef.current.teamId === teamId;
  };

  const setImportingPlayer = (playerId) => {
    importingRef.current.playerId = playerId;
  };

  const clearImportingPlayer = () => {
    importingRef.current.playerId = null;
  };

  const isImportingPlayer = (playerId) => {
    return importingRef.current.playerId === playerId;
  };

  return (
    <ImportContext.Provider
      value={{
        setImportingTeam,
        clearImportingTeam,
        isImportingTeam,
        setImportingPlayer,
        clearImportingPlayer,
        isImportingPlayer,
      }}
    >
      {children}
    </ImportContext.Provider>
  );
}

export function useImportTracking() {
  const context = useContext(ImportContext);
  if (!context) {
    throw new Error('useImportTracking must be used within ImportProvider');
  }
  return context;
}
