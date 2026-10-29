import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Trophy, Activity, Users, Shield } from 'lucide-react';
import { ScoutingReport, PlayerStats } from '../types';
import { SchoolBadge } from './SchoolBadge';

interface BashaPublicDashboardProps {
  reports: ScoutingReport[];
  brandings: Record<string, any>;
}

export function BashaPublicDashboard({ reports, brandings }: BashaPublicDashboardProps) {
  // Aggregate stats for Basha players only
  const bashaPlayerStats = useMemo(() => {
    const stats: Record<string, {
      games: number,
      wins: number,
      kills: number,
      deaths: number,
      assists: number,
      cs: number,
      champion: string,
      role: string
    }> = {};

    reports.forEach(r => {
      const isBasha = r.team === 'Basha';
      r.games.forEach(g => {
        const gameWin = isBasha ? g.result === 'Win' : g.result === 'Loss';
        Object.entries(g.players).forEach(([role, p]) => {
          // Only include Basha players (in this simple mock, we assume reports where Basha is 'team' contain Basha players)
          if (isBasha && p.gamertag) {
            if (!stats[p.gamertag]) {
              stats[p.gamertag] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, champion: p.champion || '', role };
            }
            const s = stats[p.gamertag];
            s.games++;
            if (gameWin) s.wins++;
            s.kills += p.kills;
            s.deaths += p.deaths;
            s.assists += p.assists;
            s.cs += p.cs;
            if (p.champion) s.champion = p.champion;
          }
        });
      });
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data,
      kda: ((data.kills + data.assists) / Math.max(1, data.deaths)).toFixed(2),
      winRate: Math.round((data.wins / data.games) * 100),
      avgCs: (data.cs / data.games).toFixed(1)
    }));
  }, [reports]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-2">
        <div className="flex items-center gap-4">
          <SchoolBadge schoolName="Basha" brandings={brandings} size="lg" />
          <div>
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter font-display">Command Center</h2>
            <p className="text-brand-gold font-black uppercase text-[10px] tracking-[0.2em]">Live Basha Esports Performance Stream</p>
          </div>
        </div>
      </header>

      {/* Stats Summary Ticker/Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Win Rate', value: `${Math.round(bashaPlayerStats.reduce((acc, p) => acc + p.winRate, 0) / Math.max(1, bashaPlayerStats.length))}%`, icon: Trophy },
          { label: 'Total Matches', value: Math.max(...reports.map(r => r.games.length), 0) + reports.length, icon: Activity },
          { label: 'Active Roster', value: bashaPlayerStats.length, icon: Users },
          { label: 'Current Week', value: Math.max(...reports.map(r => parseInt(r.week) || 0)), icon: Shield },
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 border border-brand-gold/10 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="w-3 h-3 text-brand-gold" />
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="text-xl font-black text-white italic font-display">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-brand-gold uppercase tracking-[0.3em] font-display italic">Active Basha Roster Stats</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bashaPlayerStats.map((player) => (
            <motion.div 
              key={player.name}
              whileHover={{ y: -5 }}
              className="bg-brand-green/40 backdrop-blur-md border border-brand-gold/20 p-6 rounded-[2rem] shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5">
                 <Trophy className="w-20 h-20 text-brand-gold" />
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center font-black text-brand-gold italic">
                  {player.role.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">{player.name}</h4>
                  <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{player.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-brand-black/40 rounded-2xl border border-white/5">
                   <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Win Rate</p>
                   <p className="text-lg font-black text-white italic">{player.winRate}%</p>
                </div>
                <div className="text-center p-3 bg-brand-black/40 rounded-2xl border border-white/5">
                   <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">KDA</p>
                   <p className="text-lg font-black text-brand-gold italic">{player.kda}</p>
                </div>
                <div className="text-center p-3 bg-brand-black/40 rounded-2xl border border-white/5">
                   <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Avg CS</p>
                   <p className="text-lg font-black text-white italic">{player.avgCs}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between px-2">
                 <div className="flex items-center gap-2">
                   <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Main Pick:</span>
                   <span className="text-[10px] font-black text-white uppercase tracking-wider">{player.champion}</span>
                 </div>
                 <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest">
                   {player.games} MATCHES
                 </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
