import React, { useMemo, useState, useEffect } from 'react';
import { 
  Trophy, 
  Award, 
  ChevronRight, 
  Calendar, 
  Shield, 
  Info,
  AlertTriangle,
  List,
  Target,
  Search,
  Users,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useFilters } from '../context/FilterContext';
import { ScoutingReport, ScheduleEntry } from '../types';
import { SchoolBadge } from './SchoolBadge';

interface TeamStats {
  name: string;
  level: string;
  wins: number;
  losses: number;
  mapsWon: number;
  mapsLost: number;
  forfeits: number;
  points: number; // Placeholder if needed
  h2h: Record<string, number>; // H2H match wins against other teams
  region: string;
  groupNumber: number;
}

import { fetchRostersFromWebApp } from '../services/sheetService';

export function StandingsView({ 
  reports, 
  brandings,
  schedules = [],
  onTeamSelect
}: { 
  reports: ScoutingReport[], 
  brandings?: Record<string, any>,
  schedules?: ScheduleEntry[],
  onTeamSelect?: (schoolName: string) => void
}) {
  const { filters } = useFilters();
  const [standingsTab, setStandingsTab] = useState<'overall' | 'groups'>('overall');
  const [activeTab, setActiveTab] = useState<'varsity' | 'jv' | 'schedules'>('varsity');
  const [activeGroup, setActiveGroup] = useState<'All' | '1' | '2' | '3' | '4' | string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [teamGroups, setTeamGroups] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadTeamGroups() {
      const data = await fetchRostersFromWebApp();
      const groupsMap: Record<string, string> = {};
      data.forEach(item => {
        if (item.group) {
          groupsMap[item.school] = String(item.group);
        }
      });
      setTeamGroups(groupsMap);
    }
    loadTeamGroups();
  }, []);

  // Sync activeTab with global level filter if changed
  useEffect(() => {
    if (filters?.level === 'Varsity') setActiveTab('varsity');
    else if (filters?.level === 'JV') setActiveTab('jv');
  }, [filters?.level]);

  const deduplicatedReports = useMemo(() => {
    const seen = new Set<string>();
    return reports.filter(r => {
      // Apply level filter if not on specific tab
      if (standingsTab === 'overall' && filters?.level !== 'All' && r.level !== filters?.level) return false;

      // Only count reports with actual games results for standings
      if (r.games.length === 0 && !r.isForfeited) return false;
      const dateStr = r.date;
      const teams = [r.team, r.opponent].sort();
      const key = `${dateStr}-${teams[0]}-${teams[1]}-${r.level}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [reports, filters?.level, activeTab]);

  const standingsData = useMemo(() => {
    const teamsData: Record<string, TeamStats & { region?: string }> = {};

    const getOrCreateTeam = (name: string, level: string) => {
      const key = `${name}-${level}`;
      if (!teamsData[key]) {
        // Fallback group number
        const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const fallbackGroup = String((charCodeSum % 4) + 1);
        const groupNumber = parseInt(teamGroups[name] || fallbackGroup) || 1;

        teamsData[key] = {
          name,
          level,
          wins: 0,
          losses: 0,
          mapsWon: 0,
          mapsLost: 0,
          forfeits: 0,
          points: 0,
          h2h: {},
          region: teamGroups[name] || fallbackGroup,
          groupNumber
        };
      }
      return teamsData[key];
    };

    deduplicatedReports.forEach(r => {
      const team1 = getOrCreateTeam(r.team, r.level);
      const team2 = getOrCreateTeam(r.opponent, r.level);

      if (r.isForfeited) {
        const forfeiter = r.forfeitedBy === r.team ? team1 : team2;
        const winner = r.forfeitedBy === r.team ? team2 : team1;
        
        forfeiter.forfeits++;
        forfeiter.losses++;
        winner.wins++;
        
        // H2H
        winner.h2h[forfeiter.name] = (winner.h2h[forfeiter.name] || 0) + 1;
        return;
      }

      const matchWon = r.matchResult === 'Win'; // Assuming reporter's team is r.team
      if (matchWon) {
        team1.wins++;
        team2.losses++;
        team1.h2h[team2.name] = (team1.h2h[team2.name] || 0) + 1;
      } else {
        team1.losses++;
        team2.wins++;
        team2.h2h[team1.name] = (team2.h2h[team1.name] || 0) + 1;
      }

      // Map Scores
      const score1 = parseInt(r.matchScore) || 0;
      const score2 = parseInt(r.opponentMatchScore) || 0;
      
      team1.mapsWon += score1;
      team1.mapsLost += score2;
      team2.mapsWon += score2;
      team2.mapsLost += score1;
    });

    return Object.values(teamsData);
  }, [deduplicatedReports, teamGroups]);

  const sortTeams = (teams: any[]) => {
    return [...teams].sort((a, b) => {
      // 1. Overall Record (Wins)
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;

      // 2. Head-to-Head Results
      const aVsB = a.h2h[b.name] || 0;
      const bVsA = b.h2h[a.name] || 0;
      if (aVsB !== bVsA) return bVsA - aVsB;

      // 3. Game Win-Loss Differential (Maps)
      const aDiff = a.mapsWon - a.mapsLost;
      const bDiff = b.mapsWon - b.mapsLost;
      return bDiff - aDiff;
    });
  };

  const filteredStandings = useMemo(() => {
    let base = standingsData;
    if (activeTab === 'varsity') base = base.filter(t => t.level === 'Varsity');
    if (activeTab === 'jv') base = base.filter(t => t.level === 'JV');
    
    if (standingsTab === 'groups' && activeGroup !== 'All') {
      base = base.filter(t => t.region === activeGroup);
    }
    
    let sorted = sortTeams(base);

    if (standingsTab === 'groups' && activeGroup === 'All') {
      sorted = [...sorted].sort((a, b) => a.region.localeCompare(b.region) || (b.wins - a.wins));
    }

    if (searchTerm) {
      sorted = sorted.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return sorted;
  }, [standingsData, activeTab, standingsTab, searchTerm, activeGroup]);

  const upcomingMatches = useMemo(() => {
    // Determine target teams based on active tab or global filter
    const targetLevel = activeTab === 'varsity' ? 'Varsity' : activeTab === 'jv' ? 'JV' : (filters?.level !== 'All' ? filters?.level : null);
    
    // Use dynamic schedules if available
    let dynamicSchedules = schedules;
    const isPublic = import.meta.env.VITE_APP_MODE === 'public';
    
    if (isPublic) {
      dynamicSchedules = dynamicSchedules.filter(m => m.team === 'Basha' || (m.opponent && m.opponent === 'Basha'));
    }

    if (dynamicSchedules.length > 0) {
      if (targetLevel) {
        dynamicSchedules = dynamicSchedules.filter(m => m.level === targetLevel);
      }
      if (searchTerm) {
        dynamicSchedules = dynamicSchedules.filter(m => m.opponent.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return dynamicSchedules;
    }
    
    // Suggest upcoming matches based on existing teams
    const schoolList = Array.from(new Set(reports.map(r => r.team))).filter(s => s !== 'Basha');
    
    const baseSchedule = [
      { date: '2026-04-20', time: '4:30 PM', team1: 'Basha', team2: schoolList[0] || 'Hamilton', level: 'Varsity' },
      { date: '2026-04-22', time: '5:00 PM', team1: 'Basha', team2: schoolList[1] || 'ACP', level: 'Varsity' },
      { date: '2026-04-24', time: '4:30 PM', team1: 'Basha', team2: schoolList[2] || 'Perry', level: 'JV' },
      { date: '2026-04-27', time: '5:00 PM', team1: 'Basha', team2: schoolList[3] || 'Casteel', level: 'Varsity' },
    ];

    let matches = baseSchedule.filter(m => !targetLevel || m.level === targetLevel);
    
    if (searchTerm) {
      matches = matches.filter(m => m.team2.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Return the matches maintaining the opponent string key.
    return matches.map(m => ({...m, opponent: m.team2}));
  }, [reports, activeTab, filters?.level, searchTerm, schedules]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-brand-white uppercase italic tracking-tighter italic font-display">
            League Standings
          </h2>
          <p className="text-slate-300 text-sm font-medium tracking-wide">
            Official AIA Rankings & Schedule tracking for the current season.
          </p>
        </div>

        <div className="flex flex-col gap-4 items-end">
          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
            {(['overall', 'groups'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStandingsTab(tab)}
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  standingsTab === tab 
                    ? 'bg-brand-gold text-brand-green shadow-lg shadow-brand-gold/10' 
                    : 'text-gray-600 hover:text-brand-gold'
                }`}
              >
                {tab === 'overall' ? 'Overall Rankings' : 'Group Standings'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
            {(['varsity', 'jv', 'schedules'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30' 
                    : 'text-gray-600 hover:text-brand-gold'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
        {standingsTab === 'groups' && (
          <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-xl shrink-0">
            {(['All', 'East', 'West', 'North', 'South'] as const).map(region => (
              <button
                key={region}
                onClick={() => setActiveGroup(region)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeGroup === region 
                    ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30' 
                    : 'text-gray-600 hover:text-brand-white'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'schedules' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingMatches.length > 0 ? upcomingMatches.map((match, i) => {
            const isNextMatch = i === 0;
            return (
              <div key={i} className={`border rounded-2xl p-6 space-y-4 transition-all group ${
                isNextMatch ? 'md:col-span-2 lg:col-span-3 bg-gradient-to-br from-brand-gold/20 to-transparent border-brand-gold shadow-[0_0_30px_rgba(163,143,88,0.15)] scale-[1.01]' : 'bg-white/5 border-brand-gold/10 hover:border-brand-gold/30'
              }`}>
                <div className="flex items-center justify-between">
                  {isNextMatch ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-brand-gold text-brand-green text-[10px] font-black uppercase tracking-[0.2em] rounded-md">
                      <Zap className="w-3 h-3" /> Next Match
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">
                      <Calendar className="w-3 h-3" /> {match.date}
                    </div>
                  )}
                  <span className={`px-2 py-0.5 text-[8px] font-black rounded border uppercase tracking-widest ${
                    isNextMatch ? 'bg-brand-gold text-brand-green border-brand-gold' : 'bg-brand-gold/10 text-brand-gold border-brand-gold/20'
                  }`}>
                    {match.level}
                  </span>
                </div>
                
                {isNextMatch && (
                  <div className="text-center pb-2 mb-2 border-b border-white/10">
                    <p className="text-brand-gold text-[10px] font-black tracking-[0.3em] uppercase">{match.date}</p>
                    <p className="text-gray-400 text-[10px] font-bold tracking-widest">{match.time}</p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className={`rounded-full flex items-center justify-center border overflow-hidden ${
                      isNextMatch ? 'w-20 h-20 bg-white/10 border-brand-gold' : 'w-12 h-12 bg-white/5 border-white/10'
                    }`}>
                      <SchoolBadge schoolName="Basha" brandings={brandings} hideName size={isNextMatch ? "lg" : "sm"} />
                    </div>
                    <p className={`${isNextMatch ? 'text-lg text-brand-gold' : 'text-xs text-brand-white'} font-black uppercase truncate w-full text-center`}>Basha</p>
                  </div>
                  <div className="text-[10px] font-black text-gray-600 italic">VS</div>
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className={`rounded-full flex items-center justify-center border overflow-hidden ${
                      isNextMatch ? 'w-20 h-20 bg-black border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'w-12 h-12 bg-white/5 border-white/10'
                    }`}>
                      <SchoolBadge schoolName={match.opponent} brandings={brandings} hideName size={isNextMatch ? "lg" : "sm"} />
                    </div>
                    <p className={`${isNextMatch ? 'text-lg text-red-500' : 'text-xs text-brand-white'} font-black uppercase truncate w-full text-center`}>{match.opponent}</p>
                  </div>
                </div>
                
                {!isNextMatch && (
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Info className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{match.time}</span>
                    </div>
                    <div className="text-[10px] font-black text-brand-gold uppercase tracking-widest">
                      {match.result || 'UPCOMING'}
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="col-span-full py-20 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-bold">No upcoming matches scheduled for this level.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-brand-black/40 border border-brand-gold/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-brand-black/80 border-b border-brand-gold/20 text-left">
                  <th className="px-6 py-5 text-[10px] font-black text-brand-gold/60 uppercase tracking-widest">Rank</th>
                  <th className="px-6 py-5 text-[10px] font-black text-brand-gold/60 uppercase tracking-widest">School</th>
                  <th className="px-6 py-5 text-[10px] font-black text-brand-gold/60 uppercase tracking-widest text-center">Record</th>
                  <th className="px-6 py-5 text-[10px] font-black text-brand-gold/60 uppercase tracking-widest text-center">Game Diff</th>
                  <th className="px-6 py-5 text-[10px] font-black text-brand-gold/60 uppercase tracking-widest text-center">Win %</th>
                  <th className="px-6 py-5 text-[10px] font-black text-brand-gold/60 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gold/10">
                {filteredStandings.map((team, idx) => {
                  const isDisqualified = team.forfeits >= 2;
                  const showRegionHeader = standingsTab === 'groups' && activeGroup === 'All' && (idx === 0 || filteredStandings[idx-1].region !== team.region);
                  const isGreenRow = idx % 2 === 0;

                  return (
                    <React.Fragment key={`${team.name}-${team.level}`}>
                      {showRegionHeader && (
                        <tr className="bg-brand-gold/5">
                          <td colSpan={6} className="px-6 py-2 border-y border-brand-gold/10">
                            <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] font-display italic">
                              Group {team.region}
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr 
                        onClick={() => onTeamSelect && onTeamSelect(team.name)}
                        className={`group transition-colors ${onTeamSelect ? 'cursor-pointer hover:opacity-80' : ''} ${
                        isGreenRow 
                          ? 'bg-brand-green text-brand-gold' 
                          : 'bg-brand-gold text-brand-green'
                      }`}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black italic font-display ${
                            isGreenRow ? 'bg-brand-gold text-brand-green' : 'bg-brand-green text-brand-gold'
                          }`}>
                            {idx + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3">
                            <SchoolBadge 
                              schoolName={team.name} 
                              brandings={brandings} 
                              className="text-lg" 
                              textClassName={`font-black uppercase italic font-display ${isGreenRow ? 'text-brand-gold' : 'text-brand-green'}`} 
                            />
                            <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black ${
                              isGreenRow ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30' : 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                            }`}>
                              {team.level}
                            </span>
                          </div>
                          {isDisqualified && (
                            <div className="flex items-center gap-1 mt-1 text-[#7a1a1a]">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="text-[8px] font-black uppercase tracking-tighter">Disqualified from Playoffs</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-sm font-black italic">{team.wins}W - {team.losses}L</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`text-sm font-black italic ${
                          team.mapsWon - team.mapsLost >= 0 
                            ? 'text-[#2d5a3c]' 
                            : 'text-[#7a1a1a]'
                        }`}>
                          {team.mapsWon - team.mapsLost > 0 ? '+' : ''}{team.mapsWon - team.mapsLost}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="space-y-1 ml-auto mr-auto w-24">
                          <div className={`flex justify-between text-[8px] font-black uppercase ${isGreenRow ? 'text-brand-gold/60' : 'text-brand-green/60'}`}>
                            <span>Winrate</span>
                            <span>{Math.round((team.wins / Math.max(1, team.wins + team.losses)) * 100)}%</span>
                          </div>
                          <div className={`h-1.5 w-full rounded-full overflow-hidden p-[1px] border ${isGreenRow ? 'bg-white/5 border-white/10' : 'bg-brand-black/5 border-brand-black/10'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${isGreenRow ? 'bg-brand-gold' : 'bg-brand-green'}`}
                              style={{ width: `${(team.wins / Math.max(1, team.wins + team.losses)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isDisqualified ? 'bg-[#7a1a1a] animate-pulse' : (isGreenRow ? 'bg-brand-gold' : 'bg-brand-green')}`} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-inherit opacity-80">
                            {isDisqualified ? 'DQ' : `Group ${/^[A-Z]$/i.test(String(team.groupNumber)) ? (String(team.groupNumber).toUpperCase().charCodeAt(0) - 64) : team.groupNumber}`}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-brand-gold/5 border border-brand-gold/20 p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 opacity-5 rotate-12">
          <Trophy className="w-64 h-64 text-brand-gold" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-4">
          <h4 className="text-sm font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
            <Award className="w-4 h-4" /> AIA Official Tiebreaker Rules
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Overall Record</p>
              <p className="text-[10px] text-slate-300 leading-relaxed italic">Ranked primarily by direct match wins and losses for the season.</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Head-to-Head</p>
              <p className="text-[10px] text-slate-300 leading-relaxed italic">If wins are tied, the resulting winner of the series played between teams takes priority.</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Game Differential</p>
              <p className="text-[10px] text-slate-300 leading-relaxed italic">Final fallback uses the net game score (Maps Won - Maps Lost) across all series.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
