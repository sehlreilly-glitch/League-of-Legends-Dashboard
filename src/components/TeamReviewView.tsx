import React, { useMemo, useState, useEffect } from 'react';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Users, 
  Zap, 
  Activity,
  Calendar,
  ChevronUp,
  ChevronDown,
  BarChart2,
  PieChart as PieChartIcon,
  Sword,
  Shield,
  Eye,
  Award,
  Filter,
  FileText,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { ScoutingReport, Role, PlayerStats } from '../types';
import { darkenColor } from '../utils';
import { SchoolBadge } from './SchoolBadge';
import { generateTeamScoutingReport } from '../services/geminiService';
import { fetchChampions, DDragonChampion } from '../services/ddragonService';
import { useFilters } from '../context/FilterContext';

interface TeamReviewViewProps {
  reports: ScoutingReport[];
  getChampionIconUrl: (champion: string | null) => string;
  brandings?: Record<string, any>;
  reportId?: string | null;
}

export const TeamReviewView: React.FC<TeamReviewViewProps> = ({ reports, getChampionIconUrl, brandings, reportId }) => {
  const { filters } = useFilters();
  const [sortField, setSortField] = useState<'gamertag' | 'winRate' | 'kdaRaw' | 'csPerMinRaw' | 'avgVisionRaw'>('winRate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [aiScoutingReport, setAiScoutingReport] = useState<{ threatLevels: string[], weaknesses: string[], objectivePriorities: string[], summary: string } | null>(null);
  const [isGeneratingScouting, setIsGeneratingScouting] = useState(false);
  const [activeView, setActiveView] = useState<'roster' | 'comparison'>('roster');

  useEffect(() => {
    if (filters.level === 'Non-AIA') {
      setAiScoutingReport(null);
    }
  }, [filters.level]);
  const [allChamps, setAllChamps] = useState<DDragonChampion[]>([]);

  React.useEffect(() => {
    fetchChampions().then(setAllChamps);
  }, []);

  const activeSchoolName = 'Basha';
  const activeBrandKey = brandings ? Object.keys(brandings).find(k => k.toLowerCase() === activeSchoolName.toLowerCase()) : null;
  const activeBrand = activeBrandKey ? brandings![activeBrandKey] : null;

  // Filter lists for the dropdowns
  // Filter reports for the active school based on ALL triple filters
  const filteredReports = useMemo(() => {
    if (reportId) {
      return reports.filter(r => r.id === reportId || r.reportId === reportId);
    }
    return reports.filter(r => {
      // Data Isolation: Only Basha matches against the selected opponent in Team Review
      const isBashaMatch = r.team === 'Basha' || r.opponent === 'Basha';
      if (!isBashaMatch) return false;

      // Opponent Filter (Global Filter)
      if (filters.school !== 'All') {
        const hasSelectedOpponent = r.team === filters.school || r.opponent === filters.school;
        if (!hasSelectedOpponent) return false;
      }

      const matchesLevel = filters.level === 'All' || r.level === filters.level;
      const matchesWeek = filters.week === 'All' || r.week === filters.week;
      const matchesSeason = filters.season === 'All' || r.season === filters.season;
      const matchesYear = filters.year === 'All' || r.year === filters.year;
      
      let matchesPlayer = true;
      if (filters.player !== 'All') {
        matchesPlayer = r.games.some(g => Object.values(g.players).some((p: any) => p?.gamertag === filters.player));
      }

      let matchesChampion = true;
      if (filters.champion !== 'All') {
        matchesChampion = r.games.some(g => Object.values(g.players).some((p: any) => p?.champion === filters.champion));
      }
      
      return matchesLevel && matchesWeek && matchesPlayer && matchesChampion && matchesSeason && matchesYear;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reports, filters]);

  // Scouting Insights Aggregation
  const scoutingInsights = useMemo(() => {
    const insights: { type: 'stats' | 'igl', content: string, source: string, date: string }[] = [];
    
    filteredReports.forEach(r => {
      // Pull stats report insights if they exist (usually simplified notes or high-level observations)
      // For this implementation, we simulate extraction or pull from known fields
      
      if (r.iglNotes) {
        r.iglNotes.games.forEach(g => {
          if (g.notes.summary?.aiRefined) {
            insights.push({
              type: 'igl',
              content: g.notes.summary.aiRefined,
              source: `IGL Report - Game ${g.gameNumber}`,
              date: r.date
            });
          }
          
          // Role specific notes
          (['top', 'jungle', 'mid', 'adc', 'support'] as const).forEach(role => {
            const note = g.notes[role];
            if (note && note.length > 20) { // Only long enough notes
              insights.push({
                type: 'igl',
                content: note,
                source: `${role.toUpperCase()} Insight - Game ${g.gameNumber}`,
                date: r.date
              });
            }
          });
        });
      }
    });

    return insights.slice(0, 8); // Keep top 8 for readability
  }, [filteredReports]);

  const stats = useMemo(() => {
    if (filteredReports.length === 0) return null;

    let totalWins = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let totalCS = 0;
    let gameCount = 0;
    let totalMinutes = 0;

    let runningWins = 0;
    const timelineData = filteredReports.map((report, idx) => {
      // If filtering for a specific school, we track their win/loss
      // If school is 'All', default to the report's home team
      const target = 'Basha';
      const isTargetTeam = report.team.toLowerCase().includes(target.toLowerCase());
      const win = (isTargetTeam && report.matchResult === 'Win') || (!isTargetTeam && report.matchResult === 'Loss');
      
      if (win) {
        totalWins++;
        runningWins++;
      }

      let reportKills = 0;
      let reportDeaths = 0;
      let reportAssists = 0;
      let reportCS = 0;

      report.games.forEach(game => {
        gameCount++;
        let durationMinutes = 25; // fallback
        if (game.time) {
          const parts = game.time.split(':');
          if (parts.length === 2) {
             durationMinutes = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
          }
        }
        totalMinutes += durationMinutes;

        Object.entries(game.players).forEach(([role, p]) => {
          const pStats = p as PlayerStats;
          // Only count stats for the target team
          const isPlayerOnTargetTeam = isTargetTeam; // simplified assumption for MVP
          if (pStats && isPlayerOnTargetTeam) {
            reportKills += pStats.kills;
            reportDeaths += pStats.deaths;
            reportAssists += pStats.assists;
            reportCS += pStats.cs;
          }
        });
      });

      totalKills += reportKills;
      totalDeaths += reportDeaths;
      totalAssists += reportAssists;
      totalCS += reportCS;

      const currentAvgKda = ((totalKills + totalAssists) / Math.max(1, totalDeaths)).toFixed(2);
      const currentAvgCsMin = (totalCS / Math.max(1, totalMinutes)).toFixed(1);

      return {
        date: report.date,
        result: win ? 1 : 0,
        winRate: Math.round((runningWins / (idx + 1)) * 100),
        kills: Math.round(reportKills / Math.max(1, report.games.length)),
        deaths: Math.round(reportDeaths / Math.max(1, report.games.length)),
        avgKda: parseFloat(currentAvgKda),
        avgCsMin: parseFloat(currentAvgCsMin)
      };
    });

    // Individual Player Performance Analytics
    const playerAnalytics: Record<string, { role: Role, tagLine: string, kills: number, deaths: number, assists: number, cs: number, vision: number, games: number, wins: number, totalMinutes: number }> = {};
    filteredReports.forEach(r => {
      const target = 'Basha';
      const isTargetTeam = r.team.toLowerCase().includes(target.toLowerCase());
      
      r.games.forEach(g => {
        let durationMinutes = 25; 
        if (g.time) {
          const parts = g.time.split(':');
          if (parts.length === 2) {
             durationMinutes = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
          }
        }
        Object.values(g.players).forEach(p => {
          const pStats = p as PlayerStats;
          if (pStats && pStats.gamertag) {
            if (!playerAnalytics[pStats.gamertag]) {
              playerAnalytics[pStats.gamertag] = { role: pStats.role, tagLine: pStats.tagLine || "NA1", kills: 0, deaths: 0, assists: 0, cs: 0, vision: 0, games: 0, wins: 0, totalMinutes: 0 };
            }
            const a = playerAnalytics[pStats.gamertag];
            a.games++;
            a.kills += pStats.kills;
            a.deaths += pStats.deaths;
            a.assists += pStats.assists;
            a.cs += pStats.cs;
            a.vision += pStats.visionScore || 0;
            a.totalMinutes += durationMinutes;
            const won = (isTargetTeam && g.result === 'Win') || (!isTargetTeam && g.result === 'Loss');
            if (won) a.wins++;
          }
        });
      });
    });

    const performanceAnalytics = Object.entries(playerAnalytics).map(([gamertag, a]) => ({
      gamertag,
      tagLine: a.tagLine,
      role: a.role,
      kda: ((a.kills + a.assists) / Math.max(1, a.deaths)).toFixed(2),
      kdaRaw: ((a.kills + a.assists) / Math.max(1, a.deaths)),
      csPerMin: (a.cs / Math.max(1, a.totalMinutes)).toFixed(1),
      csPerMinRaw: (a.cs / Math.max(1, a.totalMinutes)),
      avgVision: (a.vision / Math.max(1, a.games)).toFixed(1),
      avgVisionRaw: (a.vision / Math.max(1, a.games)),
      winRate: Math.round((a.wins / Math.max(1, a.games)) * 100),
      games: a.games
    }));

    // Champion Mastery
    const playerMastery: Record<string, { gamertag: string, tagLine: string, role: Role, champions: Record<string, any> }> = {};
    filteredReports.forEach(r => {
      const target = 'Basha';
      const isTargetTeam = r.team.toLowerCase().includes(target.toLowerCase());
      r.games.forEach(g => {
        const gameWin = (isTargetTeam && g.result === 'Win') || (!isTargetTeam && g.result === 'Loss');
        Object.values(g.players).forEach(p => {
          const ps = p as PlayerStats;
          if (ps && ps.gamertag) {
            if (!playerMastery[ps.gamertag]) playerMastery[ps.gamertag] = { gamertag: ps.gamertag, tagLine: ps.tagLine || "NA1", role: ps.role, champions: {} };
            const champ = ps.champion;
            if (!playerMastery[ps.gamertag].champions[champ]) {
              playerMastery[ps.gamertag].champions[champ] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
            }
            const c = playerMastery[ps.gamertag].champions[champ];
            c.games++;
            if (gameWin) c.wins++;
            c.kills += ps.kills;
            c.deaths += ps.deaths;
            c.assists += ps.assists;
          }
        });
      });
    });

    const playerPerformance = Object.values(playerMastery).map(player => {
      const champions = Object.entries(player.champions)
        .map(([name, s]: [string, any]) => ({
          name,
          ...s,
          winRate: Math.round((s.wins / s.games) * 100),
          kda: ((s.kills + s.assists) / Math.max(1, s.deaths)).toFixed(2)
        }))
        .sort((a, b) => b.games - a.games);

      return {
        gamertag: player.gamertag,
        tagLine: player.tagLine,
        role: player.role,
        mainChampions: champions.slice(0, 3)
      };
    });

    const roleAggregates = (['Top', 'Jungle', 'Mid', 'ADC', 'Support'] as Role[]).map(role => {
      const players = Object.entries(playerAnalytics).filter(([_, p]) => p.role === role);
      let tK = 0, tD = 0, tA = 0, tCS = 0, tV = 0, tG = 0, tW = 0, tM = 0;
      players.forEach(([_, r]) => {
        tK += r.kills; tD += r.deaths; tA += r.assists; tCS += r.cs; tV += r.vision; tG += r.games; tW += r.wins; tM += r.totalMinutes;
      });
      return {
        role,
        kda: tG > 0 ? ((tK + tA) / Math.max(1, tD)).toFixed(2) : '0.00',
        csPerMin: tG > 0 ? (tCS / Math.max(1, tM)).toFixed(1) : '0.0',
        winRate: tG > 0 ? Math.round((tW / tG) * 100) : 0
      };
    });

    return {
      winRate: Math.round((totalWins / Math.max(1, filteredReports.length)) * 100),
      totalMatches: filteredReports.length,
      avgKda: ((totalKills + totalAssists) / Math.max(1, totalDeaths)).toFixed(2),
      timelineData,
      performanceAnalytics,
      playerPerformance,
      roleAggregates
    };
  }, [filteredReports, filters.school]);

  const comparisonStats = useMemo(() => {
    if (stats?.performanceAnalytics) {
      return stats.performanceAnalytics.sort((a, b) => b.games - a.games);
    }
    return [];
  }, [stats]);

  const selectStyle = "bg-slate-900 border border-brand-gold/40 rounded-xl px-4 py-2.5 text-xs font-black text-brand-gold uppercase tracking-widest focus:outline-none focus:border-brand-gold transition-all appearance-none cursor-pointer min-w-[160px]";

  if (!stats) {
    return (
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center p-2 border border-white/10 shadow-xl">
                <SchoolBadge schoolName={activeSchoolName} size="lg" hideName brandings={brandings || {}} />
              </div>
              {filters.school !== 'All' && (
                <>
                  <span className="text-brand-gold font-black italic opacity-40">VS</span>
                  <div className="w-16 h-16 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center p-2 border border-white/10 shadow-xl">
                    <SchoolBadge schoolName={filters.school} size="lg" hideName brandings={brandings || {}} />
                  </div>
                </>
              )}
            </div>
            <div>
              <h2 className="text-3xl font-black text-brand-white italic font-display uppercase tracking-tight">VS {filters.school !== 'All' ? filters.school : 'ALL OPPONENTS'}</h2>
              <p className="text-brand-gold font-black uppercase text-[10px] tracking-[0.2em]">{activeSchoolName} Head-to-Head Performance</p>
            </div>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center p-20 bg-brand-dark/50 rounded-2xl border-2 border-dashed border-brand-gold/20">
          <Users className="w-16 h-16 text-brand-gold/40 mb-4" />
          <h3 className="text-xl font-black text-brand-white italic font-display">NO SCOUTING DATA FOUND</h3>
          <p className="text-gray-500 mt-2">No reports match the current filter selection against this opponent.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 shrink-0 bg-white/5 rounded-3xl flex items-center justify-center p-3 border border-white/10 shadow-2xl">
              <SchoolBadge schoolName={activeSchoolName} size="lg" hideName brandings={brandings || {}} />
            </div>
            {filters.school !== 'All' && (
              <>
                <span className="text-brand-gold font-black italic opacity-40">VS</span>
                <div className="w-20 h-20 shrink-0 bg-white/5 rounded-3xl flex items-center justify-center p-3 border border-white/10 shadow-2xl">
                  <SchoolBadge schoolName={filters.school} size="lg" hideName brandings={brandings || {}} />
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col">
            <h2 className="text-4xl md:text-5xl font-black text-brand-white italic font-display uppercase tracking-tighter leading-none">
              VS {filters.school !== 'All' ? filters.school.toUpperCase() : 'ALL OPPONENTS'}
            </h2>
            <p className="text-brand-gold font-black uppercase text-3xl tracking-[0.1em] mt-2 truncate min-w-0">{activeSchoolName} HEAD-TO-HEAD</p>
            <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.3em] mt-1">Official League of Legends Performance Hub</p>
          </div>
        </div>
      </header>

      {/* View Toggle */}
      <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveView('roster')}
          className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeView === 'roster' ? 'bg-brand-gold text-brand-green' : 'text-gray-500 hover:text-white'
          }`}
        >
          Roster Overview
        </button>
        <button 
          onClick={() => setActiveView('comparison')}
          className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeView === 'comparison' ? 'bg-brand-gold text-brand-green' : 'text-gray-500 hover:text-white'
          }`}
        >
          Player Comparison
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'roster' ? (
          <motion.div 
            key="roster"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* AI Tactical Focus Card */}
            <div className="bg-gradient-to-r from-brand-dark/80 to-[#1e1a12]/80 border border-brand-gold/30 rounded-3xl p-8 mb-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Target className="w-48 h-48 text-brand-gold" />
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                <div>
                  <h3 className="text-3xl font-black text-brand-gold italic font-display tracking-wide uppercase flex items-center gap-3">
                    <Zap className="w-8 h-8" />
                    AI Tactical Focus
                  </h3>
                  <p className="text-gray-400 text-xs font-black uppercase tracking-widest mt-1">Cross-Game Strategic Analysis</p>
                </div>
                
                {filteredReports.length > 0 && (
                  <button
                    onClick={async () => {
                      setIsGeneratingScouting(true);
                      const result = await generateTeamScoutingReport(filteredReports, activeSchoolName);
                      setAiScoutingReport(result);
                      setIsGeneratingScouting(false);
                    }}
                    disabled={isGeneratingScouting}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-gold text-brand-green rounded-xl font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-xl shadow-brand-gold/20"
                  >
                    {isGeneratingScouting ? 'Dissecting Data...' : 'Trigger AI Analysis'}
                  </button>
                )}
              </div>

              <AnimatePresence mode="popLayout">
                {filteredReports.filter(r => r.iglNotes).length === 0 ? (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="bg-black/40 border border-brand-gold/20 rounded-2xl p-8 text-center h-48 flex flex-col items-center justify-center relative z-10">
                    <Filter className="w-12 h-12 text-brand-gold/50 mb-3" />
                    <p className="text-sm font-black text-white uppercase italic">Waiting for Player Reports</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-md">No IGL data is present for the filtered week. Adjust filters to populate analytical models.</p>
                  </motion.div>
                ) : !aiScoutingReport ? (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="bg-black/40 border border-brand-gold/20 rounded-2xl p-8 text-center h-48 flex flex-col items-center justify-center relative z-10">
                    <Zap className="w-12 h-12 text-brand-gold/20 mb-3" />
                    <p className="text-sm font-black text-white uppercase italic">Ready for Analysis</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-md">Trigger the AI to compile cross-game insights, strengths, weaknesses, and objective priorities.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 relative z-10"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-black/40 border border-red-500/20 rounded-xl p-5 hover:border-red-500/40 transition-colors">
                        <h4 className="text-red-400 font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4" /> Threat Levels
                        </h4>
                        <ul className="space-y-3">
                          {aiScoutingReport.threatLevels.map((t, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2 leading-tight">
                              <span className="text-red-500 mt-0.5">▪</span> {t}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-black/40 border border-blue-500/20 rounded-xl p-5 hover:border-blue-500/40 transition-colors">
                        <h4 className="text-blue-400 font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                          <Eye className="w-4 h-4" /> Weaknesses
                        </h4>
                        <ul className="space-y-3">
                          {aiScoutingReport.weaknesses.map((w, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2 leading-tight">
                              <span className="text-blue-500 mt-0.5">▪</span> {w}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-black/40 border border-brand-gold/20 rounded-xl p-5 hover:border-brand-gold/40 transition-colors">
                        <h4 className="text-brand-gold font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                          <Trophy className="w-4 h-4" /> Objective Priorities
                        </h4>
                        <ul className="space-y-3">
                          {aiScoutingReport.objectivePriorities.map((o, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2 leading-tight">
                              <span className="text-brand-gold mt-0.5">▪</span> {o}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                      <h4 className="text-gray-400 font-black uppercase text-xs tracking-widest mb-3">AI Refined Summary</h4>
                      <p className="text-sm text-brand-white leading-relaxed">{aiScoutingReport.summary}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Summary Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                icon={<Trophy className="w-6 h-6 text-brand-gold" />}
                label="Overall Win Rate"
                value={`${stats.winRate}%`}
                subValue={`${stats.totalMatches} Series Evaluated`}
                trend={stats.winRate >= 50 ? 'up' : 'down'}
              />
              <StatCard 
                icon={<Zap className="w-6 h-6 text-brand-gold" />}
                label="Avg Team KDA"
                value={stats.avgKda}
                subValue="Participation: 68%"
                trend="up"
              />
              <StatCard 
                icon={<Target className="w-6 h-6 text-brand-gold" />}
                label="Combat Rating"
                value="A+"
                subValue="Objective Control: High"
                trend="up"
              />
              <StatCard 
                icon={<TrendingUp className="w-6 h-6 text-brand-gold" />}
                label="Growth Index"
                value="+14%"
                subValue="Vs Previous Week"
                trend="up"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Performance and Insights (Side-by-Side) */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-brand-dark/40 border border-brand-gold/10 rounded-2xl p-8 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-brand-white italic font-display tracking-wide uppercase flex items-center gap-3">
                      <BarChart2 className="w-5 h-5 text-brand-gold" />
                      Performance Trends
                    </h3>
                  </div>
                  <div className="flex-1 min-h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={stats.timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                        <YAxis yAxisId="left" hide domain={[0, 100]} />
                        <YAxis yAxisId="right" orientation="right" hide domain={[0, 20]} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #a38f5833', borderRadius: '12px' }} />
                        <Area yAxisId="left" type="monotone" dataKey="winRate" stroke="#a38f58" fillOpacity={0.1} fill="#a38f58" strokeWidth={3} />
                        <Line yAxisId="right" type="monotone" dataKey="avgKda" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-brand-dark/40 border border-brand-gold/10 rounded-2xl p-8 flex flex-col h-full overflow-hidden flex-1">
                  <h3 className="text-xl font-black text-brand-white italic font-display tracking-wide uppercase mb-6 flex items-center gap-3">
                    <FileText className="w-5 h-5 text-brand-gold" />
                    IGL Reports & Insights
                  </h3>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-brand-gold/20">
                    {scoutingInsights.length > 0 ? scoutingInsights.map((insight, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-brand-gold/30 transition-all flex flex-col gap-3 group">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${insight.type === 'igl' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {insight.type.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold">{insight.date}</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed italic line-clamp-3 group-hover:line-clamp-none transition-all">{insight.content}</p>
                        <div className="mt-auto pt-3 border-t border-white/5 flex items-center gap-2 text-brand-gold/60">
                          <MessageSquare className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">{insight.source}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-10 text-gray-500 italic text-xs">
                        No consolidated insights found for current selection. Add IGL notes to populate this area.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Roster & Role Stats */}
              <div className="space-y-8">
                <div className="bg-brand-dark/40 border border-brand-gold/10 rounded-2xl p-8">
                  <h3 className="text-xl font-black text-brand-white italic font-display tracking-wide uppercase mb-6 flex items-center gap-3">
                    <Users className="w-5 h-5 text-brand-gold" />
                    ROSTER BASICS
                  </h3>
                  <div className="space-y-4">
                    {stats.performanceAnalytics.map((p) => (
                      <div key={p.gamertag} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between group hover:border-brand-gold/30 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-black flex items-center justify-center border border-brand-gold/20 shadow-inner group-hover:bg-brand-gold/5 transition-colors">
                            <span className="text-brand-gold font-black italic font-display text-xs">{p.role[0]}</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{p.role}</p>
                            <a 
                              href={`https://www.op.gg/summoners/na/${p.gamertag}-${p.tagLine?.replace('#', '')}`}
                              target="_blank" 
                              rel="noreferrer"
                              className="hover:underline hover:text-brand-gold transition-colors"
                            >
                              <p className="text-sm font-black text-brand-white italic font-display">{p.gamertag} <span className="text-gray-500 font-normal text-xs">#{p.tagLine}</span></p>
                            </a>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-brand-gold uppercase">{p.winRate}% WR</p>
                          <p className="text-[9px] text-gray-500 font-bold uppercase">{p.kda} KDA</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-brand-dark/40 border border-brand-gold/10 rounded-2xl p-8">
                  <h3 className="text-xl font-black text-brand-white italic font-display tracking-wide uppercase mb-6 flex items-center gap-3">
                    <Award className="w-5 h-5 text-brand-gold" />
                    CHAMPION MASTERY
                  </h3>
                  <div className="space-y-6">
                    {stats.playerPerformance.slice(0, 3).map((player) => (
                      <div key={player.gamertag} className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <a 
                            href={`https://www.op.gg/summoners/na/${player.gamertag}-${player.tagLine?.replace('#', '')}`}
                            target="_blank" 
                            rel="noreferrer"
                            className="hover:underline hover:text-brand-gold transition-colors"
                          >
                            <span className="text-[10px] font-black text-brand-white uppercase">{player.gamertag} <span className="text-gray-500 font-normal">#{player.tagLine}</span></span>
                          </a>
                          <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{player.role}</span>
                        </div>
                        <div className="flex gap-2">
                          {player.mainChampions.map(c => (
                            <div key={c.name} className="flex-1 bg-white/5 p-2 rounded-lg border border-white/5 group hover:border-brand-gold/30 transition-all relative">
                              <img 
                                src={getChampionIconUrl(c.name)} 
                                className="w-full aspect-square rounded object-cover mb-2" 
                                referrerPolicy="no-referrer"
                              />
                              <p className="text-[8px] font-black text-brand-gold text-center truncate">{c.winRate}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="comparison"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-black/60 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/10">
                    <th className="px-6 py-4">Player</th>
                    <th className="px-6 py-4 text-center">Games</th>
                    <th className="px-6 py-4 text-center text-brand-gold">Win Rate</th>
                    <th className="px-6 py-4 text-center">KDA</th>
                    <th className="px-6 py-4 text-center">CS / MIN</th>
                    <th className="px-6 py-4 text-center">Vision / GM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {comparisonStats.map((p) => (
                    <tr key={p.gamertag} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20">
                            <span className="text-[10px] font-black text-brand-gold">{p.role[0]}</span>
                          </div>
                          <div>
                            <a 
                              href={`https://www.op.gg/summoners/na/${p.gamertag}-${p.tagLine?.replace('#', '')}`}
                              target="_blank" 
                              rel="noreferrer"
                              className="hover:underline hover:text-brand-gold transition-colors"
                            >
                              <p className="text-xs font-black text-white italic">{p.gamertag} <span className="text-gray-500 font-normal">#{p.tagLine}</span></p>
                            </a>
                            <p className="text-[8px] text-gray-500 uppercase">{p.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-gray-400 text-xs">{p.games}</td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-brand-gold font-black text-xs italic">{p.winRate}%</span>
                          <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-gold" style={{ width: `${p.winRate}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`text-xs font-bold ${parseFloat(p.kda) > 3 ? 'text-brand-green' : 'text-gray-400'}`}>{p.kda}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-xs font-bold text-blue-400">{p.csPerMin}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-xs font-bold text-purple-400">{p.avgVision}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Comparison Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-8">Damage vs Gold Efficiency</h4>
                <div className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonStats.slice(0, 5)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="gamertag" stroke="#ffffff40" fontSize={10} />
                        <YAxis stroke="#ffffff40" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #a38f5833', borderRadius: '12px' }} />
                        <Bar dataKey="csPerMinRaw" fill="#a38f58" radius={[4, 4, 0, 0]} name="CS Efficiency" />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-8">KDA Distribution</h4>
                <div className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={comparisonStats.slice(0, 5)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="gamertag" stroke="#ffffff40" fontSize={10} />
                        <YAxis stroke="#ffffff40" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #a38f5833', borderRadius: '12px' }} />
                        <Line type="monotone" dataKey="kdaRaw" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981' }} name="KDA" />
                      </LineChart>
                   </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  trend: 'up' | 'down';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subValue, trend }) => (
  <motion.div 
    whileHover={{ y: -4, scale: 1.02 }}
    className="bg-brand-dark/40 border border-brand-gold/10 rounded-2xl p-5 group flex flex-col justify-between"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 rounded-lg bg-brand-gold/5 border border-brand-gold/20">
        {icon}
      </div>
      <div className={`px-2 py-0.5 rounded text-[10px] font-black italic font-display ${
        trend === 'up' ? 'bg-slate-400/10 text-slate-400' : 'bg-red-500/10 text-red-500/80'
      }`}>
        {trend === 'up' ? 'CONSISTENT' : 'VOLATILE'}
      </div>
    </div>
    <div>
      <p className="text-xs font-black text-brand-gold tracking-widest uppercase mb-1">{label}</p>
      <p className="text-3xl font-black text-brand-white italic font-display leading-tight">{value}</p>
      <p className="text-[10px] font-black text-gray-500 uppercase mt-2">{subValue}</p>
    </div>
  </motion.div>
);

