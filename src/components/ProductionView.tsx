import React, { useMemo, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { ScoutingReport, PlayerStats, SchoolBranding, Season } from '../types';
import { Trophy, TrendingUp, Zap, Coins, Sword, Users, Scale, AlertTriangle, Shield, Activity, Filter, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SchoolBadge } from './SchoolBadge';
import { useBroadcast } from '../context/BroadcastContext';
import { SEASONS } from '../constants';

export function ProductionView({ 
  reports, 
  brandings = {},
  schedules = []
}: { 
  reports: ScoutingReport[], 
  brandings?: Record<string, SchoolBranding>,
  schedules?: any[]
}) {
  const { filters, setFilters } = useFilters();
  const { pushToOverlay } = useBroadcast();
  
  // Convert schedules to the expected format for autoDetectSide if needed
  const matchSchedule = useMemo(() => {
    // Attempt to normalize schedules or reports into a match schedule
    return schedules.length > 0 ? schedules : reports.map(r => ({
      week: r.week,
      homeTeam: r.team,
      awayTeam: r.opponent
    }));
  }, [schedules, reports]);

  const autoDetectSide = (currentWeek: string, opponentSchool: string) => {
    const weeklyMatch = matchSchedule.find(
      (m: any) => m.week === currentWeek && 
      (m.homeTeam === opponentSchool || m.awayTeam === opponentSchool)
    );

    if (weeklyMatch) {
      // If the opponent is Away, Basha is Home.
      return weeklyMatch.awayTeam === opponentSchool ? 'Home' : 'Away';
    }
    return 'Home'; // Default fallback
  };

  const detectedSide = useMemo(() => {
    if (filters.school === 'All' || filters.week === 'All') return 'Home';
    return autoDetectSide(filters.week, filters.school);
  }, [filters.week, filters.school, matchSchedule]);

  const [manualSide, setManualSide] = useState<'Home' | 'Away' | null>(null);
  const currentSide = manualSide || detectedSide;

  const team1 = currentSide === 'Home' ? 'Basha' : (filters.school !== 'All' ? filters.school : '');
  const team2 = currentSide === 'Home' ? (filters.school !== 'All' ? filters.school : '') : 'Basha';

  const availableSchools = useMemo(() => {
    const schools = new Set<string>();
    reports.forEach(r => {
      if (r.team) schools.add(r.team);
      if (r.opponent) schools.add(r.opponent);
    });
    return Array.from(schools).sort();
  }, [reports]);

  const availableWeeks = useMemo(() => {
    const weeks = new Set<string>();
    reports.forEach(r => {
      if (r.week) weeks.add(r.week);
    });
    return Array.from(weeks).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [reports]);

  const availablePlayers = useMemo(() => {
    const players = new Set<string>();
    reports.forEach(r => {
      if (filters.school && filters.school !== 'All' && r.team !== filters.school && r.opponent !== filters.school) return;
      r.games.forEach(g => {
        Object.values(g.players).forEach(p => {
          if (p.gamertag) players.add(p.gamertag);
        });
      });
    });
    return Array.from(players).sort();
  }, [reports, filters.school]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesSchool = filters.school === 'All' || r.team === filters.school || r.opponent === filters.school;
      const matchesLevel = filters.level === 'All' || r.level === filters.level;
      const matchesWeek = filters.week === 'All' || r.week === filters.week;
      const matchesSeason = filters.season === 'All' || r.season === filters.season;
      const matchesYear = filters.year === 'All' || r.year === filters.year;
      
      let matchesPlayer = true;
      if (filters.player !== 'All') {
        matchesPlayer = r.games.some(g => Object.values(g.players).some(p => p.gamertag === filters.player));
      }

      return matchesSchool && matchesLevel && matchesWeek && matchesPlayer && matchesSeason && matchesYear;
    });
  }, [reports, filters]);

  const schools = useMemo(() => {
    const set = new Set<string>();
    filteredReports.forEach(r => {
      if (r.team) set.add(r.team);
      if (r.opponent) set.add(r.opponent);
    });
    return Array.from(set).sort();
  }, [filteredReports]);

  const teamStats = useMemo(() => {
    const stats: Record<string, { 
      wins: number, 
      losses: number, 
      totalGames: number, 
      kills: number, 
      deaths: number, 
      assists: number, 
      gold: number, 
      damage: number, 
      cs: number,
      matches: number
    }> = {};

    filteredReports.forEach(r => {
      // Initialize if needed
      if (!stats[r.team]) stats[r.team] = { wins: 0, losses: 0, totalGames: 0, kills: 0, deaths: 0, assists: 0, gold: 0, damage: 0, cs: 0, matches: 0 };
      if (!stats[r.opponent]) stats[r.opponent] = { wins: 0, losses: 0, totalGames: 0, kills: 0, deaths: 0, assists: 0, gold: 0, damage: 0, cs: 0, matches: 0 };

      const homeWin = r.matchResult === 'Win';
      
      // Update match records
      stats[r.team].matches++;
      stats[r.opponent].matches++;
      if (homeWin) {
        stats[r.team].wins++;
        stats[r.opponent].losses++;
      } else {
        stats[r.team].losses++;
        stats[r.opponent].wins++;
      }

      r.games.forEach(g => {
        stats[r.team].totalGames++;
        stats[r.opponent].totalGames++; // Both played this game
        
        Object.values(g.players).forEach(anyP => {
          const p = anyP as PlayerStats;
          // Assuming player data in report belongs to r.team
          if (stats[r.team]) {
            stats[r.team].kills += p.kills || 0;
            stats[r.team].deaths += p.deaths || 0;
            stats[r.team].assists += p.assists || 0;
            stats[r.team].gold += p.gold || 0;
            stats[r.team].damage += p.damage || 0;
            stats[r.team].cs += p.cs || 0;
          }
        });
      });
    });

    const finalized: Record<string, any> = {};
    Object.entries(stats).forEach(([name, data]) => {
      const avgDuration = 30; // Minutes per game estimate
      const totalMinutes = data.totalGames * avgDuration;
      finalized[name] = {
        name,
        ...data,
        kda: ((data.kills + data.assists) / Math.max(1, data.deaths)).toFixed(2),
        gpm: Math.round(data.gold / Math.max(1, totalMinutes)),
        dpm: Math.round(data.damage / Math.max(1, totalMinutes)),
        cpm: (data.cs / Math.max(1, totalMinutes)).toFixed(1),
        winRate: data.matches > 0 ? Math.round((data.wins / data.matches) * 100) : 0
      };
    });
    return finalized;
  }, [filteredReports]);

  const t1Data = teamStats[team1];
  const t2Data = teamStats[team2];

  const availableBashaPlayers = useMemo(() => {
    const players = new Set<{gamertag: string, tagLine: string}>();
    reports.forEach(r => {
      const isBasha = r.team.toLowerCase().includes('basha');
      if (!isBasha) return;
      r.games.forEach(g => {
        Object.values(g.players).forEach(p => {
          if (p.gamertag) {
            players.add({ gamertag: p.gamertag, tagLine: p.tagLine || 'NA1' });
          }
        });
      });
    });
    // Deduplicate by gamertag
    const unique = Array.from(players);
    const seen = new Set();
    return unique.filter(p => {
      const duplicate = seen.has(p.gamertag);
      seen.add(p.gamertag);
      return !duplicate;
    }).sort((a, b) => a.gamertag.localeCompare(b.gamertag));
  }, [reports]);

  const [selectedOverlayPlayer, setSelectedOverlayPlayer] = useState<string>('');

  const overlayPlayerStats = useMemo(() => {
    if (!selectedOverlayPlayer) return null;

    let kills = 0;
    let deaths = 0;
    let assists = 0;
    let cs = 0;
    let vision = 0;
    let totalMinutes = 0;
    let gamesCount = 0;
    let teamKills = 0;
    let tagLine = 'NA1';

    const champions: Record<string, { games: number, wins: number }> = {};

    reports.forEach(r => {
      const isBasha = r.team.toLowerCase().includes('basha');
      if (!isBasha) return;

      r.games.forEach(g => {
        const player = Object.values(g.players).find(p => p.gamertag === selectedOverlayPlayer);
        if (player) {
          kills += player.kills || 0;
          deaths += player.deaths || 0;
          assists += player.assists || 0;
          cs += player.cs || 0;
          vision += player.visionScore || 0;
          totalMinutes += 30; // Assuming 30m average if duration missing
          gamesCount++;
          tagLine = player.tagLine || tagLine;

          const champ = player.champion;
          if (!champions[champ]) champions[champ] = { games: 0, wins: 0 };
          champions[champ].games++;
          if (g.result === 'Win') champions[champ].wins++;

          // Team kills for KP%
          Object.values(g.players).forEach(p => {
            teamKills += p.kills || 0;
          });
        }
      });
    });

    if (gamesCount === 0) return null;

    const topChamps = Object.entries(champions)
      .sort((a, b) => b[1].games - a[1].games)
      .slice(0, 3)
      .map(([name, data]) => ({
        name,
        winRate: Math.round((data.wins / data.games) * 100)
      }));

    return {
      gamertag: selectedOverlayPlayer,
      tagLine,
      kda: ((kills + assists) / Math.max(1, deaths)).toFixed(2),
      cpm: (cs / totalMinutes).toFixed(1),
      kp: teamKills > 0 ? Math.round(((kills + assists) / teamKills) * 100) : 0,
      vision: (vision / gamesCount).toFixed(1),
      topChamps
    };
  }, [reports, selectedOverlayPlayer]);

  const copyStatsToClipboard = () => {
    if (!overlayPlayerStats) return;
    const champString = overlayPlayerStats.topChamps.map(c => `${c.name} (${c.winRate}% WR)`).join(', ');
    const text = `${overlayPlayerStats.gamertag}#${overlayPlayerStats.tagLine} | KDA: ${overlayPlayerStats.kda} | CS/M: ${overlayPlayerStats.cpm} | KP: ${overlayPlayerStats.kp}% | Vision: ${overlayPlayerStats.vision} | Top Champs: ${champString}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl md:text-5xl font-black text-brand-white uppercase italic font-display tracking-tighter leading-none">Production Hub</h2>
          <p className="text-brand-gold font-black tracking-[0.2em] uppercase text-xs flex items-center gap-2">
            <Zap className="w-4 h-4 fill-brand-gold" /> Broadcast Performance Controls
          </p>
        </div>
        <button onClick={pushToOverlay} className="bg-brand-gold text-brand-black px-8 py-4 font-black rounded-xl shadow-xl shadow-brand-gold/30 hover:scale-105 active:scale-95 transition-all uppercase text-xs tracking-widest">Sync to Overlay Feed</button>
      </div>

      {/* Analytics Preview Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div className="p-8 bg-white/5 rounded-3xl border border-white/10 text-white flex flex-col gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-gold/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform" />
            <h3 className="font-black text-lg uppercase tracking-widest flex items-center gap-2 text-brand-gold"><Activity /> Production Analytics</h3>
            <p className="text-xs text-gray-400 font-medium leading-relaxed">Processing {filteredReports.length} reports for broadcast metrics. Using global filters for synchronized data visualization.</p>
            <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-gray-500 uppercase">Status</span>
                <span className="text-[10px] font-black text-brand-green uppercase">Ready for Sync</span>
              </div>
            </div>
         </div>

         {/* Broadcast Overlay Stats Module */}
         <div className="lg:col-span-2 p-8 bg-brand-black border border-brand-gold/20 rounded-3xl relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 p-4">
              <Sword className="w-12 h-12 text-brand-gold/5 -rotate-12" />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-1">
                <h3 className="font-black text-lg uppercase tracking-widest text-brand-gold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" /> Broadcast Overlay Stats
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Select player for live broadcast graphic generation</p>
              </div>

              <select 
                value={selectedOverlayPlayer}
                onChange={(e) => setSelectedOverlayPlayer(e.target.value)}
                className="bg-black border border-brand-gold/30 rounded-xl px-4 py-2 text-xs font-black text-brand-gold focus:border-brand-gold outline-none transition-all cursor-pointer min-w-[200px]"
              >
                <option value="">Select Basha Player...</option>
                {availableBashaPlayers.map(p => (
                  <option key={p.gamertag} value={p.gamertag}>{p.gamertag} #{p.tagLine}</option>
                ))}
              </select>
            </div>

            <AnimatePresence mode="wait">
              {overlayPlayerStats ? (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8"
                >
                  <div className="md:col-span-1 space-y-4">
                    <div className="p-4 bg-brand-gold/10 border border-brand-gold/30 rounded-2xl text-center">
                      <a 
                        href={`https://www.op.gg/summoners/na/${overlayPlayerStats.gamertag}-${overlayPlayerStats.tagLine.replace('#', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="group"
                      >
                        <h4 className="text-2xl font-black text-brand-white italic font-display group-hover:text-brand-gold transition-colors">{overlayPlayerStats.gamertag}</h4>
                        <p className="text-gray-500 font-bold text-xs">#{overlayPlayerStats.tagLine}</p>
                      </a>
                    </div>
                    <button 
                      onClick={copyStatsToClipboard}
                      className="w-full py-3 bg-brand-gold text-brand-green font-black rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-brand-gold/20"
                    >
                      Copy to Clipboard
                    </button>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <OverlayStat label="KDA" value={overlayPlayerStats.kda} />
                    <OverlayStat label="CS/M" value={overlayPlayerStats.cpm} />
                    <OverlayStat label="KP%" value={`${overlayPlayerStats.kp}%`} />
                    <OverlayStat label="Vision" value={overlayPlayerStats.vision} />
                    
                    <div className="col-span-2 lg:col-span-4 mt-2">
                       <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Champion Pool (Win Rate)</p>
                       <div className="flex gap-2">
                          {overlayPlayerStats.topChamps.map(c => (
                            <div key={c.name} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2">
                              <span className="text-[10px] font-black text-white">{c.name}</span>
                              <span className="text-[9px] font-bold text-brand-gold">{c.winRate}%</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="mt-8 flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/5 rounded-2xl bg-black/20">
                   <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Select player to preview stats</p>
                </div>
              )}
            </AnimatePresence>
         </div>
      </div>

      {/* Control Panel: Side Toggle */}
      <div className="bg-white/5 border border-brand-gold/10 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-md shadow-2xl">
        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
              <Scale className="w-4 h-4" /> Basha Side Selection
            </h3>
            <div className="flex items-center gap-2">
              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${!manualSide ? 'bg-brand-gold text-brand-green' : 'bg-white/10 text-gray-500'}`}>Auto</span>
              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${manualSide ? 'bg-brand-gold text-brand-green' : 'bg-white/10 text-gray-500'}`}>Manual</span>
            </div>
          </div>
          
          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setManualSide('Home')}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${currentSide === 'Home' ? 'bg-brand-gold text-brand-green shadow-lg shadow-brand-gold/10' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Basha Home (Blue)
            </button>
            <button 
              onClick={() => setManualSide('Away')}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${currentSide === 'Away' ? 'bg-brand-gold text-brand-green shadow-lg shadow-brand-gold/10' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Basha Away (Red)
            </button>
          </div>
          <p className="text-[10px] text-gray-500 font-medium italic">
            {!manualSide ? `Automatically detected based on schedule for ${filters.school} in Week ${filters.week}.` : "Manual override active."}
            <button onClick={() => setManualSide(null)} className="ml-2 text-brand-gold hover:underline">Reset to Auto</button>
          </p>
        </div>

        <div className="hidden md:block w-px h-16 bg-white/10" />

        <div className="flex-1 space-y-4">
           <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Active Matchup</h3>
              <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Week {filters.week}</span>
           </div>
           <div className="flex items-center justify-center gap-4 py-2">
              <div className="flex flex-col items-center">
                <SchoolBadge schoolName={team1} brandings={brandings} hideName size="sm" />
                <span className="text-[10px] font-black uppercase mt-1">{team1}</span>
              </div>
              <span className="text-xs font-black italic text-gray-600">VS</span>
              <div className="flex flex-col items-center">
                <SchoolBadge schoolName={team2} brandings={brandings} hideName size="sm" />
                <span className="text-[10px] font-black uppercase mt-1">{team2}</span>
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {t1Data && t2Data ? (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="relative"
          >
            {/* Visual Overlay Graphic Container */}
            <div className="relative bg-brand-black border-y-2 border-brand-gold/30 overflow-hidden shadow-[0_0_100px_rgba(197,179,88,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-transparent to-red-900/10" />
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #a38f58 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* BLUE SIDE */}
                <div className="relative p-12 md:p-16 border-b md:border-b-0 md:border-r border-brand-gold/10">
                   <div className="relative z-10 space-y-12">
                      <div className="space-y-4">
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] border border-blue-500/20">Blue Side</span>
                        <div className="flex items-center gap-6">
                           <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden shadow-2xl shrink-0">
                              <SchoolBadge schoolName={t1Data.name} brandings={brandings} hideName size="lg" className="scale-150" />
                           </div>
                           <div>
                              <h3 className="text-6xl font-black text-brand-white italic uppercase font-display leading-[0.8] tracking-tighter">{t1Data.name}</h3>
                              <p className="text-2xl font-black text-brand-gold italic font-display mt-2">{t1Data.wins}W - {t1Data.losses}L</p>
                           </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                         <GraphicMetric label="KDA Ratio" value={t1Data.kda} highlight />
                         <GraphicMetric label="Gold / Min" value={t1Data.gpm.toString()} />
                         <GraphicMetric label="Damage / Min" value={t1Data.dpm.toString()} />
                         <GraphicMetric label="CS / Min" value={t1Data.cpm} />
                      </div>

                      <div className="space-y-4 pt-8 border-t border-brand-gold/10">
                        <MetricBar label="Win Efficiency" value={t1Data.winRate} color="bg-blue-500" />
                        <MetricBar label="Combat Index" value={Math.min(parseFloat(t1Data.kda) * 10, 100)} color="bg-brand-gold" />
                      </div>
                   </div>
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Shield className="w-64 h-64 text-brand-gold" />
                   </div>
                </div>

                {/* RED SIDE */}
                <div className="relative p-12 md:p-16 text-right">
                   <div className="relative z-10 space-y-12">
                      <div className="space-y-4">
                        <span className="px-3 py-1 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-[0.3em] border border-red-500/20">Red Side</span>
                        <div className="flex flex-row-reverse items-center gap-6">
                           <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden shadow-2xl shrink-0">
                              <SchoolBadge schoolName={t2Data.name} brandings={brandings} hideName size="lg" className="scale-150" />
                           </div>
                           <div>
                              <h3 className="text-6xl font-black text-brand-white italic uppercase font-display leading-[0.8] tracking-tighter">{t2Data.name}</h3>
                              <p className="text-2xl font-black text-red-500 italic font-display mt-2">{t2Data.wins}W - {t2Data.losses}L</p>
                           </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                         <GraphicMetric label="KDA Ratio" value={t2Data.kda} highlight />
                         <GraphicMetric label="Gold / Min" value={t2Data.gpm.toString()} />
                         <GraphicMetric label="Damage / Min" value={t2Data.dpm.toString()} />
                         <GraphicMetric label="CS / Min" value={t2Data.cpm} />
                      </div>

                      <div className="space-y-4 pt-8 border-t border-brand-gold/10">
                        <MetricBar label="Win Efficiency" value={t2Data.winRate} color="bg-red-500" reverse />
                        <MetricBar label="Combat Index" value={Math.min(parseFloat(t2Data.kda) * 10, 100)} color="bg-brand-gold" reverse />
                      </div>
                   </div>
                   <div className="absolute top-0 left-0 p-8 opacity-5">
                      <Users className="w-64 h-64 text-brand-gold" />
                   </div>
                </div>
              </div>

              {/* Central Comparison Graphic */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-4 z-20">
                 <div className="w-20 h-20 bg-brand-black border border-brand-gold/40 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(197,179,88,0.2)]">
                    <span className="text-4xl font-black text-brand-gold italic font-display">VS</span>
                 </div>
                 <div className="px-4 py-1 bg-brand-gold/20 backdrop-blur rounded-full border border-brand-gold/40">
                    <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.4em]">Broadcast Graphic</p>
                 </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6">
              <button 
                onClick={() => { setManualSide(null); }}
                className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-white/10 transition-all font-display hover:text-brand-gold"
              >
                Reset to Auto-Detection
              </button>
              <button className="px-8 py-3 bg-brand-gold text-brand-green border border-brand-gold rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-gold/20 font-display">
                Export Graphic Package
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-4 bg-brand-black/20 border-2 border-dashed border-white/5 rounded-3xl">
            <div className="w-24 h-24 bg-brand-gold/5 rounded-full flex items-center justify-center border border-brand-gold/10 text-brand-gold/30">
              <Scale className="w-12 h-12" />
            </div>
            <div className="space-y-1">
              <h4 className="text-brand-white text-2xl font-black uppercase italic font-display">Graphic Generator Standby</h4>
              <p className="text-sm text-gray-500 max-w-sm mx-auto font-medium">Select two schools from the dropdowns above to generate broadcast-ready aggregate performance overlays.</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GraphicMetric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="space-y-1">
       <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</p>
       <p className={`text-5xl font-black italic font-display leading-none ${highlight ? 'text-brand-gold animate-pulse' : 'text-brand-white'}`}>{value}</p>
    </div>
  );
}

function MetricBar({ label, value, color, reverse = false }: { label: string; value: number; color: string; reverse?: boolean }) {
  return (
    <div className="space-y-1.5 w-full">
      <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${reverse ? 'flex-row-reverse text-right' : ''}`}>
        <span className="text-gray-500">{label}</span>
        <span className="text-brand-white">{Math.round(value)}%</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[0.5px] border border-white/10">
        <div 
          className={`h-full rounded-full ${color} transition-all duration-1000 ${reverse ? 'ml-auto' : ''}`} 
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function OverlayStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-xl font-black text-brand-white italic font-display">{value}</p>
    </div>
  );
}
