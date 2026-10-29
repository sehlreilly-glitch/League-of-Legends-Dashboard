import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Trophy, ChevronRight } from 'lucide-react';
import { ScheduleEntry } from '../types';
import { SchoolBadge } from './SchoolBadge';

interface ScheduleTickerProps {
  schedules: ScheduleEntry[];
  brandings?: Record<string, any>;
}

export function ScheduleTicker({ schedules, brandings = {} }: ScheduleTickerProps) {
  // Sort by date and filter for upcoming/recent
  const tickerItems = [...schedules]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10);

  return (
    <div className="bg-brand-green/80 backdrop-blur-md border-b border-brand-gold/20 h-10 flex items-center overflow-hidden whitespace-nowrap relative">
      <div className="absolute left-0 top-0 bottom-0 px-4 bg-brand-green z-10 flex items-center gap-2 border-r border-brand-gold/20">
        <Calendar className="w-3 h-3 text-brand-gold" />
        <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">Schedule & Results</span>
      </div>
      
      <motion.div 
        className="flex items-center gap-8 px-8 ml-40"
        animate={{ x: [0, -1000] }}
        transition={{ 
          duration: 30, 
          repeat: Infinity, 
          ease: "linear" 
        }}
      >
        {tickerItems.map((item, idx) => {
          const homeTeam = item.team || 'Basha';
          return (
            <div key={`${item.date}-${idx}`} className="flex items-center gap-4 text-[10px] font-bold">
              <span className="text-gray-500">{item.date}</span>
              <div className="flex items-center gap-3">
                <SchoolBadge 
                  schoolName={homeTeam} 
                  brandings={brandings} 
                  size="sm" 
                  textClassName={homeTeam === 'Basha' ? 'text-brand-gold' : 'text-white'}
                />
                <span className="text-brand-gold/40">vs</span>
                <SchoolBadge 
                  schoolName={item.opponent} 
                  brandings={brandings} 
                  size="sm" 
                  textClassName={item.opponent === 'Basha' ? 'text-brand-gold' : 'text-white'}
                />
              </div>
              {item.result && (
                <span className={`px-1.5 py-0.5 rounded text-[8px] ${item.result === 'Win' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {item.result} {item.score || ""}
                </span>
              )}
              <ChevronRight className="w-3 h-3 text-brand-gold/20" />
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
