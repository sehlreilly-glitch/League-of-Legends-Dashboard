import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Shield, Trophy, Activity, Info } from 'lucide-react';
import { ScoutingReport, PlayerStats } from '../types';
import { SchoolBadge } from './SchoolBadge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';

export function TeamDetailsView({ 
  team, 
  reports, 
  onBack,
  onViewReport,
  brandings
}: { 
  team: {name: string, level: string}; 
  reports: ScoutingReport[];
  onBack: () => void;
  onViewReport: (id: string) => void;
  brandings?: Record<string, any>;
}) {
  const [filterWeek, setFilterWeek] = useState<string>('');
  const [filterOpponent, setFilterOpponent] = useState<string>('');

  const brandKey = brandings ? Object.keys(brandings).find(k => k.toLowerCase() === team.name.toLowerCase()) : null;
  const brand = brandKey ? brandings![brandKey] : null;
  
  // Calculate lightness for contrast
  const getContrast = (hex: string) => {
    if (!hex) return '#a38f58';
    let color = hex.replace(/^#/, '');
    
    if (color.length === 3) {
      color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
    }
    
    if (color.length !== 6) return '#a38f58';

    let r = parseInt(color.substring(0, 2), 16);
    let g = parseInt(color.substring(2, 4), 16);
    let b = parseInt(color.substring(4, 6), 16);

    const percent = 20; // 20% darker
    r = Math.floor(r * (1 - percent / 100));
    g = Math.floor(g * (1 - percent / 100));
    b = Math.floor(b * (1 - percent / 100));

    r = Math.max(0, r);
    g = Math.max(0, g);
    b = Math.max(0, b);

    const RR = r.toString(16).padStart(2, '0');
    const GG = g.toString(16).padStart(2, '0');
    const BB = b.toString(16).padStart(2, '0');

    return '#' + RR + GG + BB;
  };
  const themeColor = brand && brand.backgroundColor ? getContrast(brand.backgroundColor) : '#a38f58';


  const teamReports = useMemo(() => {
    return reports.filter(r => 
      (r.team === team.name || r.opponent === team.name) && 
      (!r.level || r.level === team.level)
    );
  }, [reports, team]);

  const performanceData = useMemo(() => {
    const wins = teamReports.filter(r => {
      const isBasha = r.team === team.name;
      const result = isBasha ? r.matchResult : (r.matchResult === 'Win' ? 'Loss' : 'Win');
      return result === 'Win';
    }).length;

    const total = teamReports.filter(r => r.games.length > 0).length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    return [
      { name: 'Matches', value: total, color: '#a38f58' },
      { name: 'Win %', value: Math.round(winRate), color: winRate >= 50 ? '#012a17' : '#ef4444' }
    ];
  }, [teamReports, team]);

  const uniqueWeeks = useMemo(() => Array.from(new Set(teamReports.map(r => r.week))).sort((a,b)=>Number(a)-Number(b)), [teamReports]);
  const uniqueOpponents = useMemo(() => {
    const opps = new Set<string>();
    teamReports.forEach(r => {
      opps.add(r.opponent === team.name ? r.team : r.opponent);
    });
    return Array.from(opps).sort();
  }, [teamReports, team]);

  const filteredReports = useMemo(() => {
    return teamReports.filter(r => {
      const matchWeek = filterWeek ? r.week === filterWeek : true;
      const otherTeam = r.opponent === team.name ? r.team : r.opponent;
      const matchOpp = filterOpponent ? otherTeam === filterOpponent : true;
      return matchWeek && matchOpp;
    });
  }, [teamReports, filterWeek, filterOpponent, team]);

  const playerAggregates = useMemo(() => {
    const summary: Record<string, { 
      tagLine: string,
      games: number, 
      kills: number, 
      deaths: number, 
      assists: number, 
      cs: number, 
      vision: number,
      gold: number,
      damage: number,
      win: number,
      roles: Set<string>,
      champions: Record<string, { games: number, wins: number, kills: number, deaths: number, assists: number }>
    }> = {};

    teamReports.forEach(report => {
      const isBasha = report.team === team.name;
      report.games.forEach(game => {
        const gameWin = isBasha ? game.result === 'Win' : game.result === 'Loss';
        (Object.values(game.players) as PlayerStats[]).forEach(p => {
          if (!p.gamertag) return;
          if (!summary[p.gamertag]) {
            summary[p.gamertag] = { 
              tagLine: p.tagLine || "NA1",
              games: 0, kills: 0, deaths: 0, assists: 0, cs: 0, vision: 0, gold: 0, damage: 0, win: 0, roles: new Set(), champions: {}
            };
          }
          const s = summary[p.gamertag];
          s.games++;
          s.kills += p.kills;
          s.deaths += p.deaths;
          s.assists += p.assists;
          s.cs += p.cs;
          s.vision += (p.visionScore || 0);
          s.gold += (p.gold || 0);
          s.damage += (p.damage || 0);
          if (gameWin) s.win++;
          s.roles.add(p.role);

          if (p.champion) {
            if (!s.champions[p.champion]) {
              s.champions[p.champion] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
            }
            const c = s.champions[p.champion];
            c.games++;
            c.kills += p.kills;
            c.deaths += p.deaths;
            c.assists += p.assists;
            if (gameWin) c.wins++;
          }
        });
      });
    });

    return Object.entries(summary).map(([tag, data]) => {
      const mostPlayed = Object.entries(data.champions).sort((a,b) => b[1].games - a[1].games)[0];
      return {
        tag,
        ...data,
        kda: ((data.kills + data.assists) / Math.max(1, data.deaths)).toFixed(2),
        winRate: Math.round((data.win / data.games) * 100),
        avgCs: (data.cs / data.games).toFixed(1),
        avgVision: (data.vision / data.games).toFixed(1),
        avgGold: Math.round(data.gold / data.games),
        mainRole: Array.from(data.roles)[0],
        mostPlayed: mostPlayed ? {
          name: mostPlayed[0],
          winRate: Math.round((mostPlayed[1].wins / mostPlayed[1].games) * 100),
          kda: ((mostPlayed[1].kills + mostPlayed[1].assists) / Math.max(1, mostPlayed[1].deaths)).toFixed(2)
        } : null
      };
    }).sort((a, b) => b.games - a.games);
  }, [teamReports, team]);

  const [activeTab, setActiveTab] = useState<'matches' | 'players'>('matches');

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-white/5 rounded-full transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-brand-gold" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <SchoolBadge 
              schoolName={team.name} 
              brandings={brandings || {}} 
              size="lg"
              textClassName="text-2xl font-black uppercase italic font-display tracking-widest"
              className="gap-4"
            />
            <span className="text-[10px] bg-brand-gold/20 text-brand-gold border border-brand-gold/30 px-2 py-1 rounded uppercase tracking-widest font-black shrink-0">{team.level}</span>
          </div>
          <p className="text-xs text-brand-gold uppercase tracking-widest font-black mt-1">Performance Analytics Dashboard</p>
        </div>
      </div>

      {/* Performance Overview Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/5 border border-brand-gold/10 p-6 rounded-2xl h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-brand-white uppercase tracking-[0.2em] italic font-display flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-gold" /> Team Performance Metrics
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-brand-gold" />
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Matches</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-brand-green" />
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Win Rate</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={performanceData} layout="vertical" margin={{ left: 20, right: 40 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                width={80}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-brand-black border border-brand-gold/30 p-2 rounded shadow-2xl">
                        <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{payload[0].payload.name}</p>
                        <p className="text-xl font-black text-brand-white">
                          {payload[0].value}{payload[0].payload.name === 'Win %' ? '%' : ''}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-brand-gold/5 border border-brand-gold/10 p-6 rounded-2xl flex flex-col justify-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-black text-brand-white font-display italic leading-none">{performanceData[1].value}%</div>
            <div className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] mt-2">Overall Win Rate</div>
          </div>
          <div className="h-px bg-brand-gold/10 w-full" />
          <div className="text-center">
            <div className="text-3xl font-black text-brand-white font-display italic leading-none">{performanceData[0].value}</div>
            <div className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] mt-2">Total Scouted Games</div>
          </div>
          <div className="mt-4 p-4 bg-brand-black/40 border border-brand-gold/10 rounded-xl">
             <div className="flex items-center gap-2 mb-2">
               <Info className="w-3 h-3 text-brand-gold" />
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tactical Note</span>
             </div>
             <p className="text-[10px] text-gray-500 italic">Win rate is calculated based on completed match reports for the {team.level} division.</p>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'matches' ? 'text-brand-gold' : 'text-gray-600 hover:text-gray-400'}`}
        >
          Match Reports
          {activeTab === 'matches' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold" />}
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`px-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'players' ? 'text-brand-gold' : 'text-gray-600 hover:text-gray-400'}`}
        >
          Season Player Stats
          {activeTab === 'players' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold" />}
        </button>
      </div>

      {activeTab === 'matches' ? (
        <>
          {/* Filters */}
          <div className="bg-white/5 border border-brand-gold/10 p-6 rounded-xl flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 w-full sm:w-1/3">
              <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest pl-1">Filter by Week</label>
              <select 
                value={filterWeek}
                onChange={e => setFilterWeek(e.target.value)}
                className="w-full bg-black border border-brand-gold rounded-full px-4 py-2 text-xs font-black text-brand-gold focus:outline-none transition-all cursor-pointer"
              >
                <option value="">All Weeks</option>
                {uniqueWeeks.map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 w-full sm:w-1/3">
              <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest pl-1">Filter by Opponent</label>
              <select 
                value={filterOpponent}
                onChange={e => setFilterOpponent(e.target.value)}
                className="w-full bg-black border border-brand-gold rounded-full px-4 py-2 text-xs font-black text-brand-gold focus:outline-none transition-all cursor-pointer"
              >
                <option value="">All Opponents</option>
                {uniqueOpponents.map(opp => (
                  <option key={opp} value={opp}>{opp}</option>
                ))}
              </select>
            </div>
            <div className="sm:ml-auto mb-1">
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                 Showing {filteredReports.length} {filteredReports.length === 1 ? 'Report' : 'Reports'}
               </p>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {filteredReports.map(report => {
               const isBashaTeam = report.team === team.name;
               const opponent = isBashaTeam ? report.opponent : report.team;
               const teamResult = isBashaTeam ? report.matchResult : (report.matchResult === 'Win' ? 'Loss' : 'Win');
               
               return (
                 <div 
                   key={report.id}
                   onClick={() => onViewReport(report.id)}
                   className="group bg-white/5 border border-brand-gold/10 rounded-xl p-5 text-left hover:border-brand-gold/40 hover:bg-white/10 transition-all hover:shadow-2xl hover:shadow-brand-gold/5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                 >
                   <div className="space-y-2 flex-1">
                     <div className="flex items-center gap-2 text-[10px] font-black text-brand-gold uppercase tracking-widest">
                       <Calendar className="w-3 h-3" />
                       {report.date} • WEEK {report.week}
                     </div>
                     <h3 className="text-lg font-black text-brand-white flex items-center gap-2">
                        <SchoolBadge 
                          schoolName={opponent} 
                          brandings={brandings || {}} 
                          size="sm"
                          textClassName="text-lg font-black"
                        />
                        {report.iglNotes && <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-brand-gold/20 text-brand-gold text-[8px] rounded border border-brand-gold/30">IGL</span>}
                     </h3>
                     <p className="text-xs text-gray-400 font-bold">Scouted by {report.scouterName}</p>
                   </div>
                   
                   <div className="shrink-0 flex items-center gap-4">
                      {report.games.length > 0 ? (
                        <div className={`px-4 py-2 rounded-lg text-xs font-black uppercase shadow-sm flex items-center gap-2 ${teamResult === 'Win' ? 'bg-brand-green text-brand-gold border border-brand-gold/30 shadow-brand-gold/10' : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'}`}>
                          <Trophy className="w-4 h-4" />
                          {teamResult === 'Win' ? 'VICTORY' : 'DEFEAT'}
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-lg text-xs font-black uppercase bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                          IGL Report Only
                        </div>
                      )}
                   </div>
                 </div>
               );
            })}
            {filteredReports.length === 0 && (
              <div className="text-center p-12 bg-white/5 rounded-xl border border-white/10 border-dashed">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No match reports found for these filters.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white/5 border border-brand-gold/10 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-brand-gold/10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-brand-gold uppercase tracking-widest">Player</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-gold uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-gold uppercase tracking-widest text-center">Most Played</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-gold uppercase tracking-widest text-center">W/R</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-gold uppercase tracking-widest text-center">KDA</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-gold uppercase tracking-widest text-center">AVG CS</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-gold uppercase tracking-widest text-center">AVG VISION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {playerAggregates.map((player) => (
                <tr key={player.tag} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <a 
                      href={`https://www.op.gg/summoners/na/${player.tag}-${player.tagLine?.replace('#', '')}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="hover:underline hover:text-brand-gold transition-colors"
                    >
                      <span className="font-black text-brand-white italic font-display">{player.tag} <span className="text-gray-500 font-normal text-xs">#{player.tagLine}</span></span>
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{player.mainRole}</span>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-gray-400">{player.games}</td>
                  <td className="px-6 py-4 text-center">
                    {player.mostPlayed ? (
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-brand-white uppercase">{player.mostPlayed.name}</span>
                        <span className="text-[8px] text-gray-500 uppercase">{player.mostPlayed.winRate}% WR / {player.mostPlayed.kda} KDA</span>
                      </div>
                    ) : <span className="text-[10px] text-gray-500 italic">None</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-black ${player.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{player.winRate}%</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-black text-brand-gold italic font-display">{player.kda}</span>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-400 text-xs font-bold">{player.avgCs}</td>
                  <td className="px-6 py-4 text-center text-gray-400 text-xs font-bold">{player.avgVision}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {playerAggregates.length === 0 && (
            <div className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest text-sm">
              No player data available for this team.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
