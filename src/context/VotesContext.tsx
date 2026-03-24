import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchAllLiveVotes, updateLiveVote as updateVoteOnServer, getVotes as getStaticVotes } from '@/lib/data';

interface VotesContextType {
  liveVotes: Record<string, number>;
  refreshLiveVotes: () => Promise<void>;
  updateLiveVote: (candidateId: string, action: 'vote' | 'undo') => Promise<void>;
}

const VotesContext = createContext<VotesContextType | undefined>(undefined);

export const useVotes = () => {
  const context = useContext(VotesContext);
  if (!context) throw new Error('useVotes must be used within VotesProvider');
  return context;
};

export const VotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [liveVotes, setLiveVotes] = useState<Record<string, number>>({});

  const refreshLiveVotes = useCallback(async () => {
    try {
      const data = await fetchAllLiveVotes();
      setLiveVotes(data);
    } catch (err) {
      console.error('Failed to refresh live votes:', err);
    }
  }, []);

  const updateLiveVote = useCallback(async (candidateId: string, action: 'vote' | 'undo') => {
    try {
      const newVotes = await updateVoteOnServer(candidateId, action);
      setLiveVotes(prev => ({ ...prev, [candidateId]: newVotes }));
    } catch (err) {
      console.error('Failed to update live vote:', err);
    }
  }, []);

  useEffect(() => {
    refreshLiveVotes();
  }, [refreshLiveVotes]);

  return (
    <VotesContext.Provider value={{ liveVotes, refreshLiveVotes, updateLiveVote }}>
      {children}
    </VotesContext.Provider>
  );
};
