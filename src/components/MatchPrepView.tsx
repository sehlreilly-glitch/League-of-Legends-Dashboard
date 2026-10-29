import React, { useState, useMemo, useEffect } from 'react';
import { 
  Shield, 
  Sword, 
  Target, 
  Zap, 
  Activity, 
  Video,
  UploadCloud,
  BookOpen,
  Users,
  Calendar,
  Filter,
  CheckCircle2,
  RefreshCw,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFilters } from '../context/FilterContext';
import { ScoutingReport, SchoolBranding } from '../types';
import { DraftSimulator } from './DraftSimulator';
import { SchoolBadge } from './SchoolBadge';
import { useBroadcast } from '../context/BroadcastContext';
import { Autocomplete } from './Autocomplete';
import { fetchChampions, fetchItems, DDragonChampion, DDragonItem } from '../services/ddragonService';
import { generateMatchPrepInsights } from '../services/geminiService';

export function MatchPrepView({ 
  reports: propsReports = [],
  brandings = {},
  reportId,
  onSaveReport
}: { 
  reports?: ScoutingReport[],
  brandings?: Record<string, SchoolBranding>,
  reportId?: string | null,
  onSaveReport?: (report: ScoutingReport) => void
}) {
  const { filters } = useFilters();
  const reports = useMemo(() => {
    if (reportId && propsReports) {
      return propsReports.filter(r => r.id === reportId || r.reportId === reportId);
    }
    return propsReports || [];
  }, [propsReports, reportId]);
  const [selectedTool, setSelectedTool] = useState<'matchups' | 'summaries' | 'counters' | 'strategy' | 'draft' | null>(null);
  const [champions, setChampions] = useState<DDragonChampion[]>([]);
  const [items, setItems] = useState<DDragonItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [aiInsights, setAiInsights] = useState<{ 
    winConditions: string[], 
    tacticalFocus: string,
    suggestedCounters?: { role: string; enemyChampion: string; suggestedCounter: string; reason: string; }[]
  } | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [winconsText, setWinconsText] = useState("");

  useEffect(() => {
    if (filters.level === 'Non-AIA') {
      setAiInsights(null);
      setWinconsText("");
    }
  }, [filters.level]);

  useEffect(() => {
    async function loadData() {
      try {
        const [champs, its] = await Promise.all([fetchChampions(), fetchItems()]);
        setChampions(champs);
        setItems(its);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

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

  const [editableStrategy, setEditableStrategy] = useState("");
  
  useEffect(() => {
    if (filters.school === 'All' || filters.week === 'All') {
       setEditableStrategy("");
       setWinconsText("");
    } else {
       // Search for target report
       const targetReport = reports.find(r => r.team === "Basha High School" && r.opponent === filters.school && r.week === filters.week) || 
                            reports.find(r => r.team === filters.school && r.week === filters.week);
       
       const existingNotes = targetReport?.iglNotes?.games?.[0]?.notes?.summary?.aiRefined || "No strategic notes found for this selection.";
       
       let parsedStrategy = existingNotes;
       let parsedWincons = "";
       
       if (existingNotes.includes("Win Conditions:") && existingNotes.includes("Tactical Game Plan:")) {
         const parts = existingNotes.split("Tactical Game Plan:");
         parsedWincons = parts[0].replace("Win Conditions:", "").trim();
         parsedStrategy = parts[1].trim();
       }
       
       setEditableStrategy(parsedStrategy);
       if (parsedWincons) setWinconsText(parsedWincons);
    }
  }, [reports, filters.school, filters.week]);

  const handleSaveStrategy = () => {
    if (filters.school === 'All' || filters.week === 'All') return;
    if (!onSaveReport) return;
    
    // Find existing report to update 
    const targetReport = reports.find(r => r.team === "Basha High School" && r.opponent === filters.school && r.week === filters.week) || 
                         reports.find(r => r.team === filters.school && r.week === filters.week);

    const mergedContent = `Win Conditions:\n${winconsText}\n\nTactical Game Plan:\n${editableStrategy}`;
    
    if (targetReport) {
      // Update existing
      const updatedReport = { ...targetReport };
      if (!updatedReport.iglNotes) {
        updatedReport.iglNotes = {
          id: `igl-updated-${Date.now()}`,
          timestamp: new Date().toISOString(),
          scouterName: "Coach",
          team: targetReport.team,
          opponent: targetReport.opponent,
          date: targetReport.date,
          level: targetReport.level,
          matchScore: targetReport.matchScore,
          opponentMatchScore: targetReport.opponentMatchScore,
          matchResult: targetReport.matchResult,
          week: targetReport.week,
          games: [{
             gameNumber: 1,
             notes: { top: '', jungle: '', mid: '', adc: '', support: '', summary: { raw: '', aiRefined: mergedContent } }
          }]
        };
      } else if (!updatedReport.iglNotes.games || updatedReport.iglNotes.games.length === 0) {
        updatedReport.iglNotes.games = [{
           gameNumber: 1,
           notes: { top: '', jungle: '', mid: '', adc: '', support: '', summary: { raw: '', aiRefined: mergedContent } }
        }];
      } else {
        if (!updatedReport.iglNotes.games[0].notes) {
          updatedReport.iglNotes.games[0].notes = { top: '', jungle: '', mid: '', adc: '', support: '', summary: { raw: '', aiRefined: mergedContent } };
        } else if (!updatedReport.iglNotes.games[0].notes.summary) {
          updatedReport.iglNotes.games[0].notes.summary = { raw: '', aiRefined: mergedContent };
        } else {
          updatedReport.iglNotes.games[0].notes.summary.aiRefined = mergedContent;
        }
      }
      onSaveReport(updatedReport);
    } else {
      // Create new dummy report just for strategy
      const newReport: ScoutingReport = {
        id: `strategy-${Date.now()}`,
        timestamp: new Date().toISOString(),
        scouterName: "Coach",
        team: "Basha High School",
        opponent: filters.school,
        week: filters.week,
        date: new Date().toISOString().split('T')[0],
        level: 'Varsity',
        matchResult: 'Win',
        matchScore: 'N/A',
        opponentMatchScore: 'N/A',
        games: [],
        iglNotes: {
          id: `igl-strategy-${Date.now()}`,
          timestamp: new Date().toISOString(),
          scouterName: "Coach",
          team: "Basha High School",
          opponent: filters.school,
          date: new Date().toISOString().split('T')[0],
          week: filters.week,
          level: 'Varsity',
          matchScore: 'N/A',
          opponentMatchScore: 'N/A',
          matchResult: 'Win',
          games: [{
            gameNumber: 1,
            notes: {
              top: '', jungle: '', mid: '', adc: '', support: '',
              summary: { raw: '', aiRefined: mergedContent }
            }
          }]
        }
      };
      onSaveReport(newReport);
    }
    alert("Strategy Saved successfully!");
  };

  const [localCounters, setLocalCounters] = useState<string[]>([]);
  const [counterText, setCounterText] = useState("");

  const handleAddCounter = () => {
    if (!counterText) return;
    setLocalCounters([...localCounters, counterText]);
    setCounterText("");
  };

  return (
    <div className="space-y-8 p-8 bg-brand-black min-h-screen text-white">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <SchoolBadge schoolName="Basha" brandings={brandings} hideName size="lg" />
            {filters.school !== 'All' && (
              <>
                <span className="text-brand-gold font-black italic opacity-40">VS</span>
                <SchoolBadge schoolName={filters.school} brandings={brandings} hideName size="lg" />
              </>
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-brand-gold leading-none">
              Match Preparation
              {filters.school !== 'All' && <span className="text-brand-white ml-3">vs {filters.school}</span>}
            </h2>
            <p className="text-gray-500 text-xs font-black tracking-[0.3em] uppercase">Strategic planning & analysis hub</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <button onClick={() => setSelectedTool('draft')} className={`p-5 rounded-xl border transition-all flex flex-col items-center gap-3 ${selectedTool === 'draft' ? 'bg-brand-gold border-brand-gold text-brand-green' : 'bg-white/5 border-white/10 hover:border-brand-gold/40'}`}>
          <Target className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Draft</span>
        </button>
        <button onClick={() => setSelectedTool('matchups')} className={`p-5 rounded-xl border transition-all flex flex-col items-center gap-3 ${selectedTool === 'matchups' ? 'bg-brand-gold border-brand-gold text-brand-green' : 'bg-white/5 border-white/10 hover:border-brand-gold/40'}`}>
          <Sword className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Matchups</span>
        </button>
        <button onClick={() => setSelectedTool('summaries')} className={`p-5 rounded-xl border transition-all flex flex-col items-center gap-3 ${selectedTool === 'summaries' ? 'bg-brand-gold border-brand-gold text-brand-green' : 'bg-white/5 border-white/10 hover:border-brand-gold/40'}`}>
          <BookOpen className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Summaries</span>
        </button>
        <button onClick={() => setSelectedTool('counters')} className={`p-5 rounded-xl border transition-all flex flex-col items-center gap-3 ${selectedTool === 'counters' ? 'bg-brand-gold border-brand-gold text-brand-green' : 'bg-white/5 border-white/10 hover:border-brand-gold/40'}`}>
          <Plus className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Counters</span>
        </button>
        <button onClick={() => setSelectedTool('strategy')} className={`p-5 rounded-xl border transition-all flex flex-col items-center gap-3 ${selectedTool === 'strategy' ? 'bg-brand-gold border-brand-gold text-brand-green' : 'bg-white/5 border-white/10 hover:border-brand-gold/40'}`}>
          <Zap className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Strategy</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {selectedTool === 'draft' && (
          <motion.div key="draft" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <DraftSimulator 
              allChampions={champions.map(c => c.name)}
              reports={reports}
              opponent={filters.school}
            />
          </motion.div>
        )}
        
        {selectedTool === 'matchups' && (
          <motion.div key="matchups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-xl font-black text-brand-gold uppercase italic tracking-widest">Player Matchups</h3>
            <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-gray-400 font-medium">Side-by-side lane comparative analysis. Filtering for {filters.school !== 'All' ? filters.school : 'all schools'}.</p>
            </div>
          </motion.div>
        )}
        
        {selectedTool === 'summaries' && (
          <motion.div key="summaries" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-xl font-black text-brand-gold uppercase italic tracking-widest">Scouting Summaries</h3>
            <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-gray-400 font-medium">Aggregated team report summaries for {filters.week !== 'All' ? `Week ${filters.week}` : 'all weeks'}.</p>
            </div>
          </motion.div>
        )}


        {selectedTool === 'counters' && (
          <motion.div key="counters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-brand-gold uppercase italic tracking-widest flex items-center gap-2">
                Counter-Picker Tool
                <button
                  onClick={async () => {
                    if (!filters.school || filters.school === 'All') return;
                    setIsGeneratingInsights(true);
                    const result = await generateMatchPrepInsights(reports, "Basha", filters.school);
                    if (result) {
                      setWinconsText(result.winConditions.map((w: string) => `▪ ${w}`).join("\n"));
                      if (result.tacticalFocus) setEditableStrategy(result.tacticalFocus);
                      setAiInsights(result);
                    }
                    setIsGeneratingInsights(false);
                  }}
                  disabled={isGeneratingInsights || filters.school === 'All' || filters.level === 'Non-AIA'}
                  className="ml-4 flex items-center gap-2 px-3 py-1.5 bg-brand-gold/10 text-brand-gold border border-brand-gold/30 rounded-lg text-xs hover:bg-brand-gold/20 disabled:opacity-50 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  {isGeneratingInsights ? 'Analyzing...' : 'AI Generate'}
                </button>
              </h3>
            </div>
            <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm space-y-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Autocomplete 
                    type="generic"
                    value={counterText}
                    onChange={(val) => setCounterText(val)}
                    champions={champions}
                    items={items}
                    loading={loadingData}
                    placeholder="Search champion or item..."
                    className="w-full bg-brand-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus-within:border-brand-gold outline-none flex items-center gap-2"
                  />
                </div>
                <button 
                  onClick={handleAddCounter}
                  disabled={!counterText}
                  className="px-6 bg-brand-gold/10 text-brand-gold border border-brand-gold/30 rounded-xl font-black uppercase text-xs hover:bg-brand-gold/20 transition-all disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {localCounters.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 bg-brand-gold/20 border border-brand-gold/30 rounded-lg text-brand-gold font-bold text-xs">
                    {c}
                    <button onClick={() => setLocalCounters(localCounters.filter((_, idx) => idx !== i))}>×</button>
                  </div>
                ))}
              </div>

              {aiInsights && aiInsights.suggestedCounters && aiInsights.suggestedCounters.length > 0 && (
                <div className="mt-8 pt-8 border-t border-white/10">
                  <h4 className="text-sm font-black text-brand-gold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> AI Suggested Counters
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {aiInsights.suggestedCounters.map((suggestion, i) => (
                      <div key={i} className="bg-black/40 border border-brand-gold/10 p-4 rounded-xl flex items-start gap-4 hover:border-brand-gold/30 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase text-gray-500 bg-white/5 px-2 py-0.5 rounded">{suggestion.role}</span>
                            <span className="text-xs text-red-400 font-bold">{suggestion.enemyChampion}</span>
                            <span className="text-gray-600">→</span>
                            <span className="text-xs text-green-400 font-bold">{suggestion.suggestedCounter}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-2">{suggestion.reason}</p>
                        </div>
                        <button 
                          onClick={() => {
                            setLocalCounters([...localCounters, `${suggestion.suggestedCounter} (vs ${suggestion.enemyChampion})`]);
                          }}
                          className="px-3 py-1.5 bg-brand-gold/10 text-brand-gold border border-brand-gold/30 rounded-lg text-[10px] uppercase font-black hover:bg-brand-gold/20 transition-colors shrink-0"
                        >
                          Add to Active
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
        {selectedTool === 'strategy' && (
          <motion.div key="strategy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-brand-gold uppercase italic tracking-widest">Team Strategy</h3>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                {filters.school !== 'All' ? filters.school : 'Select School'} • Week {filters.week !== 'All' ? filters.week : '?'}
              </div>
            </div>
            
            <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-black text-brand-gold uppercase tracking-widest flex items-center justify-between">
                  Win-Conditions
                  <button
                    onClick={async () => {
                      if (!filters.school || filters.school === 'All') return;
                      setIsGeneratingInsights(true);
                      const result = await generateMatchPrepInsights(reports, "Basha", filters.school);
                      if (result) {
                        setWinconsText(result.winConditions.map((w: string) => `▪ ${w}`).join("\n"));
                        if (result.tacticalFocus) setEditableStrategy(result.tacticalFocus);
                        setAiInsights(result);
                      }
                      setIsGeneratingInsights(false);
                    }}
                    disabled={isGeneratingInsights || filters.school === 'All' || filters.level === 'Non-AIA'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-gold/10 text-brand-gold border border-brand-gold/30 rounded-lg text-[10px] uppercase hover:bg-brand-gold/20 disabled:opacity-50 transition-colors"
                   >
                     <Zap className="w-3 h-3" />
                     {isGeneratingInsights ? 'Analyzing...' : 'AI Generate'}
                   </button>
                </h4>
                <textarea 
                  value={winconsText}
                  onChange={(e) => setWinconsText(e.target.value)}
                  className="w-full bg-brand-black/40 border border-white/10 rounded-xl p-4 text-sm focus:border-brand-gold outline-none min-h-[150px] leading-relaxed text-gray-300"
                  placeholder="Enter prioritized win conditions... (Or try AI Generate)"
                />
              </div>

              <div className="space-y-3 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-brand-gold uppercase tracking-widest">Tactical Game Plan</h4>
                  <button 
                    onClick={handleSaveStrategy}
                    disabled={filters.school === 'All' || filters.week === 'All'}
                    className="px-4 py-2 bg-brand-gold text-black font-black uppercase tracking-widest text-[10px] rounded-lg disabled:opacity-50"
                  >
                    Save Global Strategy
                  </button>
                </div>
                <div className="prose prose-invert max-w-none">
                  <textarea 
                    value={editableStrategy}
                    onChange={(e) => setEditableStrategy(e.target.value)} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 leading-relaxed whitespace-pre-wrap text-gray-300 min-h-[250px] outline-none focus:border-brand-gold"
                    placeholder="Game plan details... Note: Saving will overwrite global notes for this match."
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
