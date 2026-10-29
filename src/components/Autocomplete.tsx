import React, { useState, useEffect, useMemo, useRef } from 'react';
import { VARSITY_ROSTER } from '../data/schoolsAndRoster';
import { DDragonChampion, DDragonItem, DDragonSummoner, DDragonRune } from '../services/ddragonService';

export interface AutocompleteProps {
  type: 'champ' | 'item' | 'summ' | 'rune' | 'roster' | 'player' | 'generic';
  value: string | string[];
  onChange: (val: any) => void;
  champions?: DDragonChampion[];
  items?: DDragonItem[];
  summoners?: DDragonSummoner[];
  runes?: DDragonRune[];
  suggestions?: string[];
  multiSelect?: boolean;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export const Autocomplete = ({ 
  type, 
  value, 
  onChange,
  champions = [],
  items = [],
  summoners = [],
  runes = [],
  suggestions = [],
  multiSelect = false,
  loading = false,
  placeholder,
  className = "flex flex-wrap items-center justify-center gap-1 bg-black border border-brand-gold rounded-full px-4 py-1 cursor-text transition-all hover:bg-brand-gold/5 focus-within:bg-brand-black min-h-[36px] shadow-xl"
}: AutocompleteProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const values = Array.isArray(value) ? value : (value ? [value] : []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (loading) return [];
    const q = query.toLowerCase();
    
    if (type === 'generic') {
        const combined = [
            ...champions.map(c => ({ name: c.name, id: c.id, image: c.image, type: 'champ' })),
            ...items.filter(i => (i.gold >= 1500 && (!i.into || i.into.length === 0) && (i.depth === 3 || i.depth === undefined))).map(i => ({ name: i.name, id: i.id, image: i.image, type: 'item' }))
        ];
        return combined.filter(c => c.name.toLowerCase().includes(q)).slice(0, 15);
    }

    if (type === 'roster') {
      const internalRoster = VARSITY_ROSTER.filter(r => r.gamertag.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)).slice(0, 8).map(r => ({ ...r, name: r.gamertag, id: r.gamertag, image: '' }));
      if (internalRoster.length > 0) return internalRoster;
      return suggestions.filter(s => s.toLowerCase().includes(q)).map(s => ({ name: s, id: s, image: '', role: '' }));
    }
    
    if (type === 'player') {
      return suggestions
        .filter(s => s.toLowerCase().includes(q))
        .map(s => ({ name: s, id: s, image: '' }));
    }
    
    if (type === 'champ') return champions.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8);
    
    if (type === 'item') {
      return items
        .filter(i => 
          i.name.toLowerCase().includes(q) && 
          (i.gold >= 1500 && (!i.into || i.into.length === 0) && (i.depth === 3 || i.depth === undefined)) &&
          !i.tags.includes('Boots') && 
          !i.tags.includes('Consumable') &&
          !i.tags.includes('Trinket')
        )
        .slice(0, 15);
    }
    
    if (type === 'summ') return summoners.filter(s => s.name.toLowerCase().includes(q)).slice(0, 8);
    
    return runes.filter(r => r.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, type, champions, items, summoners, runes, loading, suggestions]);

  const handleSelect = (item: any) => {
    if (multiSelect) {
      if (values.includes(item.name)) {
        onChange(values.filter(v => v !== item.name));
      } else {
        onChange([...values, item.name]);
      }
      setQuery('');
    } else {
      onChange(item.name);
      setQuery(item.name);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className={className}
        onClick={() => setIsOpen(true)}
      >
        {multiSelect && values.map(v => (
          <span key={v} className="bg-brand-gold text-brand-black text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 uppercase">
            {v}
            <button onClick={(e) => { e.stopPropagation(); onChange(values.filter(val => val !== v)); }} className="hover:text-white">×</button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={loading ? 'Loading...' : (placeholder || `Search ${type}...`)}
          disabled={loading}
          className="bg-transparent border-none outline-none text-sm font-black text-brand-gold text-center flex-1 min-w-[100px] py-1 placeholder:text-brand-gold/30 placeholder:font-normal uppercase tracking-widest"
        />
      </div>
      {isOpen && !loading && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-black border border-brand-gold/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-brand-gold/20">
          {filtered.map((item: any) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className={`w-full flex items-center justify-center gap-3 px-6 py-3 hover:bg-brand-gold group text-center transition-all border-b border-white/5 last:border-none ${values.includes(item.name) ? 'bg-brand-gold/20' : ''}`}
            >
              {type !== 'roster' && type !== 'player' && item.image && <img src={item.image} className="w-8 h-8 rounded-full border border-white/10 group-hover:border-brand-black/20" referrerPolicy="no-referrer" />}
              <div className="flex flex-col items-center">
                 <span className="text-sm font-black text-brand-gold group-hover:text-brand-black uppercase italic font-display">{item.name}</span>
                 {type === 'roster' && item.role && <span className="text-[10px] text-brand-gold/80 group-hover:text-brand-black/60 font-black">{item.role}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
