import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchAllLiveVotes } from '@/lib/data';

interface LiveVotesContextType {
  liveVotes: Record<string, number>;
  refreshLiveVotes: () => Promise<void>;
  isLoading: boolean;
}

const LiveVotesContext = createContext<LiveVotesContextType | undefined>(undefined);

export function LiveVotesProvider({ children }: { children: ReactNode }) {
  const [liveVotes, setLiveVotes] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const votes = await fetchAllLiveVotes();
      setLiveVotes(votes);
    } catch (error) {
      console.error('Failed to fetch live votes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshLiveVotes = async () => {
    await fetchData();
  };

  return (
    <LiveVotesContext.Provider value={{ liveVotes, refreshLiveVotes, isLoading }}>
      {children}
    </LiveVotesContext.Provider>
  );
}

export function useLiveVotes() {
  const context = useContext(LiveVotesContext);
  if (context === undefined) {
    throw new Error('useLiveVotes must be used within a LiveVotesProvider');
  }
  return context;
}
