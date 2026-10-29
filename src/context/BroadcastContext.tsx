import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BroadcastState {
  currentDraft: any[]; // Define DRAFT_SEQUENCE type
  activeStrategy: string | null;
  activeCounters: string[];
  activeMatchup: any | null;
}

interface BroadcastContextType {
  state: BroadcastState;
  updateDraft: (draft: any[]) => void;
  updateStrategy: (strategy: string) => void;
  updateCounters: (counters: string[]) => void;
  updateMatchup: (matchup: any) => void;
  pushToOverlay: () => void;
}

const BroadcastContext = createContext<BroadcastContextType | undefined>(undefined);

export const BroadcastProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<BroadcastState>({
    currentDraft: [],
    activeStrategy: null,
    activeCounters: [],
    activeMatchup: null,
  });

  const updateDraft = (draft: any[]) => setState(prev => ({ ...prev, currentDraft: draft }));
  const updateStrategy = (strategy: string) => setState(prev => ({ ...prev, activeStrategy: strategy }));
  const updateCounters = (counters: string[]) => setState(prev => ({ ...prev, activeCounters: counters }));
  const updateMatchup = (matchup: any) => setState(prev => ({ ...prev, activeMatchup: matchup }));

  const pushToOverlay = () => {
    console.log("Pushing BroadcastState to Uno Overlay endpoint:", JSON.stringify(state));
    // In production, this would be an API call to your data feed URL
  };

  return (
    <BroadcastContext.Provider value={{ state, updateDraft, updateStrategy, updateCounters, updateMatchup, pushToOverlay }}>
      {children}
    </BroadcastContext.Provider>
  );
};

export const useBroadcast = () => {
  const context = useContext(BroadcastContext);
  if (!context) throw new Error('useBroadcast must be used within a BroadcastProvider');
  return context;
};
