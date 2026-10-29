import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Season } from '../types';

interface Filters {
  dateRange: string;
  team: string; // Used synonymously with school sometimes
  school: string;
  level: string;
  week: string;
  season: Season | 'All';
  year: string;
  player: string;
  champion: string;
}

interface FilterContextType {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  clearFilters: () => void;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

const defaultFilters: Filters = {
  dateRange: 'All',
  team: 'All',
  school: 'All',
  level: 'All',
  week: 'All',
  season: 'All',
  year: 'All',
  player: 'All',
  champion: 'All'
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <FilterContext.Provider value={{ filters, setFilters, clearFilters, searchQuery, setSearchQuery }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
