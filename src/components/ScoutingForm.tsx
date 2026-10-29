import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  ExternalLink, 
  Sword, 
  Shield, 
  Zap, 
  Eye, 
  Target,
  Clock,
  Save,
  Plus,
  ChevronRight,
  ChevronLeft,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchChampions, fetchItems, fetchSummoners, fetchRunes, DDragonChampion, DDragonItem, DDragonSummoner, DDragonRune } from '../services/ddragonService';
import { saveMatchToFirestore } from '../services/firebaseService';
import { submitReport, fetchRostersFromWebApp } from '../services/sheetService';
import { Role, PlayerStats, GameReport, ScoutingReport, Season } from '../types';
import { SEASONS } from '../constants';

import { Autocomplete } from './Autocomplete';
import { ScoreboardScanner } from './ScoreboardScanner';
import { SCHOOLS, VARSITY_ROSTER } from '../data/schoolsAndRoster';

interface ScoutingFormProps {
  onSave: (report: ScoutingReport) => void;
  onCancel: () => void;
  brandings?: Record<string, any>;
  currentUserEmail?: string;
  initialData?: ScoutingReport;
}

const ROLES: Role[] = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

export function ScoutingForm({ onSave, onCancel, brandings = {}, currentUserEmail, initialData }: ScoutingFormProps) {
  const [step, setStep] = useState(1);
  const [activeGame, setActiveGame] = useState(0);
  
  // Basic Info
  const [basicInfo, setBasicInfo] = useState({
    scouterName: initialData?.scouterName || '',
    team: initialData?.team || '',
    opponent: initialData?.opponent || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    week: initialData?.week || '1',
    season: initialData?.season || 'Spring' as Season,
    year: initialData?.year || new Date().getFullYear().toString(),
    level: initialData?.level || 'Varsity',
    matchResult: initialData?.matchResult || 'Win' as 'Win' | 'Loss',
    matchScore: initialData?.matchScore || '2',
    opponentMatchScore: initialData?.opponentMatchScore || '0',
    patchNumber: initialData?.patchNumber || '',
    vod: (initialData as any)?.vod || '',
    opgg: (initialData as any)?.opgg || ''
  });

  // Data Dragon Data
  const [champions, setChampions] = useState<DDragonChampion[]>([]);
  const [items, setItems] = useState<DDragonItem[]>([]);
  const [summoners, setSummoners] = useState<DDragonSummoner[]>([]);
  const [runes, setRunes] = useState<DDragonRune[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [rosters, setRosters] = useState<{school: string, roster: string[]}[]>([]);

  // Game States
  const createEmptyPlayerStats = (role: Role): PlayerStats => ({
    role,
    gamertag: '',
    tagLine: '',
    trackerLink: '',
    peakRank: '',
    currentRank: '',
    champion: '',
    primaryRune: '',
    secondaryRune: '',
    kills: 0,
    deaths: 0,
    assists: 0,
    cs: 0,
    gold: 0,
    damage: 0,
    visionScore: 0,
    summoners: ['', ''],
    items: ['', '', '', '', '', '', ''],
    playstyle: 'Aggressive'
  });

  const createEmptyGame = (num: number): GameReport => ({
    gameNumber: num,
    result: 'Win',
    time: '30:00',
    vod: '',
    screenshot: '',
    players: ROLES.reduce((acc, role) => {
      acc[role] = createEmptyPlayerStats(role);
      return acc;
    }, {} as Record<Role, PlayerStats>)
  });

  const [games, setGames] = useState<GameReport[]>(initialData?.games?.length ? initialData.games : [createEmptyGame(1), createEmptyGame(2), createEmptyGame(3)]);

  useEffect(() => {
    async function initData() {
      const [champs, its, summs, rns, fetchedRosters] = await Promise.all([
        fetchChampions(),
        fetchItems(),
        fetchSummoners(),
        fetchRunes(),
        fetchRostersFromWebApp()
      ]);
      setChampions(champs);
      setItems(its);
      setSummoners(summs);
      setRunes(rns);
      setRosters(fetchedRosters);
      setLoadingData(false);
    }
    initData();
  }, []);

  // Autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ type: 'champ' | 'item' | 'summ', data: any[] }>({ type: 'champ', data: [] });
  const [activeSearchField, setActiveSearchField] = useState<{ gameIdx: number, role: Role, field: string, slot?: number } | null>(null);

  const getRosterForTeam = (teamName: string) => {
    return rosters.find(r => r.school === teamName)?.roster || [];
  };

  const getRosterByRole = (teamName: string, role: Role) => {
    // Since our fetched rosters don't distinguish by role, return the full roster
    return getRosterForTeam(teamName);
  };

  const handlePlayerUpdate = (gameIdx: number, role: Role, updates: Partial<PlayerStats>) => {
    setGames(prev => {
      const newGames = [...prev];
      newGames[gameIdx].players[role] = { ...newGames[gameIdx].players[role], ...updates };
      return newGames;
    });
  };

  const calculateKDA = (k: number, d: number, a: number) => {
    const ratio = (k + a) / Math.max(1, d);
    return ratio.toFixed(2);
  };

  const validateForm = () => {
    if (!basicInfo.team || !basicInfo.opponent || !basicInfo.scouterName) return false;
    
    // Check if each game has essential player data
    for (const game of games) {
      for (const role of ROLES) {
        if (!game.players[role].gamertag || !game.players[role].champion) return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('Please fill in all required fields (Team, Opponent, Player Names, and Champions).');
      return;
    }

    const totalStats = {
      kills: 0,
      deaths: 0,
      assists: 0,
      visionScore: 0,
      gold: 0,
      damage: 0,
      cs: 0,
    };
    
    let gameWins = 0;
    let actualGames = 0;

    games.forEach(g => {
      // Only count games that have players (to handle potential empty game 3)
      const hasPlayers = (Object.values(g.players) as PlayerStats[]).some(p => p.gamertag);
      if (!hasPlayers) return;

      actualGames++;
      if (g.result === 'Win') gameWins++;
      
      (Object.values(g.players) as PlayerStats[]).forEach(p => {
        totalStats.kills += p.kills;
        totalStats.deaths += p.deaths;
        totalStats.assists += p.assists;
        totalStats.visionScore += p.visionScore;
        totalStats.gold += p.gold;
        totalStats.damage += p.damage;
        totalStats.cs += p.cs;
      });
    });

    const playerCount = actualGames * 5;
    const report: ScoutingReport = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      submittedBy: currentUserEmail,
      ...basicInfo,
      games: games.filter(g => (Object.values(g.players) as PlayerStats[]).some(p => p.gamertag)),
      matchResult: basicInfo.matchResult,
      summary: {
        totalKills: totalStats.kills,
        totalDeaths: totalStats.deaths,
        totalAssists: totalStats.assists,
        avgVisionScore: playerCount > 0 ? totalStats.visionScore / playerCount : 0,
        avgGold: playerCount > 0 ? totalStats.gold / playerCount : 0,
        avgDamage: playerCount > 0 ? totalStats.damage / playerCount : 0,
        avgCS: playerCount > 0 ? totalStats.cs / playerCount : 0,
        gameWinRate: actualGames > 0 ? (gameWins / actualGames) * 100 : 0
      }
    };

    try {
      // Save to local storage mock first
      await saveMatchToFirestore(report);
      
      // Also push to Google Sheets if configured
      await submitReport(report);
      
      onSave(report);
    } catch (error) {
      console.error('Submission error:', error);
      alert('Match saved locally. Cloud sync (Sheet/Firebase) may have failed.');
      onSave(report);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-brand-white uppercase tracking-tighter flex items-center gap-3">
            <Sword className="text-brand-gold w-8 h-8" />
            Stats Report
          </h2>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">Live Match Documentation & Analysis</p>
        </div>
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-white border border-white/10 uppercase font-black text-[10px] tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Progress Bar */}
        <div className="flex gap-2 h-1 mb-12">
          <div className={`flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-brand-gold' : 'bg-white/10'}`} />
          <div className={`flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-brand-gold' : 'bg-white/10'}`} />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Basic Info Card */}
              <div className="lg:col-span-2 bg-white/5 border border-brand-gold/10 rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] mb-4">
                  <Calendar className="w-3 h-3" /> Step 01: Match Logistics
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Reporter</label>
                    <select 
                      value={basicInfo.scouterName}
                      onChange={(e) => setBasicInfo({ ...basicInfo, scouterName: e.target.value })}
                      className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm font-black text-brand-gold focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">Select Scouter...</option>
                      {VARSITY_ROSTER.map(r => (
                        <option key={r.name} value={r.name}>{r.name} ({r.gamertag})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Match Date</label>
                    <input
                      type="date"
                      value={basicInfo.date}
                      onChange={(e) => setBasicInfo({ ...basicInfo, date: e.target.value })}
                      className="w-full bg-black border border-brand-gold rounded-full px-6 py-1 text-sm font-black text-brand-gold text-center focus:outline-none transition-all cursor-pointer"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Home Team</label>
                    <select 
                      value={basicInfo.team}
                      onChange={(e) => setBasicInfo({ ...basicInfo, team: e.target.value })}
                      className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm font-black text-brand-gold focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">Select a Team...</option>
                      <option value="Non-AIA">Non-AIA (Sandbox)</option>
                      {rosters.length > 0 
                        ? rosters.filter(r => r.school !== 'Non-AIA').map(r => <option key={r.school} value={r.school}>{r.school}</option>)
                        : SCHOOLS.filter(s => s !== 'Non-AIA').map(s => <option key={s} value={s}>{s}</option>)
                      }
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Away Team (Opponent)</label>
                    <select 
                      value={basicInfo.opponent}
                      onChange={(e) => setBasicInfo({ ...basicInfo, opponent: e.target.value })}
                      className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm font-black text-brand-gold focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">Select Opposing Team...</option>
                      <option value="Non-AIA">Non-AIA (Sandbox)</option>
                      {rosters.length > 0 
                        ? rosters.filter(r => r.school !== 'Non-AIA').map(r => <option key={r.school} value={r.school}>{r.school}</option>)
                        : SCHOOLS.filter(s => s !== 'Non-AIA').map(s => <option key={s} value={s}>{s}</option>)
                      }
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Week Number</label>
                    <select 
                      value={basicInfo.week}
                      onChange={(e) => setBasicInfo({ ...basicInfo, week: e.target.value })}
                      className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm font-black text-brand-gold focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">Select Week...</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(w => (
                        <option key={w} value={w.toString()}>Week {w}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Season</label>
                    <select 
                      value={basicInfo.season}
                      onChange={(e) => setBasicInfo({ ...basicInfo, season: e.target.value as Season })}
                      className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm font-black text-brand-gold focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">Select Season...</option>
                      {SEASONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Year</label>
                    <select 
                      value={basicInfo.year}
                      onChange={(e) => setBasicInfo({ ...basicInfo, year: e.target.value })}
                      className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm font-black text-brand-gold focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">Select Year...</option>
                      {['2023', '2024', '2025', '2026'].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Patch Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 14.8"
                      value={basicInfo.patchNumber}
                      onChange={(e) => setBasicInfo({ ...basicInfo, patchNumber: e.target.value })}
                      className="w-full bg-black border border-brand-gold rounded-full px-6 py-1 text-sm font-black text-brand-gold text-center focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Competition Level</label>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                      {['Varsity', 'JV', 'Non-AIA'].map(l => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setBasicInfo({ ...basicInfo, level: l })}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${basicInfo.level === l ? 'bg-brand-gold text-brand-green' : 'text-gray-500'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary / Links Card */}
              <div className="bg-brand-black/40 border border-brand-gold/10 rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] mb-4">
                  <ExternalLink className="w-3 h-3" /> Scouting Links
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">VOD Link</label>
                    <input
                      type="url"
                      value={basicInfo.vod}
                      onChange={(e) => setBasicInfo({ ...basicInfo, vod: e.target.value })}
                      placeholder="https://youtube.com/..."
                      className="w-full bg-black border border-brand-gold rounded-full px-6 py-1 text-sm font-black text-brand-gold text-center focus:outline-none transition-all placeholder:text-brand-gold/30 uppercase tracking-widest"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Match OP.GG</label>
                    <input
                      type="url"
                      value={basicInfo.opgg}
                      onChange={(e) => setBasicInfo({ ...basicInfo, opgg: e.target.value })}
                      placeholder="https://op.gg/multisearch/..."
                      className="w-full bg-black border border-brand-gold rounded-full px-6 py-1 text-sm font-black text-brand-gold text-center focus:outline-none transition-all placeholder:text-brand-gold/30 uppercase tracking-widest"
                    />
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!basicInfo.team || !basicInfo.opponent}
                    className="w-full py-4 bg-brand-gold disabled:opacity-30 disabled:cursor-not-allowed text-brand-green font-black uppercase text-xs tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-brand-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Enter Player Stats <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Game Tabs for BO3 */}
              <ScoreboardScanner onDataExtract={(data) => {
                  data.players.forEach((p: any) => {
                    const roleMapping: Record<string, Role> = {
                      'Top': 'Top', 'Jungle': 'Jungle', 'Mid': 'Mid', 'ADC': 'ADC', 'Support': 'Support'
                    };
                    // Simplified mapping logic for demo
                    const role = p.role || ROLES[0];
                    handlePlayerUpdate(activeGame, role, {
                      gamertag: p.name,
                      champion: p.champion,
                      kills: p.kills,
                      deaths: p.deaths,
                      assists: p.assists,
                      cs: p.cs,
                      gold: p.gold
                    });
                  });
              }} />
              <div className="flex items-center justify-between">
                <div className="flex bg-white/5 p-1 rounded-xl border border-brand-gold/10">
                  {games.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveGame(idx)}
                      className={`px-8 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeGame === idx ? 'bg-brand-gold text-brand-green' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Game {idx + 1}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        const newGames = [...games];
                        newGames[activeGame].result = 'Win';
                        setGames(newGames);
                      }}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${games[activeGame].result === 'Win' ? 'bg-emerald-500 text-brand-white' : 'text-gray-500'}`}
                    >
                      Victory
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newGames = [...games];
                        newGames[activeGame].result = 'Loss';
                        setGames(newGames);
                      }}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${games[activeGame].result === 'Loss' ? 'bg-rose-500 text-brand-white' : 'text-gray-500'}`}
                    >
                      Defeat
                    </button>
                  </div>
                    <input 
                      type="text"
                      value={games[activeGame].time}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 4) val = val.substring(0, 4);
                        if (val.length > 2) {
                          val = val.substring(0, 2) + ':' + val.substring(2);
                        }
                        const newGames = [...games];
                        newGames[activeGame].time = val;
                        setGames(newGames);
                      }}
                      placeholder="MM:SS"
                      className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-black text-center text-brand-gold outline-none"
                    />
                </div>
              </div>

              {/* Player Grid */}
              <div className="space-y-4">
                {ROLES.map(role => (
                  <PlayerInput 
                    key={role}
                    role={role}
                    stats={games[activeGame].players[role]}
                    update={(updates) => handlePlayerUpdate(activeGame, role, updates)}
                    champions={champions}
                    items={items}
                    summoners={summoners}
                    runes={runes}
                    Autocomplete={Autocomplete}
                    playerSuggestions={getRosterByRole(basicInfo.team, role)}
                    loadingData={loadingData}
                  />
                ))}
              </div>

              {/* Final Actions */}
              <div className="flex justify-between items-center pt-8">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-xs font-black text-gray-500 hover:text-white transition-colors border-b border-transparent hover:border-white uppercase tracking-widest"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Match Info
                </button>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="px-10 py-4 bg-brand-gold text-brand-green font-black uppercase text-xs tracking-[0.2em] rounded-xl flex items-center justify-center gap-3 shadow-xl shadow-brand-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Save className="w-4 h-4" /> Save Match Report
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}

function PlayerInput({ 
  role, 
  stats, 
  update, 
  champions, 
  items, 
  summoners,
  runes,
  Autocomplete,
  playerSuggestions = [],
  loadingData
}: { 
  role: Role, 
  stats: PlayerStats, 
  update: (updates: Partial<PlayerStats>) => void,
  champions: DDragonChampion[],
  items: DDragonItem[],
  summoners: DDragonSummoner[],
  runes: DDragonRune[],
  Autocomplete: any,
  playerSuggestions?: string[],
  loadingData: boolean,
  key?: React.Key
}) {
  const [showBuild, setShowBuild] = useState(true);
  
  const calculateKDA = (k: number, d: number, a: number) => {
    const ratio = (k + a) / Math.max(1, d);
    return ratio.toFixed(2);
  };

  return (
    <div className="bg-brand-black/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-brand-gold/20">
      <div className="p-4 flex flex-col xl:flex-row gap-6">
        {/* Role & Basic */}
        <div className="flex items-center gap-4 w-full xl:w-72">
          <div className="flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/5 w-16 h-16 shrink-0">
            <RoleIcon role={role} />
            <span className="text-[10px] font-black text-gray-500 mt-1 uppercase tracking-tighter">{role}</span>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="flex-[2]">
                <Autocomplete
                  type="player"
                  value={stats.gamertag}
                  onChange={(val: string) => update({ gamertag: val })}
                  champions={champions}
                  items={items}
                  summoners={summoners}
                  runes={runes}
                  suggestions={playerSuggestions}
                  loading={loadingData}
                />
              </div>
              <div className="flex-1 min-w-[60px]">
                <input 
                  type="text" 
                  value={stats.tagLine || ''} 
                  onChange={(e) => update({ tagLine: e.target.value })} 
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-gold transition-colors placeholder:text-gray-600"
                  placeholder="#NA1"
                />
              </div>
            </div>
            <Autocomplete 
              type="champ" 
              value={stats.champion} 
              onChange={(val: string) => update({ champion: val })} 
              champions={champions}
              items={items}
              summoners={summoners}
              runes={runes}
              loading={loadingData}
            />
          </div>
        </div>

        {/* Combat Stats */}
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
              <span>K / D / A</span>
              <span className="text-brand-gold font-black">{calculateKDA(stats.kills, stats.deaths, stats.assists)} KDA</span>
            </div>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={stats.kills || (stats.kills === 0 ? 0 : '')} 
                  onChange={(e) => update({ kills: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  className="w-full bg-black border border-brand-gold rounded-full px-2 py-1 text-sm text-center font-black text-brand-gold outline-none focus:bg-white/5 transition-colors"
                  placeholder="0"
                />
                <input 
                  type="number" 
                  value={stats.deaths || (stats.deaths === 0 ? 0 : '')} 
                  onChange={(e) => update({ deaths: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  className="w-full bg-black border border-brand-gold rounded-full px-2 py-1 text-sm text-center font-black text-rose-500 outline-none focus:bg-white/5 transition-colors"
                  placeholder="0"
                />
                <input 
                  type="number" 
                  value={stats.assists || (stats.assists === 0 ? 0 : '')} 
                  onChange={(e) => update({ assists: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  className="w-full bg-black border border-brand-gold rounded-full px-2 py-1 text-sm text-center font-black text-gray-200 outline-none focus:bg-white/5 transition-colors"
                  placeholder="0"
                />
              </div>
            </div>
  
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">CS</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={stats.cs || (stats.cs === 0 ? 0 : '')} 
                  onChange={(e) => update({ cs: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  className="w-full bg-black border border-brand-gold rounded-full px-4 py-1 text-sm text-center font-black text-gray-200 outline-none focus:bg-white/5 transition-colors"
                  placeholder="0"
                />
              </div>
            </div>
  
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Gold</label>
              <input 
                type="number" 
                value={stats.gold || (stats.gold === 0 ? 0 : '')} 
                onChange={(e) => update({ gold: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                className="w-full bg-black border border-brand-gold rounded-full px-4 py-1 text-sm text-center font-black text-gray-200 outline-none focus:bg-white/5 transition-colors"
                placeholder="0"
              />
            </div>
  
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Damage</label>
              <input 
                type="number" 
                value={stats.damage || (stats.damage === 0 ? 0 : '')} 
                onChange={(e) => update({ damage: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                className="w-full bg-black border border-brand-gold rounded-full px-4 py-1 text-sm text-center font-black text-gray-200 outline-none focus:bg-white/5 transition-colors"
                placeholder="0"
              />
            </div>
  
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Vision</label>
              <input 
                type="number" 
                value={stats.visionScore || (stats.visionScore === 0 ? 0 : '')} 
                onChange={(e) => update({ visionScore: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                className="w-full bg-black border border-brand-gold rounded-full px-4 py-1 text-sm text-center font-black text-gray-200 outline-none focus:bg-white/5 transition-colors"
                placeholder="0"
              />
            </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowBuild(!showBuild)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${showBuild ? 'bg-brand-gold text-brand-green' : 'bg-white/5 text-gray-500 border border-white/5'}`}
            >
              <Plus className="w-3 h-3" /> Build Details
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Build & Items */}
      <AnimatePresence>
        {showBuild && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-brand-gold/5 overflow-hidden"
          >
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Summoner Spells
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Autocomplete 
                    type="summ"
                    value={stats.summoners[0] || ''}
                    onChange={(val: string) => {
                      const s = [...(stats.summoners || ['', ''])];
                      s[0] = val;
                      update({ summoners: s as [string, string] });
                    }}
                    champions={champions}
                    items={items}
                    summoners={summoners}
                    runes={runes}
                    loading={loadingData}
                  />
                  <Autocomplete 
                    type="summ"
                    value={stats.summoners[1] || ''}
                    onChange={(val: string) => {
                      const s = [...(stats.summoners || ['', ''])];
                      s[1] = val;
                      update({ summoners: s as [string, string] });
                    }}
                    champions={champions}
                    items={items}
                    summoners={summoners}
                    runes={runes}
                    loading={loadingData}
                  />
                </div>

                <div className="pt-4 space-y-4">
                  <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
                    <Target className="w-3 h-3" /> Runes
                  </p>
                  <Autocomplete 
                    type="rune" 
                    value={[stats.primaryRune, stats.secondaryRune].filter(Boolean)} 
                    onChange={(val: string[]) => update({ primaryRune: val[0] || '', secondaryRune: val[1] || '' })} 
                    champions={champions}
                    items={items}
                    summoners={summoners}
                    runes={runes}
                    multiSelect={true}
                    loading={loadingData}
                  />
                </div>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
                  <Plus className="w-3 h-3" /> Item Build
                </p>
                <Autocomplete 
                  type="item"
                  value={stats.items}
                  onChange={(val: string[]) => update({ items: val })}
                  champions={champions}
                  items={items}
                  summoners={summoners}
                  runes={runes}
                  multiSelect={true}
                  loading={loadingData}
                />
              </div>
            </div>
            <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
                  <ExternalLink className="w-3 h-3" /> Player Info
                </p>
                <div className="space-y-3">
                  <input
                    type="url"
                    placeholder="Tracker Link (e.g., op.gg/summoners/...)"
                    value={stats.trackerLink || ''}
                    onChange={(e) => update({ trackerLink: e.target.value })}
                    className="w-full bg-black border border-brand-gold rounded-full px-6 py-1 text-sm font-black text-brand-gold text-center focus:outline-none transition-all placeholder:text-brand-gold/30"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Peak"
                      value={stats.peakRank || ''}
                      onChange={(e) => update({ peakRank: e.target.value })}
                      className="w-full bg-black border border-brand-gold rounded-full px-4 py-1 text-sm font-black text-brand-gold text-center focus:outline-none transition-all placeholder:text-brand-gold/30"
                    />
                    <input
                      type="text"
                      placeholder="Current"
                      value={stats.currentRank || ''}
                      onChange={(e) => update({ currentRank: e.target.value })}
                      className="w-full bg-black border border-brand-gold rounded-full px-4 py-1 text-sm font-black text-brand-gold text-center focus:outline-none transition-all placeholder:text-brand-gold/30"
                    />
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest px-1">Playstyle</label>
                    <select 
                      value={stats.playstyle}
                      onChange={(e) => update({ playstyle: e.target.value as any })}
                      className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm font-black text-brand-gold focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">Select Playstyle...</option>
                      {[
                        'Aggressive',
                        'Passive',
                        'Roamer',
                        'Scaling',
                        'Frontline'
                      ].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoleIcon({ role }: { role: Role }) {
  const iconBase = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/";
  const icons: Record<Role, string> = {
    'Top': `${iconBase}icon-position-top.png`,
    'Jungle': `${iconBase}icon-position-jungle.png`,
    'Mid': `${iconBase}icon-position-middle.png`,
    'ADC': `${iconBase}icon-position-bottom.png`,
    'Support': `${iconBase}icon-position-utility.png`
  };

  return (
    <img 
      src={icons[role]} 
      alt={role} 
      className="w-5 h-5 object-contain brightness-200 contrast-125 saturate-0" 
      referrerPolicy="no-referrer"
    />
  );
}
