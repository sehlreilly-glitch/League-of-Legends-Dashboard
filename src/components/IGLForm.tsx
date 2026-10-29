import React, { useState, useEffect } from 'react';
import { Plus, X, Save, ChevronRight, ChevronLeft, Shield, Zap, Sword, Target, Eye, Trophy, Calendar, Users, Clock, AlertCircle, BookOpen, MessageSquare, Map as MapIcon, Activity } from 'lucide-react';
import { IGLReport, IGLGameReport, Season } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { SEASONS } from '../constants';
import { submitIGLReport, fetchRostersFromWebApp } from '../services/sheetService';
import { SCHOOLS, VARSITY_ROSTER } from '../data/schoolsAndRoster';
import { summarizeIGLNotes } from '../services/geminiService';

interface IGLFormProps {
  onSave: (report: IGLReport) => void;
  onCancel: () => void;
  currentUserEmail?: string;
  initialData?: IGLReport;
}

const ROLES = ['top', 'jungle', 'mid', 'adc', 'support'] as const;

export const IGLForm: React.FC<IGLFormProps> = ({ onSave, onCancel, currentUserEmail, initialData }) => {
  const [step, setStep] = useState(1);
  const [activeGame, setActiveGame] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rosters, setRosters] = useState<{school: string, roster: string[]}[]>([]);

  useEffect(() => {
    async function initData() {
      const data = await fetchRostersFromWebApp();
      setRosters(data);
    }
    initData();
  }, []);
  
  const createEmptyGame = (num: number): IGLGameReport => ({
    gameNumber: num,
    events: [],
    notes: {
      top: '',
      jungle: '',
      mid: '',
      adc: '',
      support: ''
    }
  });

  const [report, setReport] = useState<Partial<IGLReport>>(initialData ? { ...initialData } : {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    scouterName: '',
    team: '',
    opponent: '',
    week: '1',
    season: 'Spring' as Season,
    year: new Date().getFullYear().toString(),
    date: new Date().toISOString().split('T')[0],
    level: 'Varsity',
    matchScore: '2',
    opponentMatchScore: '0',
    matchResult: 'Win',
    games: [createEmptyGame(1), createEmptyGame(2)] // Default to BO3 (2 games required to win)
  });

  const updateReport = (updates: Partial<IGLReport>) => {
    setReport(prev => ({ ...prev, ...updates }));
  };

  const setGameNotes = (gameIndex: number, role: typeof ROLES[number], value: string) => {
    const newGames = [...(report.games || [])];
    newGames[gameIndex].notes[role] = value;
    updateReport({ games: newGames });
  };
  
  const addGameEvent = (gameIndex: number) => {
    const newGames = [...(report.games || [])];
    if (!newGames[gameIndex].events) newGames[gameIndex].events = [];
    newGames[gameIndex].events!.push({ timestamp: '', note: '' });
    updateReport({ games: newGames });
  };
  
  const updateGameEvent = (gameIndex: number, eventIndex: number, field: 'timestamp' | 'note', value: string) => {
    const newGames = [...(report.games || [])];
    newGames[gameIndex].events![eventIndex][field] = value;
    updateReport({ games: newGames });
  };

  const removeGameEvent = (gameIndex: number, eventIndex: number) => {
    const newGames = [...(report.games || [])];
    newGames[gameIndex].events!.splice(eventIndex, 1);
    updateReport({ games: newGames });
  };

  const handleSave = async () => {
    if (!report.scouterName || !report.team) {
      alert('Please fill in required fields (Name and Team)');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create a working copy
      const finalReport = { ...report, submittedBy: currentUserEmail } as IGLReport;
      
      // AI Refinement Hook for each game
      for (let i = 0; i < finalReport.games.length; i++) {
        const game = finalReport.games[i];
        
        // Only run AI if there's actually some content
        const totalLength = Object.values(game.notes).reduce((acc: number, val: any) => acc + (typeof val === 'string' ? val.length : 0), 0);
        
        if (totalLength > 10) {
           const aiSummary = await summarizeIGLNotes({
             top: game.notes.top,
             jungle: game.notes.jungle,
             mid: game.notes.mid,
             adc: game.notes.adc,
             support: game.notes.support
           });
           
           game.notes.summary = {
             raw: `Top: ${game.notes.top}\nJg: ${game.notes.jungle}\nMid: ${game.notes.mid}\nADC: ${game.notes.adc}\nSup: ${game.notes.support}`,
             aiRefined: finalReport.level === 'Non-AIA' ? `[TRAINING MODE] ${aiSummary}` : aiSummary
           };
        }
      }

      await submitIGLReport(finalReport);
      onSave(finalReport);
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Failed to submit IGL Report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-brand-green border border-brand-gold/20 rounded-3xl overflow-hidden shadow-2xl max-w-6xl mx-auto pb-8">
      {/* Header */}
      <div className="bg-brand-black/40 px-8 py-6 border-b border-brand-gold/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-gold rounded-2xl flex items-center justify-center shadow-lg shadow-brand-gold/20">
            <Shield className="w-6 h-6 text-brand-green" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-brand-white uppercase tracking-tighter leading-none">New IGL Report</h2>
            <p className="text-brand-gold/60 text-[10px] font-black uppercase tracking-widest mt-1">Tactical & Strategic Analysis</p>
          </div>
        </div>
        <button onClick={onCancel} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl transition-all text-white border border-white/10 uppercase font-black text-[10px] tracking-widest hover:bg-white/10">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-white/5 flex">
        {[1, 2].map(i => (
          <div 
            key={i} 
            className={`flex-1 transition-all duration-500 ${step >= i ? 'bg-brand-gold' : 'bg-transparent'}`} 
          />
        ))}
      </div>

      <div className="p-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-3 h-3" /> Captain/Scouter Name
                  </label>
                  <select 
                    value={report.scouterName || ''}
                    onChange={e => updateReport({ scouterName: e.target.value })}
                    className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm text-brand-gold font-black focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">Select Captain/Scouter...</option>
                    {VARSITY_ROSTER.map(r => (
                      <option key={r.name} value={r.name}>{r.name} ({r.gamertag})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Date
                  </label>
                  <input 
                    type="date" 
                    value={report.date}
                    onChange={e => updateReport({ date: e.target.value })}
                    className="w-full bg-black border border-brand-gold rounded-full px-6 py-1 text-sm text-brand-gold text-center font-black focus:outline-none transition-all cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Week
                  </label>
                  <select 
                    value={report.week || '1'}
                    onChange={e => updateReport({ week: e.target.value })}
                    className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm text-brand-gold font-black focus:outline-none transition-all cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(w => (
                      <option key={w} value={w.toString()}>Week {w}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
                    <Trophy className="w-3 h-3" /> Season
                  </label>
                  <select 
                    value={report.season || 'Spring'}
                    onChange={e => updateReport({ season: e.target.value as Season })}
                    className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm text-brand-gold font-black focus:outline-none transition-all cursor-pointer"
                  >
                    {SEASONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-3 h-3" /> Roster
                  </label>
                  <select 
                    value={report.level || 'Varsity'}
                    onChange={e => updateReport({ level: e.target.value })}
                    className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm text-brand-gold font-black focus:outline-none transition-all cursor-pointer"
                  >
                    {['Varsity', 'JV', 'Non-AIA'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Year
                  </label>
                  <select 
                    value={report.year || new Date().getFullYear().toString()}
                    onChange={e => updateReport({ year: e.target.value })}
                    className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm text-brand-gold font-black focus:outline-none transition-all cursor-pointer"
                  >
                    {['2023', '2024', '2025', '2026'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Team</label>
                  <select 
                    value={report.team || ''}
                    onChange={e => updateReport({ team: e.target.value })}
                    className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm text-brand-gold font-black focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">Select a Team...</option>
                    {rosters.length > 0 
                      ? rosters.map(r => <option key={r.school} value={r.school}>{r.school}</option>)
                      : SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)
                    }
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Opponent</label>
                  <select 
                    value={report.opponent || ''}
                    onChange={e => updateReport({ opponent: e.target.value })}
                    className="w-full bg-black border border-brand-gold rounded-xl px-4 py-2 text-sm text-brand-gold font-black focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">Select Opposing Team...</option>
                    {rosters.length > 0 
                      ? rosters.map(r => <option key={r.school} value={r.school}>{r.school}</option>)
                      : SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)
                    }
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-brand-gold/10 flex justify-between">
                <button 
                  onClick={onCancel}
                  className="px-6 py-4 bg-white/5 text-gray-400 font-black uppercase tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Cancel
                </button>
                <button 
                  onClick={() => setStep(2)}
                  className="bg-brand-gold hover:bg-brand-gold/80 text-brand-green font-black px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-gold/10 uppercase tracking-widest"
                >
                  Next: Tactical Notes <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Game Tabs */}
              <div className="flex flex-col mb-6 gap-6 w-full">
                <div className="flex bg-white/5 p-1 rounded-xl border border-brand-gold/20 self-start">
                  {report.games?.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveGame(idx)}
                      className={`px-8 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeGame === idx ? 'bg-brand-gold text-brand-green shadow-md shadow-brand-gold/20' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Game {idx + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (report.games && report.games.length < 5) {
                        const newGames = [...report.games, createEmptyGame(report.games.length + 1)];
                        updateReport({ games: newGames });
                        setActiveGame(newGames.length - 1);
                      }
                    }}
                    className="px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest text-brand-gold/50 hover:text-brand-gold hover:bg-brand-gold/10 transition-all flex items-center gap-1"
                  >
                     + Add
                  </button>
                </div>
                
                {report.games && report.games[activeGame] && (
                  <div className="space-y-4 w-full bg-white/5 p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                       <span className="text-sm font-black text-brand-gold uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4"/> VOD Timestamps & Events</span>
                       <button onClick={() => addGameEvent(activeGame)} className="px-3 py-1.5 bg-brand-gold text-brand-green rounded font-black text-[10px] uppercase tracking-widest hover:bg-brand-gold/80 transition-colors flex items-center gap-1 shadow-lg shadow-brand-gold/20"><Plus className="w-3 h-3"/> Add Event</button>
                    </div>
                    <div className="space-y-3">
                       {report.games[activeGame].events?.map((ev, evIdx) => (
                          <div key={evIdx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-black/40 p-4 rounded-2xl border border-white/5 mb-3">
                             <input type="text" placeholder="e.g. 12:45" value={ev.timestamp} onChange={e => updateGameEvent(activeGame, evIdx, 'timestamp', e.target.value)} className="w-[100px] shrink-0 bg-black border border-brand-gold rounded-full px-4 py-1 text-sm font-black text-brand-gold text-center focus:border-brand-gold outline-none" />
                             <input type="text" placeholder="Note about this moment..." value={ev.note} onChange={e => updateGameEvent(activeGame, evIdx, 'note', e.target.value)} className="flex-1 w-full bg-black border border-brand-gold rounded-full px-6 py-1 text-sm text-brand-gold text-center font-black focus:border-brand-gold outline-none placeholder:text-brand-gold/30" />
                             <button onClick={() => removeGameEvent(activeGame, evIdx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors bg-white/5"><X className="w-4 h-4"/></button>
                          </div>
                       ))}
                       {(!report.games[activeGame].events || report.games[activeGame].events?.length === 0) && (
                          <div className="text-center py-6 bg-black/20 rounded-xl border border-dashed border-white/10">
                             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">No Events Logged. Click "Add Event" to start mapping the VOD.</p>
                          </div>
                       )}
                    </div>
                  </div>
                )}
              </div>

              {report.games && report.games[activeGame] && (
                <div className="space-y-6">
                  {ROLES.map(role => {
                    const currentNote = report.games![activeGame].notes[role] || '';
                    const hasNote = currentNote.length > 0;
                    
                    return (
                      <div key={role} className="bg-white/5 border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-sm font-black tracking-widest flex items-center gap-2 uppercase">
                            <span className={hasNote ? "text-brand-green" : "text-brand-gold"}>
                              <MessageSquare className="w-4 h-4" />
                            </span>
                            <span className={hasNote ? "text-brand-green" : "text-brand-gold"}>
                              {role} Tactical Notes {hasNote && "✓"}
                            </span>
                          </label>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${hasNote ? "text-brand-green/80" : "text-white/20"}`}>
                            {currentNote.length} characters
                          </span>
                        </div>
                        <textarea 
                          value={currentNote}
                          onChange={e => setGameNotes(activeGame, role, e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-brand-white focus:border-brand-gold outline-none transition-all font-medium min-h-[100px] resize-y placeholder:text-white/20 text-sm"
                          placeholder={`Provide qualitative feedback for ${role} (e.g., "Good wave management", "Caught out during dragon")...`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-brand-gold/10">
                <button 
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-gray-500 hover:text-brand-gold font-black transition-all uppercase tracking-widest text-xs"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Logistics
                </button>
                <div className="flex items-center gap-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold max-w-[200px] text-right">
                    AI will automatically refine and summarize notes upon submission.
                  </p>
                  <button 
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black px-12 py-4 rounded-xl flex items-center gap-3 shadow-lg shadow-emerald-600/20 transition-all uppercase tracking-widest"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ANALYZING & SUBMITTING...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        SUBMIT REPORT
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
